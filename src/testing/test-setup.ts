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

// jsdom has no canvas backend and logs "Not implemented: HTMLCanvasElement.prototype.getContext" for every
// call. DotFieldComponent draws nothing without a context, which is what a spec wants anyway.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
