import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {environment} from '../../environments/environment';
import {IndexRun} from '../models/matcher.model';
import {MatcherApiService} from './matcher-api.service';

const base = `${environment.matcherOrigin}/v1`;

function run(state: IndexRun['state']): IndexRun {
  return {
    id: 7, kind: 'thesis_posting', state, source: 'postgres',
    embedded: state === 'succeeded' ? 12 : 0, skipped: 0, deleted: 0, truncated: 0, invalid_lines: 0,
    error: null, started_at: '2026-10-01T12:00:00Z', heartbeat_at: '2026-10-01T12:00:05Z',
    finished_at: state === 'running' ? null : '2026-10-01T12:01:00Z'
  };
}

describe('MatcherApiService', () => {
  let api: MatcherApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    api = TestBed.inject(MatcherApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('posts the query to /v1/match and /v1/recommend', () => {
    api.match({query: 'rag', top_k: 5}).subscribe();
    api.recommend({query: 'rag', top_k: 5}).subscribe();

    const match = http.expectOne(`${base}/match`);
    expect(match.request.method).toBe('POST');
    expect(match.request.body).toEqual({query: 'rag', top_k: 5});
    match.flush({matches: []});

    const recommend = http.expectOne(`${base}/recommend`);
    expect(recommend.request.method).toBe('POST');
    recommend.flush({answer: 'x'});
  });

  it('reads status, health and runs with GET', () => {
    api.health().subscribe();
    api.indexStatus().subscribe();
    api.runs(5).subscribe();
    api.run(3).subscribe();

    http.expectOne({method: 'GET', url: `${base}/health`}).flush({status: 'ok'});
    http.expectOne({method: 'GET', url: `${base}/index/status`}).flush({});
    http.expectOne({method: 'GET', url: `${base}/index/runs?limit=5`}).flush([]);
    http.expectOne({method: 'GET', url: `${base}/index/runs/3`}).flush(run('running'));
  });

  it('triggers a run with an empty POST', () => {
    api.triggerIndex('postings').subscribe();
    const req = http.expectOne(`${base}/index/postings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({run_id: 7, kind: 'thesis_posting'}, {status: 202, statusText: 'Accepted'});
  });

  it('polls a run until it leaves running, then completes', () => {
    vi.useFakeTimers();
    const seen: IndexRun['state'][] = [];
    let completed = false;
    api.pollRun(7, 1000).subscribe({next: r => seen.push(r.state), complete: () => (completed = true)});

    vi.advanceTimersByTime(0);
    http.expectOne(`${base}/index/runs/7`).flush(run('running'));
    vi.advanceTimersByTime(1000);
    http.expectOne(`${base}/index/runs/7`).flush(run('running'));
    vi.advanceTimersByTime(1000);
    http.expectOne(`${base}/index/runs/7`).flush(run('succeeded'));

    expect(seen).toEqual(['running', 'running', 'succeeded']);
    expect(completed).toBe(true);
    vi.advanceTimersByTime(5000);
    http.expectNone(`${base}/index/runs/7`);
  });
});
