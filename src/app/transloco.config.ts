import {isDevMode} from '@angular/core';
import {TranslocoConfig} from '@jsverse/transloco';
import {TranslocoLocaleConfig} from '@jsverse/transloco-locale';
import {DEFAULT_LANGUAGE, TRANSLOCO_LANGUAGES} from './constants/application.constant';

export const translocoConfig: Partial<TranslocoConfig> = {
  failedRetries: 0,
  fallbackLang: DEFAULT_LANGUAGE,
  interpolation: ['{{', '}}'],
  missingHandler: {allowEmpty: false, logMissingKey: true, useFallbackTranslation: true},
  prodMode: !isDevMode(),
  reRenderOnLangChange: true,
  /*
   * `autoPrefixKeys`:
   * Keys are addressed exactly as written — a scoped key carries its own alias
   * (`some-scope.errors.required`) instead of being scope-relative and silently prefixed.
   * Transloco's default is the opposite, and it makes an absolute `shared.…` key unresolvable
   * wherever a scope happens to sit in the injector: `translateSignal` picks a scope up from there
   * on its own, so an ancestor providing one would change how unrelated components resolve.
   *
   * `keepCasing`:
   * By default, Transloco converts scope keys into camelCase, e.g., turning 'some-scope'
   * into 'someScope'. Since this project follows the kebab-case convention for translation
   * keys, we disable the case-changing feature by setting this to `true`.
   */
  scopes: {autoPrefixKeys: false, keepCasing: true},
  availableLangs: [...TRANSLOCO_LANGUAGES],
  defaultLang: DEFAULT_LANGUAGE
};

export const translocoLocaleConfig: TranslocoLocaleConfig = {
  defaultLocale: 'en-GB',
  langToLocaleMapping: {
    en: 'en-GB',
    de: 'de-CH',
  }
};
