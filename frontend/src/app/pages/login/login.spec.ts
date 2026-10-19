import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthUser } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { Login } from './login';

describe('Login', () => {
  const user: AuthUser = {
    id: 'owner-id',
    name: 'Owner Demo',
    email: 'owner@example.test',
    emailVerified: true,
    emailVerificationRequired: false,
    role: 'OWNER',
    barbershop: {
      id: 'shop-id',
      name: 'Studio Demo',
      slug: 'studio-demo',
      subscriptionStatus: 'TRIALING',
    },
  };
  const auth = { login: vi.fn(() => of(user)) };
  const route = { snapshot: { queryParamMap: convertToParamMap({}) } };
  const values = { email: user.email, password: '  Exact Password 2026!  ' };

  beforeEach(async () => {
    auth.login.mockReset().mockReturnValue(of(user));
    route.snapshot.queryParamMap = convertToParamMap({});
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('accepts a pasted email with surrounding spaces while preserving the exact password', () => {
    const component = TestBed.createComponent(Login).componentInstance;
    component.form.setValue({ ...values, email: '  owner@example.test  ' });

    component.submit();

    expect(auth.login).toHaveBeenCalledExactlyOnceWith(values);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows invalid email feedback without sending a login request', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({ ...values, email: 'not-an-email' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Introduza um e-mail válido.');
  });

  it('returns to the requested local page after successful authentication', () => {
    route.snapshot.queryParamMap = convertToParamMap({
      returnUrl: '/dashboard/bookings?date=2026-10-20',
    });
    const component = TestBed.createComponent(Login).componentInstance;
    component.form.setValue(values);

    component.submit();

    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledExactlyOnceWith(
      '/dashboard/bookings?date=2026-10-20',
    );
  });

  it('ignores a return URL pointing to another website', () => {
    route.snapshot.queryParamMap = convertToParamMap({
      returnUrl: 'https://other.example.test/',
    });
    const component = TestBed.createComponent(Login).componentInstance;
    component.form.setValue(values);

    component.submit();

    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });

  it('prevents duplicate pending requests and permits retry after a rejected login', () => {
    const pending = new Subject<AuthUser>();
    auth.login.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component.form.setValue(values);

    component.submit();
    component.submit();
    fixture.detectChanges();

    expect(auth.login).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    pending.error(
      new HttpErrorResponse({
        status: 401,
        error: { message: 'E-mail ou palavra-passe incorretos.' },
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'E-mail ou palavra-passe incorretos.',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);

    component.submit();
    expect(auth.login).toHaveBeenCalledTimes(2);
    expect(component.serverError()).toBeNull();
  });
});
