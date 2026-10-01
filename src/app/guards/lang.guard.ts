import {DOCUMENT, inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateFn, GuardResult, Router} from '@angular/router';
import {TranslocoService} from '@jsverse/transloco';
import {DEFAULT_LANGUAGE} from '../constants/application.constant';

/**
 * Guards the `/:lang` segment every route sits under: an unknown or missing language redirects to the
 * default one, a known one becomes Transloco's active language and the document's `lang` attribute
 * (screen readers pick their voice from it).
 */
export const langGuard: CanActivateFn = (route: ActivatedRouteSnapshot): GuardResult => {

  const ts = inject(TranslocoService);
  const router = inject(Router);
  const doc = inject(DOCUMENT);

  const langParam: string | undefined = route.paramMap.get('lang')?.toLowerCase();
  const availableLangs = ts.getAvailableLangs() as string[];

  if (!langParam || !availableLangs.includes(langParam)) {
    ts.setActiveLang(DEFAULT_LANGUAGE);
    return router.parseUrl(DEFAULT_LANGUAGE);
  }

  ts.setActiveLang(langParam);
  doc.documentElement.lang = langParam;
  return true;

};
