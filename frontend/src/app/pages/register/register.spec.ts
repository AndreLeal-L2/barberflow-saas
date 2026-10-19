import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthUser } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { Register } from './register';

const user: AuthUser = {
  id: 'owner-id',
  name: 'João Silva',
  email: 'owner@example.test',
  emailVerified: false,
  emailVerificationRequired: false,
  role: 'OWNER',
  barbershop: {
    id: 'shop-id',
    name: 'Barbearia Central',
    slug: 'central',
    subscriptionStatus: 'TRIALING',
  },
};
const values = {
  ownerName: 'João Silva',
  barbershopName: 'Barbearia Central',
  email: 'owner@example.test',
  phone: '+351 910 000 001',
  password: '  SecurePass2026!  ',
  confirmPassword: '  SecurePass2026!  ',
};

describe('Register', () => {
  const auth = { register: vi.fn(() => of(user)) };
  beforeEach(async () => {
    auth.register.mockReset().mockReturnValue(of(user));
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('trims identity fields before validation and preserves the exact password', () => {
    const component = TestBed.createComponent(Register).componentInstance;
    component.form.setValue({
      ...values,
      ownerName: ' João Silva ',
      barbershopName: ' Barbearia Central ',
      email: ' owner@example.test ',
      phone: ' +351 910 000 001 ',
    });
    component.submit();
    const { confirmPassword: _, ...request } = values;
    expect(auth.register).toHaveBeenCalledExactlyOnceWith(request);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects names containing only spaces without creating an account', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance.form.setValue({ ...values, ownerName: '   ' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(auth.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Introduza o seu nome.');
  });

  it('shows server validation details beside the affected field and allows correction', () => {
    auth.register.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Existem campos inválidos no pedido.',
              details: { phone: 'Confirme o número de telefone.' },
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue(values);
    component.submit();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('input#phone')?.parentElement?.textContent,
    ).toContain('Confirme o número de telefone.');
    expect(component.submitting()).toBe(false);
    component.form.controls.phone.setValue('+351 910 000 002');
    component.submit();
    expect(auth.register).toHaveBeenCalledTimes(2);
    expect(component.serverError()).toBeNull();
  });

  it('keeps duplicate-email feedback and prevents duplicate pending requests', () => {
    const pending = new Subject<AuthUser>();
    auth.register.mockReturnValue(pending);
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue(values);
    component.submit();
    component.submit();
    expect(auth.register).toHaveBeenCalledOnce();
    pending.error(
      new HttpErrorResponse({
        status: 409,
        error: { message: 'Já existe uma conta com este e-mail.' },
      }),
    );
    fixture.detectChanges();
    expect(component.submitting()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Já existe uma conta com este e-mail.',
    );
  });
});
