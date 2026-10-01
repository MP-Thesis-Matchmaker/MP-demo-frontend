import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {environment} from '../../../environments/environment';
import {MatchResponse} from '../../models/matcher.model';
import {provideFontawesome} from '../../services/fontawesome.service';
import {MotionService} from '../../services/motion.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../../../testing/transloco-testing';
import {MIN_SCAN_MS, SearchComponent} from './search.component';

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

  async function create(providers: unknown[] = []): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SearchComponent, themisTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFontawesome(),
        translocoLocaleTesting(),
        provideTranslocoMessageformat(),
        ...providers as never[]
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SearchComponent);
    el = fixture.nativeElement as HTMLElement;
  }

  /** Reduced motion: no scan hold and no flight, so a flushed answer is revealed straight away. */
  const STILL = {provide: MotionService, useValue: {reduced$$: signal(true), takeIntro: () => 'none'}};

  beforeEach(() => create());

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

  it('starts enlarged and narrows for good on the first query', async () => {
    await settle();
    const main = () => el.querySelector('main')!.classList;
    expect(main()).toContain('search--fresh');

    fixture.componentRef.setInput('q', 'x');
    await settle();
    expect(main()).not.toContain('search--fresh');
    http.expectOne(`${base}/match`);
    http.expectOne(`${base}/recommend`);

    fixture.componentRef.setInput('q', undefined);
    await settle();
    expect(main()).not.toContain('search--fresh');
  });

  it('starts compact on a deep link', async () => {
    fixture.componentRef.setInput('q', 'x');
    await settle();
    expect(el.querySelector('main')!.classList).not.toContain('search--fresh');
    http.expectOne(`${base}/match`);
    http.expectOne(`${base}/recommend`);
  });

  it('keeps the shortlist hidden while the dots scan and gather, then reveals it', async () => {
    fixture.componentRef.setInput('q', 'x');
    await settle();
    http.expectOne(`${base}/match`).flush(RESPONSE);
    http.expectOne(`${base}/recommend`);
    await settle();

    expect(el.querySelectorAll('themis-match-card')).toHaveLength(1);
    expect(el.querySelector('.search__matches--pending')).not.toBeNull();

    // MIN_SCAN_MS of flicker, then the flight (under a second) and the absorb.
    await new Promise(resolve => setTimeout(resolve, MIN_SCAN_MS + 1100));
    await settle();
    expect(el.querySelector('.search__matches--pending')).toBeNull();
  }, 10_000);

  it('reveals at once under reduced motion and sums the overlap into the hint', async () => {
    TestBed.resetTestingModule();
    await create([STILL]);
    fixture.componentRef.setInput('q', 'x');
    await settle();
    // No dots to watch, so the spinner is back as the loading indicator.
    expect(el.querySelector('.search__loading mat-spinner')).not.toBeNull();
    http.expectOne(`${base}/match`).flush({matches: [RESPONSE.matches[0], {...RESPONSE.matches[0], supervisor: 'B', posting_count: 2}]});
    http.expectOne(`${base}/recommend`);
    await settle();
    await settle();

    expect(el.querySelector('.search__matches--pending')).toBeNull();
    expect(el.querySelector('.search__overlap')!.textContent).toContain('4 indexed records overlap your query · 2 supervisors ranked');
  });
});
