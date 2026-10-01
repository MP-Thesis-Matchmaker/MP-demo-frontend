import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Translation, TranslocoLoader} from '@jsverse/transloco';

@Injectable({providedIn: 'root'})
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string) {
    // Never serve a stale bundle after a deploy: the JSON files are not content-hashed.
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Bare-relative on purpose — resolves against document.baseURI, so the app keeps working if it is
    // ever served under a non-root <base href>. Do NOT prefix with `/` or `../`.
    return this.http.get<Translation>(`assets/i18n/${lang}.json`, {headers});
  }
}
