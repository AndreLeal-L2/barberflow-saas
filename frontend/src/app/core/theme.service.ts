import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

export type Theme = 'DARK' | 'LIGHT';

const THEME_KEY = 'barberflow.theme';
const LEGACY_THEME_KEY = 'barberflow.bookings.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedTheme = signal<Theme>(this.readTheme());

  readonly theme = this.selectedTheme.asReadonly();

  constructor() {
    this.applyTheme();
  }

  setTheme(theme: Theme): void {
    this.selectedTheme.set(theme);
    this.applyTheme();
    try {
      this.document.defaultView?.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Changing the theme still works when browser storage is unavailable.
    }
  }

  private applyTheme(): void {
    const light = this.theme() === 'LIGHT';
    this.document.documentElement.dataset['theme'] = light ? 'light' : 'dark';
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', light ? '#ffffff' : '#161b24');
  }

  private readTheme(): Theme {
    try {
      const storage = this.document.defaultView?.localStorage;
      const saved = storage?.getItem(THEME_KEY) ?? storage?.getItem(LEGACY_THEME_KEY);
      return saved === 'DARK' ? 'DARK' : 'LIGHT';
    } catch {
      return 'LIGHT';
    }
  }
}
