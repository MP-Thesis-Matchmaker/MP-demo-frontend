import {DOCUMENT, inject, Injectable, Signal, signal} from '@angular/core';

/** How much of the landing intro to play: all of it, the short return-visit version, or none. */
export type IntroMode = 'full' | 'short' | 'none';

/**
 * The app's motion budget: whether the user asked the system for reduced motion, and whether the landing
 * intro has already played.
 *
 * The "played" flag is a plain field on purpose: a reload is a fresh visit and plays the full intro again,
 * which is what a demo wants; navigating back to home within the app gets the short version.
 */
@Injectable({providedIn: 'root'})
export class MotionService {

  private readonly query = inject(DOCUMENT).defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');

  private readonly _reduced$$ = signal(this.query?.matches ?? false);
  public readonly reduced$$: Signal<boolean> = this._reduced$$.asReadonly();

  private introPlayed = false;

  constructor() {
    this.query?.addEventListener?.('change', event => this._reduced$$.set(event.matches));
  }

  /** Call once per visit to the landing page: `full` the first time, `short` after, `none` if motion is reduced. */
  public takeIntro(): IntroMode {
    if (this._reduced$$()) {
      return 'none';
    }
    const mode: IntroMode = this.introPlayed ? 'short' : 'full';
    this.introPlayed = true;
    return mode;
  }
}
