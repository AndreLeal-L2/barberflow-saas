import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthUser } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { BookingApiService } from '../../core/booking-api.service';
import { DashboardBarbershop } from '../../core/booking.models';
import { LanguageService } from '../../core/language.service';
import { Profile } from './profile';

describe('Profile publication', () => {
  const shop: DashboardBarbershop = {
    id: 'barbershop-id',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    phone: '+351 910 000 001',
    email: 'owner@example.test',
    publicDescription: null,
    publicAddress: null,
    published: false,
    subscriptionStatus: 'TRIALING',
    serviceCount: 1,
    availabilityDayCount: 1,
    completedSetupSteps: 3,
    canPublish: true,
  };
  const owner: AuthUser = {
    id: 'owner-id',
    name: 'João Silva',
    email: shop.email,
    emailVerified: true,
    emailVerificationRequired: true,
    role: 'OWNER',
    barbershop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      subscriptionStatus: 'TRIALING',
    },
  };
  const auth = {
    user: signal<AuthUser | null>(owner),
    resendVerification: vi.fn(() => of({ message: 'E-mail enviado.' })),
  };
  const api = {
    getBarbershop: vi.fn(() => of(shop)),
    updateProfile: vi.fn(() => of(shop)),
    updatePublication: vi.fn((published: boolean) => of({ ...shop, published })),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    auth.user.set(owner);
    auth.resendVerification.mockReturnValue(of({ message: 'E-mail enviado.' }));
    api.getBarbershop.mockReturnValue(of(shop));
    api.updateProfile.mockReturnValue(of(shop));
    api.updatePublication.mockImplementation((published) => of({ ...shop, published }));

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: BookingApiService, useValue: api },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('publishes from the profile without requiring optional description or address', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '.profile-publication-action',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();

    expect(api.updatePublication).toHaveBeenCalledExactlyOnceWith(true);
    expect(fixture.componentInstance.shop()?.published).toBe(true);
    expect(button.textContent).toContain('Pausar marcações');
    expect(fixture.nativeElement.querySelector('.page-heading a')?.getAttribute('href')).toContain(
      '/b/barbearia-central',
    );
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('allows pausing an already published page even when publication prerequisites are missing', () => {
    api.getBarbershop.mockReturnValueOnce(
      of({ ...shop, published: true, serviceCount: 0, canPublish: false }),
    );
    auth.user.set({ ...owner, emailVerified: false });
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.profile-publication-action',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();

    expect(api.updatePublication).toHaveBeenCalledExactlyOnceWith(false);
    expect(fixture.componentInstance.shop()?.published).toBe(false);
  });

  it('preserves unsaved profile edits and prevents overlapping publication or profile saves', () => {
    const pending = new Subject<DashboardBarbershop>();
    api.updatePublication.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const edits = {
      publicDescription: 'Nova descrição por guardar.',
      publicAddress: 'Rua Nova, 10',
    };
    component.form.setValue(edits);
    component.form.markAsDirty();

    component.togglePublication();
    component.togglePublication();
    component.save();

    expect(component.savingPublication()).toBe(true);
    expect(api.updatePublication).toHaveBeenCalledExactlyOnceWith(true);
    expect(api.updateProfile).not.toHaveBeenCalled();

    pending.next({ ...shop, published: true });
    pending.complete();
    expect(component.savingPublication()).toBe(false);
    expect(component.form.getRawValue()).toEqual(edits);
    expect(component.form.dirty).toBe(true);
  });

  it('shows the server publication conflict and restores the action after failure', () => {
    const message = 'Confirme o e-mail de administrador antes de publicar a página.';
    api.updatePublication.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'EMAIL_VERIFICATION_REQUIRED', message },
          }),
      ),
    );
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    fixture.componentInstance.togglePublication();
    fixture.detectChanges();

    expect(fixture.componentInstance.shop()?.published).toBe(false);
    expect(fixture.componentInstance.savingPublication()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.profile-publication [role="alert"]')?.textContent,
    ).toContain(message);
    expect(fixture.nativeElement.querySelector('.profile-publication-action').disabled).toBe(false);
  });

  it('links to missing services and hours and does not attempt publication before readiness', () => {
    api.getBarbershop.mockReturnValueOnce(
      of({ ...shop, serviceCount: 0, availabilityDayCount: 0, canPublish: false }),
    );
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-publication-action').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('a[href="/dashboard/services"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/dashboard/availability"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('.profile-publication-checklist li.complete'),
    ).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('A descrição e a morada são opcionais.');
    fixture.componentInstance.togglePublication();
    expect(api.updatePublication).not.toHaveBeenCalled();
  });

  it('requires email verification only when configured and exposes resend while it is pending', () => {
    auth.user.set({ ...owner, emailVerified: false });
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-publication-action').disabled).toBe(true);
    const resend = fixture.nativeElement.querySelector(
      '.profile-publication-checklist button',
    ) as HTMLButtonElement;
    expect(resend.textContent).toContain('Reenviar e-mail');
    resend.click();
    fixture.detectChanges();
    expect(auth.resendVerification).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('E-mail enviado.');

    auth.user.set({ ...owner, emailVerified: false, emailVerificationRequired: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-publication-action').disabled).toBe(false);
    expect(
      fixture.nativeElement.querySelectorAll('.profile-publication-checklist li'),
    ).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.profile-publication-checklist button')).toBeNull();
  });

  it('keeps publication blocked for an inactive subscription', () => {
    api.getBarbershop.mockReturnValueOnce(
      of({ ...shop, subscriptionStatus: 'CANCELLED', canPublish: false }),
    );
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-publication-action').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'A subscrição não permite publicar a página.',
    );
    fixture.componentInstance.togglePublication();
    expect(api.updatePublication).not.toHaveBeenCalled();
  });
});
