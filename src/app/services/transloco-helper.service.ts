import {inject, Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {PRIMARY_OUTLET, Router} from '@angular/router';
import {TranslocoService} from '@jsverse/transloco';
import {TranslocoLocaleService} from '@jsverse/transloco-locale';
import {filter, map} from 'rxjs';
import {TranslocoLanguage} from '../constants/application.constant';

@Injectable({providedIn: 'root'})
export class TranslocoHelperService {

  private readonly ts = inject(TranslocoService);
  private readonly tsLocale = inject(TranslocoLocaleService);
  private readonly router = inject(Router);

  public readonly currentLang$$: Signal<TranslocoLanguage> = toSignal(
    this.ts.events$.pipe(
      filter(e => e.type === 'langChanged'),
      map(() => this.ts.getActiveLang() as TranslocoLanguage)
    ),
    {initialValue: this.ts.getActiveLang() as TranslocoLanguage}
  );

  public readonly currentLocale$$: Signal<string> = toSignal(
    this.ts.events$.pipe(
      filter(e => e.type === 'langChanged'),
      map(() => this.tsLocale.getLocale())
    ),
    {initialValue: this.tsLocale.getLocale()}
  );

  /**
   * Switches language by navigating: the language is the URL's first segment (see `langGuard`), so the
   * current page is kept and only that segment changes — `/en/home?x=1` becomes `/de/home?x=1`.
   */
  public switchLang(lang: TranslocoLanguage): Promise<boolean> {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children[PRIMARY_OUTLET]?.segments.map(s => s.path) ?? [];
    const [, ...rest] = segments;
    return this.router.navigate(['/', lang, ...rest], {queryParamsHandling: 'preserve'});
  }
}
