import { DOCUMENT, computed, inject, Injectable, signal } from '@angular/core';
import { ENGLISH } from './translations';

export type Language = 'pt-PT' | 'en-GB';
const LANGUAGE_KEY = 'barberflow.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedLanguage = signal<Language>(this.readLanguage());
  private pageTitle = 'BarberFlow';

  readonly language = this.selectedLanguage.asReadonly();
  readonly locale = computed(() => this.language());

  constructor() {
    this.applyLanguage();
  }

  setLanguage(language: Language): void {
    this.selectedLanguage.set(language);
    this.applyLanguage();
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // The current language still works when browser storage is unavailable.
    }
  }

  translate(value: string | null | undefined): string {
    if (!value || this.language() === 'pt-PT') return value ?? '';
    const key = value.replace(/\s+/g, ' ').trim();
    const translation = Object.hasOwn(ENGLISH, key) ? ENGLISH[key] : undefined;
    if (!translation) return value;
    return (value.match(/^\s*/)?.[0] ?? '') + translation + (value.match(/\s*$/)?.[0] ?? '');
  }

  setPageTitle(title: string): void {
    this.pageTitle = title;
    this.document.title = this.translate(title);
  }

  private applyLanguage(): void {
    this.document.documentElement.lang = this.language();
    this.setPageTitle(this.pageTitle);
    this.document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        this.language() === 'pt-PT'
          ? 'Marcações online simples para barbeiros e pequenas barbearias.'
          : 'Simple online bookings for barbers and small barbershops.',
      );
  }

  private readLanguage(): Language {
    try {
      return this.document.defaultView?.localStorage.getItem(LANGUAGE_KEY) === 'en-GB'
        ? 'en-GB'
        : 'pt-PT';
    } catch {
      return 'pt-PT';
    }
  }
}
