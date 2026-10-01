import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TranslocoHttpLoader} from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the requested language from a bare-relative path, uncached', () => {
    let received: unknown;
    TestBed.inject(TranslocoHttpLoader).getTranslation('de').subscribe(t => received = t);

    const req = http.expectOne('assets/i18n/de.json');
    expect(req.request.headers.get('Cache-Control')).toContain('no-cache');
    req.flush({hello: 'Hallo'});

    expect(received).toEqual({hello: 'Hallo'});
  });
});
