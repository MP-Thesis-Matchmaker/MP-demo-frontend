// jsdom implements no `window.matchMedia`. Angular CDK's BreakpointObserver, Material's layout code and
// ThemeService (prefers-color-scheme) call it, so any spec that touches them dies with
// "matchMedia is not a function" without this. The stub reports a light-mode desktop.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
    addListener: () => undefined,
    removeListener: () => undefined
  })) as typeof window.matchMedia;
}
