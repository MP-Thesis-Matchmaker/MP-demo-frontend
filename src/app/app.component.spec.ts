import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {AppComponent} from './app.component';
import {provideFontawesome} from './services/fontawesome.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../testing/transloco-testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, themisTranslocoTesting()],
      providers: [provideRouter([]), provideFontawesome(), translocoLocaleTesting()]
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
});
