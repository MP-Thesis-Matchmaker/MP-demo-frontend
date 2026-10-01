import {Component, computed, input, signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {TranslocoDirective} from '@jsverse/transloco';
import {TranslocoDecimalPipe} from '@jsverse/transloco-locale';
import {Evidence, SourceType, SupervisorMatch} from '../../models/matcher.model';

export const SOURCE_ICONS: Record<SourceType, IconName> = {
  publication: 'book',
  thesis_posting: 'graduation-cap'
};

/** Evidence entries shown before the "show all" button. */
const EVIDENCE_PREVIEW = 3;

/**
 * One ranked supervisor: who, how close (cosine score, per source), and the records the match rests on.
 */
@Component({
  selector: 'themis-match-card',
  imports: [MatButtonModule, MatTooltipModule, FaIconComponent, TranslocoDirective, TranslocoDecimalPipe],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.scss'
})
export class MatchCardComponent {

  public readonly match = input.required<SupervisorMatch>();
  public readonly rank = input.required<number>();

  protected readonly sourceIcons = SOURCE_ICONS;
  protected readonly scoreFormat: Intl.NumberFormatOptions = {minimumFractionDigits: 2, maximumFractionDigits: 2};

  protected readonly showAll$$ = signal(false);

  /** Cosine similarity can be negative; the bar starts at zero. */
  protected readonly scorePercent$$ = computed(() => Math.max(0, Math.min(1, this.match().score)) * 100);

  protected readonly sources$$ = computed(() =>
    (Object.entries(this.match().source_scores) as [SourceType, number][])
      .map(([type, score]) => ({type, score}))
      .sort((a, b) => b.score - a.score)
  );

  protected readonly visibleEvidence$$ = computed<Evidence[]>(() =>
    this.showAll$$() ? this.match().evidence : this.match().evidence.slice(0, EVIDENCE_PREVIEW)
  );
  protected readonly hiddenCount$$ = computed(() => this.match().evidence.length - this.visibleEvidence$$().length);

  /** Scraped posting titles sometimes arrive wrapped in quotes. */
  protected displayTitle(title: string): string {
    return title.replace(/^["“](.*)["”]$/s, '$1');
  }
}
