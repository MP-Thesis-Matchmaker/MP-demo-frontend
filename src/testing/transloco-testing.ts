import {TranslocoTestingModule} from '@jsverse/transloco';
import {provideTranslocoLocale} from '@jsverse/transloco-locale';
import {translocoLocaleConfig} from '../app/transloco.config';
import en from '../assets/i18n/en.json';
import de from '../assets/i18n/de.json';

export const EN = en;
export const DE = de;

/**
 * The locale side of Transloco, on the app's own `langToLocaleMapping` (en → en-GB, de → de-CH).
 * Needed by anything that formats a number or a date, since `TranslocoTestingModule` provides the
 * translation service only.
 *
 * Goes in `TestBed.configureTestingModule({providers: [...]})`.
 */
export function translocoLocaleTesting() {
  return provideTranslocoLocale(translocoLocaleConfig);
}

/**
 * Transloco for specs: both real bundles, English active. A template asking for a key that is not in the
 * bundle renders the key itself rather than throwing, which is all a spec needs when it is exercising
 * behaviour rather than copy.
 *
 * Goes in `TestBed.configureTestingModule({imports: [...]})`.
 */
export function themisTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: {en, de},
    translocoConfig: {
      availableLangs: ['en', 'de'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
      scopes: {autoPrefixKeys: false, keepCasing: true}
    },
    preloadLangs: true
  });
}
