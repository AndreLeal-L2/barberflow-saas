import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('Site theme preference', () => {
  beforeEach(() => {
    localStorage.removeItem('barberflow.theme');
    localStorage.removeItem('barberflow.bookings.theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('barberflow.theme');
    localStorage.removeItem('barberflow.bookings.theme');
    delete document.documentElement.dataset['theme'];
  });

  it('uses dark for the first visit without a saved preference', () => {
    expect(TestBed.inject(ThemeService).theme()).toBe('DARK');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it.each(['LIGHT', 'DARK'] as const)('restores a saved %s preference', (theme) => {
    localStorage.setItem('barberflow.theme', theme);
    expect(TestBed.inject(ThemeService).theme()).toBe(theme);
  });

  it('preserves the legacy light preference', () => {
    localStorage.setItem('barberflow.bookings.theme', 'LIGHT');
    expect(TestBed.inject(ThemeService).theme()).toBe('LIGHT');
  });

  it('uses dark when the saved preference is invalid', () => {
    localStorage.setItem('barberflow.theme', 'invalid');
    expect(TestBed.inject(ThemeService).theme()).toBe('DARK');
  });

  it('uses dark when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(TestBed.inject(ThemeService).theme()).toBe('DARK');
  });

  it('persists an explicit change to light', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('LIGHT');
    expect(service.theme()).toBe('LIGHT');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('barberflow.theme')).toBe('LIGHT');
  });
});
