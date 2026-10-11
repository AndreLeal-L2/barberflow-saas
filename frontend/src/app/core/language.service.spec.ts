import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from '../pages/login/login';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';

describe('Site languages', () => {
  beforeEach(async () => {
    localStorage.removeItem('barberflow.language');
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: {} }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('barberflow.language');
    document.documentElement.lang = 'pt-PT';
  });

  it('defaults to Portugal Portuguese and restores a saved English preference', () => {
    localStorage.setItem('barberflow.language', 'en-GB');
    const language = TestBed.inject(LanguageService);
    expect(language.language()).toBe('en-GB');
    expect(document.documentElement.lang).toBe('en-GB');
    language.setLanguage('pt-PT');
    expect(language.translate('Entrar')).toBe('Entrar');
    expect(localStorage.getItem('barberflow.language')).toBe('pt-PT');
  });

  it('updates the page title and translates messages without changing unknown text', () => {
    const language = TestBed.inject(LanguageService);
    expect(language.language()).toBe('pt-PT');
    language.setPageTitle('Entrar | BarberFlow');
    language.setLanguage('en-GB');
    expect(document.title).toBe('Sign in | BarberFlow');
    expect(language.translate('E-mail ou palavra-passe incorretos.')).toBe(
      'Incorrect email or password.',
    );
    expect(language.translate('Barbearia do João')).toBe('Barbearia do João');
    expect(language.translate(' marcações em ')).toBe(' bookings on ');
    language.setLanguage('pt-PT');
    expect(document.title).toBe('Entrar | BarberFlow');
  });

  it('switches OnPush form labels without clearing entered values', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      email: 'client@example.test',
      password: 'typed-password',
    });
    const english = fixture.nativeElement.querySelector(
      'button[aria-label="English"]',
    ) as HTMLButtonElement;
    english.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Back to your agenda.');
    expect(fixture.nativeElement.textContent).toContain('Password');
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      email: 'client@example.test',
      password: 'typed-password',
    });
    const portuguese = fixture.nativeElement.querySelector(
      'button[aria-label="Português (Portugal)"]',
    ) as HTMLButtonElement;
    portuguese.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Voltar à agenda.');
  });

  it('keeps language switching usable when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const language = TestBed.inject(LanguageService);
    expect(language.language()).toBe('pt-PT');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => language.setLanguage('en-GB')).not.toThrow();
    expect(language.translate('Entrar')).toBe('Sign in');
    expect(document.documentElement.lang).toBe('en-GB');
  });
});
