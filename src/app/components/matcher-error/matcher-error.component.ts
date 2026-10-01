import {Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {TranslocoDirective} from '@jsverse/transloco';
import {TranslocoHelperService} from '../../services/transloco-helper.service';
import {MatcherError, MatcherErrorKind} from '../../utils/matcher-error.util';

const ICONS: Record<MatcherErrorKind, IconName> = {
  'unreachable': 'plug',
  'index-not-built': 'database',
  'index-run-in-progress': 'rotate',
  'database-unavailable': 'database',
  'validation': 'circle-exclamation',
  'not-found': 'circle-exclamation',
  'unknown': 'circle-exclamation'
};

/**
 * One failed matcher call, explained: what went wrong in the user's terms, what to do about it, and the
 * backend's raw message folded away for whoever is debugging the demo.
 */
@Component({
  selector: 'themis-matcher-error',
  imports: [RouterLink, MatButtonModule, FaIconComponent, TranslocoDirective],
  templateUrl: './matcher-error.component.html',
  styleUrl: './matcher-error.component.scss'
})
export class MatcherErrorComponent {

  public readonly error = input.required<MatcherError>();

  protected readonly lang$$ = inject(TranslocoHelperService).currentLang$$;
  protected readonly icon$$ = computed(() => ICONS[this.error().kind]);

  protected readonly serveCommand = 'MATCHER_CORS_ORIGINS=http://localhost:4200 uv run themis-matcher serve';
}
