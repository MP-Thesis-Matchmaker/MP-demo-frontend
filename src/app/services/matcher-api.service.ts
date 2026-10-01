import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable, switchMap, takeWhile, timer} from 'rxjs';
import {environment} from '../../environments/environment';
import {
  IndexRun,
  IndexRunAccepted,
  IndexStatus,
  IndexTrigger,
  MatchRequest,
  MatchResponse,
  RecommendResponse
} from '../models/matcher.model';

/**
 * Thin client for the matcher HTTP API. Every method is a cold Observable straight from `HttpClient`;
 * errors pass through untouched — turn them into something renderable with `toMatcherError`.
 */
@Injectable({providedIn: 'root'})
export class MatcherApiService {

  private readonly http = inject(HttpClient);

  /** Absolute, because the browser calls the matcher directly (CORS) rather than through a dev proxy. */
  public readonly origin = environment.matcherOrigin;
  private readonly baseUrl = `${this.origin}/v1`;

  /** Liveness only — does not touch the database. */
  public health(): Observable<{status: string}> {
    return this.http.get<{status: string}>(`${this.baseUrl}/health`);
  }

  public indexStatus(): Observable<IndexStatus> {
    return this.http.get<IndexStatus>(`${this.baseUrl}/index/status`);
  }

  public match(request: MatchRequest): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(`${this.baseUrl}/match`, request);
  }

  public recommend(request: MatchRequest): Observable<RecommendResponse> {
    return this.http.post<RecommendResponse>(`${this.baseUrl}/recommend`, request);
  }

  /** Starts a run in the background (202). Fails with `index_run_in_progress` while another run holds the slot. */
  public triggerIndex(trigger: IndexTrigger): Observable<IndexRunAccepted> {
    return this.http.post<IndexRunAccepted>(`${this.baseUrl}/index/${trigger}`, null);
  }

  /** Newest first. The backend clamps `limit` to 1..100. */
  public runs(limit = 20): Observable<IndexRun[]> {
    return this.http.get<IndexRun[]>(`${this.baseUrl}/index/runs`, {params: {limit}});
  }

  public run(id: number): Observable<IndexRun> {
    return this.http.get<IndexRun>(`${this.baseUrl}/index/runs/${id}`);
  }

  /**
   * Polls one run until it leaves `running`: emits every snapshot, the final one included, then completes.
   * A request error ends the stream with that error.
   */
  public pollRun(id: number, intervalMs = 2000): Observable<IndexRun> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.run(id)),
      takeWhile(run => run.state === 'running', true)
    );
  }
}
