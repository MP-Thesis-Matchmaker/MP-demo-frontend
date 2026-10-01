import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, convertToParamMap, provideRouter, RouterStateSnapshot, UrlTree} from '@angular/router';
import {TranslocoService} from '@jsverse/transloco';
import {langGuard} from './lang.guard';
import {themisTranslocoTesting} from '../../testing/transloco-testing';

describe('langGuard', () => {
  const run = (lang: string | null) => TestBed.runInInjectionContext(() => langGuard(
    {paramMap: convertToParamMap(lang == null ? {} : {lang})} as ActivatedRouteSnapshot,
    {} as RouterStateSnapshot
  ));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [themisTranslocoTesting()],
      providers: [provideRouter([])]
    });
  });

  it('activates a known language and sets the document language', () => {
    expect(run('de')).toBe(true);
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('accepts the language case-insensitively', () => {
    expect(run('DE')).toBe(true);
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
  });

  it('redirects an unknown language to the default one', () => {
    const result = run('fr');
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/en');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });
});
