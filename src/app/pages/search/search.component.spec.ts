import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {environment} from '../../../environments/environment';
import {MatchResponse} from '../../models/matcher.model';
import {provideFontawesome} from '../../services/fontawesome.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../../../testing/transloco-testing';
import {SearchComponent} from './search.component';

const base = `${environment.matcherOrigin}/v1`;

const RESPONSE: MatchResponse = {
  matches: [{
    supervisor: 'A. Muller', department: null, score: 0.6, source_scores: {publication: 0.6},
    has_uzh_affiliation: true, matched_topics: [], publication_count: 1, posting_count: 0,
    evidence: [{source_type: 'publication', source_id: 'zora:1', title: 'Dense retrieval', url: null, year: 2025}]
  }]
};

const INDEX_NOT_BUILT = {code: 'index_not_built', message: 'No index has been built.', run_id: null};

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  /**
   * Runs effects and change detection (resource requests go out here), then yields one macrotask so a
   * flushed response reaches the resource. Not `whenStable()`: it waits for every pending request, and some
   * specs deliberately leave one open.
   */
  async function settle(): Promise<void> {
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve));
    TestBed.tick();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchComponent, themisTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFontawesome(),
        translocoLocaleTesting(),
        provideTranslocoMessageformat()
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SearchComponent);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('sends nothing and shows the idle state without a query', async () => {
    await settle();
    http.expectNone(`${base}/match`);
    http.expectNone(`${base}/recommend`);
    expect(el.querySelector('.empty-info-box')).not.toBeNull();
  });

  it('fires match and recommend together and renders each as it arrives', async () => {
    fixture.componentRef.setInput('q', '  dense retrieval ');
    fixture.componentRef.setInput('k', '3');
    await settle();

    const match = http.expectOne(`${base}/match`);
    const recommend = http.expectOne(`${base}/recommend`);
    expect(match.request.body).toEqual({query: 'dense retrieval', top_k: 3});
    expect(recommend.request.body).toEqual({query: 'dense retrieval', top_k: 3});

    match.flush(RESPONSE);
    await settle();
    expect(el.querySelectorAll('themis-match-card')).toHaveLength(1);
    expect(el.querySelector('themis-recommendation-panel mat-spinner')).not.toBeNull();

    recommend.flush({answer: 'Talk to A. Muller (https://www.zora.uzh.ch/1).'});
    await settle();
    const answer = el.querySelector('.recommendation__answer')!;
    expect(answer.textContent).toContain('Talk to A. Muller');
    expect(answer.querySelector('a')?.getAttribute('href')).toBe('https://www.zora.uzh.ch/1');
  });

  it('clamps an out-of-range k from the URL', async () => {
    fixture.componentRef.setInput('q', 'x');
    fixture.componentRef.setInput('k', '500');
    await settle();
    expect(http.expectOne(`${base}/match`).request.body.top_k).toBe(50);
    http.expectOne(`${base}/recommend`);
  });

  it('reports a shared failure once, with a way to the index', async () => {
    fixture.componentRef.setInput('q', 'x');
    await settle();
    http.expectOne(`${base}/match`).flush(INDEX_NOT_BUILT, {status: 409, statusText: 'Conflict'});
    http.expectOne(`${base}/recommend`).flush(INDEX_NOT_BUILT, {status: 409, statusText: 'Conflict'});
    await settle();

    const errors = el.querySelectorAll('themis-matcher-error');
    expect(errors).toHaveLength(1);
    expect(errors[0].querySelector('a[href$="/index"]')).not.toBeNull();
  });
});
