import {Component, computed, inject} from '@angular/core';
import {UpperCasePipe} from '@angular/common';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {TranslocoDirective} from '@jsverse/transloco';
import {catchError, map, of, switchMap, timer} from 'rxjs';
import {TRANSLOCO_LANGUAGES, TranslocoLanguage} from '../../constants/application.constant';
import {MatcherApiService} from '../../services/matcher-api.service';
import {ThemeMode, ThemeService} from '../../services/theme.service';
import {TranslocoHelperService} from '../../services/transloco-helper.service';

const THEME_ICONS: Record<ThemeMode, IconName> = {
  system: 'circle-half-stroke',
  light: 'sun',
  dark: 'moon'
};

const HEALTH_INTERVAL_MS = 30_000;

export type MatcherHealth = 'unknown' | 'online' | 'offline';

@Component({
  selector: 'themis-toolbar',
  imports: [
    UpperCasePipe,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatButtonToggleModule,
    MatTooltipModule,
    FaIconComponent,
    TranslocoDirective
  ],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {

  protected readonly theme = inject(ThemeService);
  private readonly translocoHelper = inject(TranslocoHelperService);
  private readonly api = inject(MatcherApiService);

  protected readonly langs = TRANSLOCO_LANGUAGES;
  protected readonly lang$$ = this.translocoHelper.currentLang$$;
  protected readonly themeIcon$$ = computed<IconName>(() => THEME_ICONS[this.theme.mode$$()]);

  protected readonly matcherOrigin = this.api.origin;
  /** `GET /v1/health` every 30 s: a glance at whether the demo has a backend at all. */
  protected readonly health$$ = toSignal(
    timer(0, HEALTH_INTERVAL_MS).pipe(
      switchMap(() => this.api.health().pipe(
        map((): MatcherHealth => 'online'),
        catchError(() => of<MatcherHealth>('offline'))
      ))
    ),
    {initialValue: 'unknown' as MatcherHealth}
  );

  protected switchLang(lang: TranslocoLanguage): void {
    void this.translocoHelper.switchLang(lang);
  }
}
