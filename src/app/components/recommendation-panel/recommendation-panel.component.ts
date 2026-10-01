import {Component, computed, effect, input, signal} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {TranslocoDirective} from '@jsverse/transloco';
import {MatcherError} from '../../utils/matcher-error.util';
import {linkify} from '../../utils/linkify.util';
import {MatcherErrorComponent} from '../matcher-error/matcher-error.component';

/**
 * The `/v1/recommend` answer. It is plain text — LLM prose, or the template synthesiser's list when no LLM
 * is configured — so it is rendered as text with its line breaks kept and its URLs turned into links, never
 * as HTML or markdown.
 */
@Component({
  selector: 'themis-recommendation-panel',
  imports: [MatProgressSpinnerModule, TranslocoDirective, MatcherErrorComponent],
  templateUrl: './recommendation-panel.component.html',
  styleUrl: './recommendation-panel.component.scss'
})
export class RecommendationPanelComponent {

  public readonly answer = input<string | undefined>();
  public readonly loading = input(false);
  public readonly error = input<MatcherError | undefined>();

  protected readonly segments$$ = computed(() => linkify(this.answer() ?? ''));

  /** Seconds since loading started: synthesis can take a while, and a counter shows it has not hung. */
  protected readonly elapsed$$ = signal(0);

  constructor() {
    effect(onCleanup => {
      if (!this.loading()) {
        return;
      }
      const start = Date.now();
      this.elapsed$$.set(0);
      const id = setInterval(() => this.elapsed$$.set(Math.floor((Date.now() - start) / 1000)), 1000);
      onCleanup(() => clearInterval(id));
    });
  }
}
