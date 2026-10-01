import {afterNextRender, Component, DestroyRef, DOCUMENT, inject, signal, viewChild} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';
import {DotFieldComponent} from '../../components/dot-field/dot-field.component';
import {IntroMode, MotionService} from '../../services/motion.service';
import {TranslocoHelperService} from '../../services/transloco-helper.service';

/** When the Arrive lines have faded out (they leave at 2.8s, over .6s). */
export const ARRIVE_END_MS = 3400;
/** When the last piece of the full intro has landed (status line at 5.6s, plus its .8s). */
export const INTRO_END_MS = 6400;

/**
 * The landing page: a full-height hero playing the intro video's Arrive and Title scenes over the drifting
 * record field, then the three steps below it.
 *
 * The first visit plays the full intro: the Arrive lines, then the wordmark letter by letter. Coming back
 * within the app plays the short version (no Arrive, everything in under a second), and reduced motion plays
 * none. The choreography is CSS (home.component.scss); this class only picks the mode and retires the
 * Arrive layer and the skip button once they are done.
 */
@Component({
  selector: 'themis-home',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FaIconComponent,
    TranslocoDirective,
    DotFieldComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly motion = inject(MotionService);
  private readonly field = viewChild.required(DotFieldComponent);

  protected readonly lang$$ = inject(TranslocoHelperService).currentLang$$;
  protected readonly steps = ['describe', 'retrieve', 'shortlist'] as const;
  protected readonly letters = 'THEMIS'.split('');
  protected readonly query = new FormControl('', {nonNullable: true});

  protected readonly mode$$ = signal<IntroMode>(this.motion.takeIntro());
  /** The Arrive lines, only during the first seconds of a full intro. */
  protected readonly arriving$$ = signal(this.mode$$() === 'full');
  /** Whether the full intro is still running, which is when "Skip intro" is offered. */
  protected readonly playing$$ = signal(this.mode$$() === 'full');

  constructor() {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (this.mode$$() === 'full') {
      timers.push(
        setTimeout(() => this.arriving$$.set(false), ARRIVE_END_MS),
        setTimeout(() => this.playing$$.set(false), INTRO_END_MS)
      );
    }
    inject(DestroyRef).onDestroy(() => timers.forEach(clearTimeout));
    afterNextRender(() => this.field().intro(this.mode$$()));
  }

  protected search(): void {
    const q = this.query.value.trim();
    void this.router.navigate(['/', this.lang$$(), 'search'], q ? {queryParams: {q}} : {});
  }

  /** Jumps to the settled hero: the remaining delays collapse to the short version's. */
  protected skip(): void {
    this.mode$$.set('short');
    this.arriving$$.set(false);
    this.playing$$.set(false);
  }

  protected showHow(): void {
    const heading = this.doc.getElementById('home-how');
    heading?.scrollIntoView({behavior: this.motion.reduced$$() ? 'auto' : 'smooth', block: 'start'});
    heading?.focus({preventScroll: true});
  }
}
