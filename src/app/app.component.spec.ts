import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {environment} from '../environments/environment';
import {AppComponent} from './app.component';
import {provideFontawesome} from './services/fontawesome.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../testing/transloco-testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, themisTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFontawesome(),
        translocoLocaleTesting()
      ]
    }).compileComponents();
  });

  it('renders the toolbar with the THEMIS wordmark', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.themis-toolbar__brand');
    expect(brand?.textContent?.trim()).toBe('THEMIS');
  });

  it('offers every configured language', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const toggles = (fixture.nativeElement as HTMLElement).querySelectorAll('mat-button-toggle');
    expect(Array.from(toggles).map(el => el.textContent?.trim())).toEqual(['EN', 'DE']);
  });

  it('shows the nav links', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('.themis-toolbar__link');
    expect(Array.from(links).map(a => a.getAttribute('aria-label'))).toEqual(['Search', 'Index']);
  });

  it('turns the health dot green or red with /v1/health', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AppComponent);
    const dot = () => (fixture.nativeElement as HTMLElement).querySelector('.themis-toolbar__health')!;
    TestBed.tick();
    expect(dot().classList).toContain('themis-toolbar__health--unknown');

    await new Promise(resolve => setTimeout(resolve));
    http.expectOne(`${environment.matcherOrigin}/v1/health`).flush({status: 'ok'});
    TestBed.tick();
    expect(dot().classList).toContain('themis-toolbar__health--online');
    fixture.destroy();
  });

  it('marks the matcher offline when /v1/health fails', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AppComponent);
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve));
    http.expectOne(`${environment.matcherOrigin}/v1/health`).error(new ProgressEvent('error'));
    TestBed.tick();
    expect((fixture.nativeElement as HTMLElement).querySelector('.themis-toolbar__health')!.classList)
      .toContain('themis-toolbar__health--offline');
    fixture.destroy();
  });
});
