import {HttpErrorResponse} from '@angular/common/http';
import {toMatcherError} from './matcher-error.util';

function httpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({status, error, url: 'http://localhost:8100/v1/match'});
}

describe('toMatcherError', () => {
  it('treats status 0 as unreachable', () => {
    expect(toMatcherError(httpError(0, new ProgressEvent('error'))).kind).toBe('unreachable');
  });

  it.each([
    ['index_not_built', 409, 'index-not-built'],
    ['database_unavailable', 503, 'database-unavailable'],
    ['no_such_run', 404, 'not-found'],
    ['model_mismatch', 409, 'unknown']
  ] as const)('maps code %s to %s', (code, status, kind) => {
    const error = toMatcherError(httpError(status, {code, message: 'm', run_id: null}));
    expect(error).toEqual({kind, status, message: 'm'});
  });

  it('keeps the holder run id on index_run_in_progress', () => {
    const error = toMatcherError(httpError(409, {code: 'index_run_in_progress', message: 'busy', run_id: 4}));
    expect(error).toEqual({kind: 'index-run-in-progress', status: 409, message: 'busy', runId: 4});
  });

  it('recognises FastAPI validation errors', () => {
    const error = toMatcherError(httpError(422, {detail: [{loc: ['body', 'query'], msg: 'too short'}]}));
    expect(error.kind).toBe('validation');
    expect(error.message).toContain('too short');
  });

  it('falls back to unknown for anything else', () => {
    expect(toMatcherError(httpError(500, 'Internal Server Error')).kind).toBe('unknown');
    expect(toMatcherError(new Error('boom'))).toEqual({kind: 'unknown', status: 0, message: 'Error: boom'});
  });
});
