import {HttpErrorResponse} from '@angular/common/http';
import {ApiError} from '../models/matcher.model';

export type MatcherErrorKind =
  | 'unreachable'
  | 'index-not-built'
  | 'index-run-in-progress'
  | 'database-unavailable'
  | 'validation'
  | 'not-found'
  | 'unknown';

/** What a component needs to render a failed matcher call — never an `HttpErrorResponse` itself. */
export interface MatcherError {
  kind: MatcherErrorKind;
  /** HTTP status; 0 when no response was readable. */
  status: number;
  /** The backend's own message when it sent one, else the transport's. For the "details" fold only. */
  message: string;
  /** The run holding the index slot, on `index-run-in-progress`. */
  runId?: number;
}

const KIND_BY_CODE: Record<string, MatcherErrorKind> = {
  index_not_built: 'index-not-built',
  index_run_in_progress: 'index-run-in-progress',
  database_unavailable: 'database-unavailable',
  no_such_run: 'not-found'
};

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null
    && typeof (body as ApiError).code === 'string'
    && typeof (body as ApiError).message === 'string';
}

/**
 * Maps whatever a matcher call failed with onto a `MatcherError`.
 *
 * Status 0 covers more than "server down": the matcher's CORS headers are added by a middleware that sits
 * inside Starlette's error handler, so an unhandled 500 reaches the browser without them and is reported as
 * a network failure too. The UI copy for `unreachable` says so.
 */
export function toMatcherError(error: unknown): MatcherError {
  // A resource hands back non-Error failures wrapped, with the original as `cause`.
  if (error instanceof Error && error.cause instanceof HttpErrorResponse) {
    error = error.cause;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return {kind: 'unknown', status: 0, message: String(error)};
  }
  if (error.status === 0) {
    return {kind: 'unreachable', status: 0, message: error.message};
  }
  if (isApiError(error.error)) {
    const {code, message, run_id} = error.error;
    return {
      kind: KIND_BY_CODE[code] ?? 'unknown',
      status: error.status,
      message,
      ...(run_id != null ? {runId: run_id} : {})
    };
  }
  if (error.status === 422) {
    return {kind: 'validation', status: 422, message: JSON.stringify(error.error?.detail ?? error.error)};
  }
  return {kind: 'unknown', status: error.status, message: error.message};
}
