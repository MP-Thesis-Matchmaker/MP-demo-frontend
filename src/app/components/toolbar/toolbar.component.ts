import {Component, computed, inject} from '@angular/core';
import {UpperCasePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {TranslocoDirective} from '@jsverse/transloco';
import {TRANSLOCO_LANGUAGES, TranslocoLanguage} from '../../constants/application.constant';
import {ThemeMode, ThemeService} from '../../services/theme.service';
import {TranslocoHelperService} from '../../services/transloco-helper.service';

const THEME_ICONS: Record<ThemeMode, IconName> = {
  system: 'circle-half-stroke',
  light: 'sun',
  dark: 'moon'
};

@Component({
  selector: 'themis-toolbar',
  imports: [
    UpperCasePipe,
    RouterLink,
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

  protected readonly langs = TRANSLOCO_LANGUAGES;
  protected readonly lang$$ = this.translocoHelper.currentLang$$;
  protected readonly themeIcon$$ = computed<IconName>(() => THEME_ICONS[this.theme.mode$$()]);

  protected switchLang(lang: TranslocoLanguage): void {
    void this.translocoHelper.switchLang(lang);
  }
}
