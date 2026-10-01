import {EnvironmentProviders, inject, Injectable, provideAppInitializer} from '@angular/core';
import {FaConfig, FaIconLibrary} from '@fortawesome/angular-fontawesome';
import {
  faCircleHalfStroke as faSolidCircleHalfStroke,
  faLanguage as faSolidLanguage,
  faMagnifyingGlass as faSolidMagnifyingGlass,
  faMoon as faSolidMoon,
  faSun as faSolidSun
} from '@fortawesome/free-solid-svg-icons';
import {
  faCircleQuestion as faRegularCircleQuestion
} from '@fortawesome/free-regular-svg-icons';

/**
 * Every icon a template uses is registered here, once, and referenced by name (`<fa-icon icon="sun">`,
 * or `[icon]="['far', 'circle-question']"` for the regular set). Same pattern as hui-client, on the free
 * Font Awesome sets. An icon used in a template but missing here renders nothing and logs an error.
 */
@Injectable({providedIn: 'root'})
export class FontawesomeService {

  private faIconLibrary = inject(FaIconLibrary);
  private faConfig = inject(FaConfig);

  public init(): void {
    this.setConfig();
    this.registerSolidFaIcons();
    this.registerRegularFaIcons();
  }

  private setConfig(): void {
    this.faConfig.defaultPrefix = 'fas'; // FaSolid
    this.faConfig.fixedWidth = true;
  }

  private registerSolidFaIcons(): void {
    this.faIconLibrary.addIcons(
      faSolidCircleHalfStroke,
      faSolidLanguage,
      faSolidMagnifyingGlass,
      faSolidMoon,
      faSolidSun
    );
  }

  private registerRegularFaIcons(): void {
    this.faIconLibrary.addIcons(
      faRegularCircleQuestion
    );
  }
}

/**
 * Registers the FontAwesome icon library + default config.
 * Add to `app.config.ts` providers so icons are available before any component renders.
 */
export function provideFontawesome(): EnvironmentProviders {
  return provideAppInitializer(() => inject(FontawesomeService).init());
}
