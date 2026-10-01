import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {provideRouter} from '@angular/router';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {of} from 'rxjs';
import {environment} from '../../../environments/environment';
import {IndexRun, IndexStatus} from '../../models/matcher.model';
import {provideFontawesome} from '../../services/fontawesome.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../../../testing/transloco-testing';
import {formatDuration, IndexComponent} from './index.component';

const base = `${environment.matcherOrigin}/v1`;

const STATUS: IndexStatus = {
  embedding_model: 'BAAI/bge-m3', embedding_dim: 1024, document_count: 215451,
  sources: 'postgres', max_seq_length: 1024, truncated_docs: 0
};

function run(id: number, state: IndexRun['state']): IndexRun {
  return {
    id, kind: 'publication', state, source: 'postgres',
    embedded: state === 'succeeded' ? 3 : 0, skipped: state === 'succeeded' ? 10 : 0, deleted: 0, truncated: 0,
    invalid_lines: 0, error: null, started_at: '2026-10-01T12:00:00Z', heartbeat_at: '2026-10-01T12:00:00Z',
    finished_at: state === 'running' ? null : '2026-10-01T12:00:30Z'
  };
}

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(12_000)).toBe('12 s');
    expect(formatDuration(185_000)).toBe('3 min 05 s');
    expect(formatDuration(3_720_000)).toBe('1 h 02 min');
  });
});

describe('IndexComponent', () => {
  let fixture: ComponentFixture<IndexComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;
  const dialog = {open: vi.fn(() => ({afterClosed: () => of(true)}))};

  async function settle(ms = 0): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ms);
    TestBed.tick();
  }

  function flushInitial(runs: IndexRun[] = []): void {
    http.expectOne(`${base}/index/status`).flush(STATUS);
    http.expectOne(`${base}/index/runs?limit=20`).flush(runs);
  }

  function triggers(): HTMLButtonElement[] {
    return Array.from(el.querySelectorAll<HTMLButtonElement>('.index__trigger'));
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    dialog.open.mockClear();
    await TestBed.configureTestingModule({
      imports: [IndexComponent, themisTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFontawesome(),
        translocoLocaleTesting(),
        provideTranslocoMessageformat(),
        {provide: MatDialog, useValue: dialog}
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IndexComponent);
    el = fixture.nativeElement as HTMLElement;
    await settle();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('shows the index status and an empty history', async () => {
    flushInitial();
    await settle();
    expect(el.querySelector('.index__documents')?.textContent).toContain('215,451');
    expect(el.textContent).toContain('BAAI/bge-m3');
    expect(el.textContent).toContain('No runs recorded yet');
  });

  it('treats a missing index as an empty state, not an error', async () => {
    http.expectOne(`${base}/index/status`).flush(
      {code: 'index_not_built', message: 'none', run_id: null}, {status: 409, statusText: 'Conflict'});
    http.expectOne(`${base}/index/runs?limit=20`).flush([]);
    await settle();
    expect(el.querySelector('.empty-info-box')?.textContent).toContain('No index yet');
    expect(el.querySelector('themis-matcher-error')).toBeNull();
  });

  it('confirms, starts a run, polls it to the end and reloads', async () => {
    flushInitial();
    await settle();

    triggers()[0].click();
    expect(dialog.open).toHaveBeenCalledOnce();
    http.expectOne({method: 'POST', url: `${base}/index/publications`})
      .flush({run_id: 9, kind: 'publication'}, {status: 202, statusText: 'Accepted'});
    await settle();

    http.expectOne(`${base}/index/runs/9`).flush(run(9, 'running'));
    await settle();
    expect(triggers().every(b => b.disabled)).toBe(true);
    expect(el.querySelector('.index__watched')?.textContent).toContain('Run #9 running');

    await settle(2000);
    http.expectOne(`${base}/index/runs/9`).flush(run(9, 'succeeded'));
    await settle();
    flushInitial([run(9, 'succeeded')]);
    await settle();

    expect(el.querySelector('.index__watched')?.textContent).toContain('Run #9 finished');
    expect(el.querySelector('.index__watched')?.textContent).toContain('3 documents embedded, 10 unchanged');
    expect(triggers().some(b => b.disabled)).toBe(false);
  });

  it('follows the run that blocks a trigger', async () => {
    flushInitial();
    await settle();

    triggers()[1].click();
    http.expectOne(`${base}/index/postings`).flush(
      {code: 'index_run_in_progress', message: 'busy', run_id: 4}, {status: 409, statusText: 'Conflict'});
    await settle();

    expect(el.querySelector('themis-matcher-error')?.textContent).toContain('Run #4 is still indexing');
    http.expectOne(`${base}/index/runs/4`).flush(run(4, 'running'));
    await settle();
    expect(triggers().every(b => b.disabled)).toBe(true);
  });

  it('picks up a run already in progress on load', async () => {
    flushInitial([run(5, 'running')]);
    // The effect starts watching while the fake clock is mid-tick, and a 0 ms timer created mid-tick is
    // scheduled 1 ms out — so advance 1 ms for the poll's first request.
    await settle(1);
    http.expectOne(`${base}/index/runs/5`).flush(run(5, 'running'));
    await settle();
    expect(triggers().every(b => b.disabled)).toBe(true);
  });
});
