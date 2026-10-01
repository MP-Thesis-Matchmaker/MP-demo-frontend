import {
  computed,
  DOCUMENT,
  effect,
  EnvironmentProviders,
  inject,
  Injectable,
  provideAppInitializer,
  signal,
  Signal
} from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];
const STORAGE_KEY = 'themis.theme-mode';

/**
 * Light / dark / follow-the-system. One switch drives both style libraries:
 *   - Material's tokens are `light-dark()` values (see styles/README.md), so setting the CSS
 *     `color-scheme` on <html> is all it takes — removing it falls back to the stylesheet's
 *     `light dark`, i.e. the operating system's choice;
 *   - Bootstrap 5.3 switches on `data-bs-theme`, which needs a concrete `light` or `dark`, so in
 *     system mode it gets the resolved value and follows `prefers-color-scheme` changes live.
 */
@Injectable({providedIn: 'root'})
export class ThemeService {

  private readonly doc = inject(DOCUMENT);
  private readonly darkQuery = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  private readonly _mode$$ = signal<ThemeMode>(this.readStoredMode());
  public readonly mode$$: Signal<ThemeMode> = this._mode$$.asReadonly();

  private readonly _systemPrefersDark$$ = signal<boolean>(this.darkQuery?.matches ?? false);

  public readonly resolved$$: Signal<ResolvedTheme> = computed(() => {
    const mode = this._mode$$();
    if (mode !== 'system') return mode;
    return this._systemPrefersDark$$() ? 'dark' : 'light';
  });

  constructor() {
    this.darkQuery?.addEventListener('change', (event) => this._systemPrefersDark$$.set(event.matches));
    effect(() => this.apply(this._mode$$(), this.resolved$$()));
  }

  public setMode(mode: ThemeMode): void {
    this._mode$$.set(mode);
    this.storeMode(mode);
  }

  /** system → light → dark → system, for a single toolbar button. */
  public cycle(): void {
    const next = THEME_MODES[(THEME_MODES.indexOf(this._mode$$()) + 1) % THEME_MODES.length];
    this.setMode(next);
  }

  private apply(mode: ThemeMode, resolved: ResolvedTheme): void {
    const root = this.doc.documentElement;
    root.style.colorScheme = mode === 'system' ? '' : mode;
    root.setAttribute('data-bs-theme', resolved);
  }

  // Storage can be unavailable (private windows, blocked site data). The mode is a convenience, so a
  // failure falls back to the system mode instead of breaking the app.
  private readStoredMode(): ThemeMode {
    try {
      const stored = this.doc.defaultView?.localStorage.getItem(STORAGE_KEY);
      return THEME_MODES.includes(stored as ThemeMode) ? stored as ThemeMode : 'system';
    } catch {
      return 'system';
    }
  }

  private storeMode(mode: ThemeMode): void {
    try {
      this.doc.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not persisted; the choice still holds for this page load.
    }
  }
}

/**
 * Applies the stored mode before the first render, so a dark-mode user never sees a light flash.
 * Add to `app.config.ts` providers.
 */
export function provideTheme(): EnvironmentProviders {
  return provideAppInitializer(() => {
    inject(ThemeService);
  });
}
