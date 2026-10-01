/**
 * Local development (`ng serve`, `pnpm build:local`). Replaced by `environment.prod.ts` in the `prod`
 * build configuration through `fileReplacements` in angular.json.
 *
 * `matcherOrigin` is where `themis-matcher serve` listens. The browser calls it directly, so the
 * matcher must allow this app's origin: start it with `MATCHER_CORS_ORIGINS=http://localhost:4200`.
 */
export const environment = {
  production: false,
  matcherOrigin: 'http://localhost:8100'
};
