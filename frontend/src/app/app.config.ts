import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en-GB';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { credentialsInterceptor } from './core/credentials.interceptor';
import { routes } from './app.routes';
import { LocalizedTitleStrategy } from './core/localized-title.strategy';

registerLocaleData(localePt);
registerLocaleData(localeEn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([credentialsInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
    { provide: LOCALE_ID, useValue: 'pt-PT' },
  ],
};
