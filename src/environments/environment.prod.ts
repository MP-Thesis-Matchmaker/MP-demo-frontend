/**
 * Production build (`pnpm build`). There is no deployment target for the demo yet; set
 * `matcherOrigin` to the matcher's public origin once there is one, and add this app's origin to
 * that matcher's `MATCHER_CORS_ORIGINS`.
 */
export const environment = {
  production: true,
  matcherOrigin: 'http://localhost:8100' // TODO: real origin once the demo is deployed
};
