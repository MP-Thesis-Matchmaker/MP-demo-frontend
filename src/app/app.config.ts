import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideHttpClient, withFetch} from '@angular/common/http';
import {provideRouter, withComponentInputBinding, withRouterConfig, withViewTransitions} from '@angular/router';
import {provideTransloco} from '@jsverse/transloco';
import {provideTranslocoLocale} from '@jsverse/transloco-locale';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {routes} from './app.routes';
import {provideFontawesome} from './services/fontawesome.service';
import {provideTheme} from './services/theme.service';
import {translocoConfig, translocoLocaleConfig} from './transloco.config';
import {TranslocoHttpLoader} from './transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({paramsInheritanceStrategy: 'always'}),
      withViewTransitions({skipInitialTransition: true})
    ),
    provideTransloco({config: translocoConfig, loader: TranslocoHttpLoader}),
    provideTranslocoLocale(translocoLocaleConfig),
    provideTranslocoMessageformat(),
    provideFontawesome(),
    provideTheme()
  ]
};
