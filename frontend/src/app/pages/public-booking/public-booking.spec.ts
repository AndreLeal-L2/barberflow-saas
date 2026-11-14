import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en-GB';
import { LanguageService } from '../../core/language.service';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import {
  AvailableSlot,
  Booking,
  CatalogService,
  PublicBarbershop,
} from '../../core/booking.models';
import { PublicBooking } from './public-booking';

registerLocaleData(localePt);
registerLocaleData(localeEn);

describe('PublicBooking', () => {
  const shop: PublicBarbershop = {
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    phone: '+351 910 000 001',
    email: 'owner@example.test',
    description: 'Cortes clássicos e modernos.',
    address: 'Lisboa',
  };

  const service: CatalogService = {
    id: '5317ed65-4087-47ae-aa9c-e0b9c99136',
    name: 'Corte clássico',
    description: 'Corte e acabamento',
    durationMinutes: 45,
    priceAmount: 18,
    priceCurrency: 'EUR',
  };

  const api = {
    getPublicBarbershop: vi.fn(() => of(shop)),
    getPublicServices: vi.fn(() => of([service])),
    getAvailableSlots: vi.fn(() =>
      of([{ startAt: '2026-09-13T09:00:00+01:00', endAt: '2026-09-13T09:45:00+01:00' }]),
    ),
    createPublicBooking: vi.fn(),
  };

  const slot: AvailableSlot = {
    startAt: '2026-09-13T09:00:00+01:00',
    endAt: '2026-09-13T09:45:00+01:00',
  };
  const customer = {
    customerName: 'João Silva',
    customerPhone: '+351 910 000 002',
    customerEmail: 'joao@example.test',
  };
  const booking: Booking = {
    id: 'booking-id',
    ...customer,
    ...slot,
    serviceName: service.name,
    serviceDurationMinutes: service.durationMinutes,
    servicePrice: service.priceAmount,
    priceCurrency: 'EUR',
    status: 'CONFIRMED',
  };

  function readyToBook() {
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    component.selectSlot(slot);
    component.form.setValue(customer);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    api.getPublicBarbershop.mockReturnValue(of(shop));
    api.getPublicServices.mockReturnValue(of([service]));
    api.getAvailableSlots.mockReturnValue(of([slot]));
    api.createPublicBooking.mockReturnValue(of(booking));
    await TestBed.configureTestingModule({
      imports: [PublicBooking],
      providers: [
        provideRouter([]),
        {
          provide: BookingApiService,
          useValue: api,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ slug: 'barbearia-central' }) },
          },
        },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('shows one booking task at a time and lets customers revise earlier choices', () => {
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const visibleSteps = () => element.querySelectorAll('.booking-step:not([hidden])');
    expect(visibleSteps()).toHaveLength(1);
    expect(visibleSteps()[0].textContent).toContain('Escolha o serviço');
    (element.querySelector('.public-service-option') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(visibleSteps()).toHaveLength(1);
    expect(visibleSteps()[0].textContent).toContain('Escolha o dia e a hora');
    (element.querySelector('.quick-date-list button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (element.querySelector('.slot-grid button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(visibleSteps()).toHaveLength(1);
    expect(visibleSteps()[0].textContent).toContain('Os seus dados');
    fixture.componentInstance.form.patchValue(customer);
    (element.querySelector('.booking-progress button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(visibleSteps()[0].textContent).toContain('Escolha o serviço');
    expect(fixture.componentInstance.form.getRawValue()).toEqual(customer);
  });

  it('preselects a clicked calendar time only after real availability returns', () => {
    const pending = new Subject<AvailableSlot[]>();
    api.getAvailableSlots.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.componentRef.setInput('bookingSlug', shop.slug);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('initialDate', slot.startAt.slice(0, 10));
    fixture.componentRef.setInput('initialTime', slot.startAt.slice(11, 16));
    fixture.detectChanges();
    fixture.componentInstance.selectService(service);
    expect(fixture.componentInstance.activeStep()).toBe(2);
    expect(fixture.componentInstance.selectedSlot()).toBeNull();
    pending.next([slot]);
    pending.complete();
    expect(fixture.componentInstance.activeStep()).toBe(3);
    expect(fixture.componentInstance.selectedSlot()).toEqual(slot);
  });

  it('locks navigation while confirmation is pending and returns to times after a conflict', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    const pending = new Subject<Booking>();
    api.createPublicBooking.mockReturnValueOnce(pending);
    component.submit();
    component.goToStep(1);
    component.selectDate(component.quickDates()[1].value);
    component.selectService({ ...service, id: 'another-service' });
    expect(component.activeStep()).toBe(3);
    expect(component.selectedService()).toEqual(service);
    pending.error(
      new HttpErrorResponse({ status: 409, error: { code: 'BOOKING_SLOT_UNAVAILABLE' } }),
    );
    expect(component.activeStep()).toBe(2);
    expect(component.selectedSlot()).toBeNull();
    expect(component.form.getRawValue()).toEqual(customer);
  });

  it('shows the business logo and background returned by the public API', () => {
    api.getPublicBarbershop.mockReturnValueOnce(
      of({ ...shop, logoUrl: '/api/public/logo', coverImageUrl: '/api/public/cover' }),
    );
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.public-shop-logo').getAttribute('src')).toBe(
      '/api/public/logo',
    );
    expect(fixture.nativeElement.querySelector('.public-shop-cover').getAttribute('src')).toBe(
      '/api/public/cover',
    );
    expect(
      fixture.nativeElement.querySelector('.shop-intro').classList.contains('has-shop-cover'),
    ).toBe(true);
  });

  it('loads slots when a quick date is selected', () => {
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();

    const serviceButton = fixture.nativeElement.querySelector(
      '.public-service-option',
    ) as HTMLButtonElement;
    serviceButton.click();
    fixture.detectChanges();

    const quickDateButton = fixture.nativeElement.querySelector(
      '.quick-date-list button',
    ) as HTMLButtonElement;
    quickDateButton.click();
    fixture.detectChanges();

    expect(api.getAvailableSlots).toHaveBeenCalledWith(
      'barbearia-central',
      service.id,
      fixture.componentInstance.quickDates()[0].value,
    );
    expect(fixture.nativeElement.querySelector('.slot-grid button')?.textContent.trim()).toBe(
      fixture.componentInstance.timeLabel('2026-09-13T09:00:00+01:00'),
    );
  });

  it('keeps slots from the most recent date request', () => {
    const firstRequest = new Subject<AvailableSlot[]>();
    const secondRequest = new Subject<AvailableSlot[]>();
    api.getAvailableSlots.mockReturnValueOnce(firstRequest).mockReturnValueOnce(secondRequest);

    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    component.selectDate(component.quickDates()[1].value);

    const latestSlot = {
      startAt: '2026-09-14T11:00:00+01:00',
      endAt: '2026-09-14T11:45:00+01:00',
    };
    secondRequest.next([latestSlot]);
    firstRequest.next([
      { startAt: '2026-09-13T09:00:00+01:00', endAt: '2026-09-13T09:45:00+01:00' },
    ]);

    expect(component.slots()).toEqual([latestSlot]);
  });

  it('clears the previous booking selection when the date input is emptied', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    const dateInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

    dateInput.value = '';
    dateInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.selectedDate()).toBe('');
    expect(component.selectedSlot()).toBeNull();
    expect(component.slots()).toEqual([]);
    expect(component.canSubmit()).toBe(false);
    expect(fixture.nativeElement.querySelector('.booking-submit').disabled).toBe(true);
    component.submit();
    expect(api.createPublicBooking).not.toHaveBeenCalled();
  });

  it('ignores an availability response that arrives after the date was cleared', () => {
    const pending = new Subject<AvailableSlot[]>();
    api.getAvailableSlots.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    component.selectDate('');

    pending.next([slot]);
    pending.complete();
    fixture.detectChanges();

    expect(component.slots()).toEqual([]);
    expect(component.loadingSlots()).toBe(false);
    expect(fixture.nativeElement.querySelector('.slot-grid')).toBeNull();
  });

  it.each(['customerName', 'customerPhone'] as const)(
    'rejects whitespace-only %s without sending a booking',
    (field) => {
      const fixture = readyToBook();
      const component = fixture.componentInstance;
      component.form.controls[field].setValue('   ');
      component.submit();
      fixture.detectChanges();

      expect(component.form.controls[field].invalid).toBe(true);
      expect(component.canSubmit()).toBe(false);
      expect(fixture.nativeElement.querySelector('.field-error')).not.toBeNull();
      expect(api.createPublicBooking).not.toHaveBeenCalled();
    },
  );

  it.each([
    { field: 'customerName' as const, value: 'Alice\nInjected log line' },
    { field: 'customerPhone' as const, value: 'call me maybe' },
  ])('rejects malformed $field before submitting a booking', ({ field, value }) => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    component.form.controls[field].setValue(value);
    component.submit();
    fixture.detectChanges();

    expect(component.form.controls[field].invalid).toBe(true);
    expect(api.createPublicBooking).not.toHaveBeenCalled();
  });

  it('shows booking conflicts outside the hidden customer step', () => {
    const fixture = readyToBook();
    api.createPublicBooking.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'BOOKING_SLOT_UNAVAILABLE', message: 'Este horário já foi reservado.' },
          }),
      ),
    );
    fixture.componentInstance.submit();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Este horário já foi reservado.');
    expect(alert.closest('[hidden]')).toBeNull();
    expect(fixture.componentInstance.activeStep()).toBe(2);
  });

  it('refreshes availability and clears the chosen slot after a booking conflict', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    const message = 'O horário selecionado já não está disponível.';
    api.createPublicBooking.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'BOOKING_SLOT_UNAVAILABLE', message },
          }),
      ),
    );
    api.getAvailableSlots.mockReturnValueOnce(of([]));

    component.submit();
    fixture.detectChanges();

    expect(component.selectedSlot()).toBeNull();
    expect(component.slots()).toEqual([]);
    expect(component.form.getRawValue()).toEqual(customer);
    expect(component.canSubmit()).toBe(false);
    expect(component.submitting()).toBe(false);
    expect(api.getAvailableSlots).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(message);
  });

  it('sends one booking while confirmation is pending and renders the returned booking', () => {
    const pending = new Subject<Booking>();
    api.createPublicBooking.mockReturnValueOnce(pending);
    const fixture = readyToBook();
    const component = fixture.componentInstance;

    component.submit();
    component.submit();
    fixture.detectChanges();

    expect(api.createPublicBooking).toHaveBeenCalledExactlyOnceWith(shop.slug, {
      serviceId: service.id,
      startAt: slot.startAt,
      ...customer,
    });
    expect(fixture.nativeElement.querySelector('.booking-submit').disabled).toBe(true);

    pending.next(booking);
    pending.complete();
    fixture.detectChanges();

    expect(component.submitting()).toBe(false);
    expect(component.confirmation()).toEqual(booking);
    expect(fixture.nativeElement.querySelector('.booking-confirmation')?.textContent).toContain(
      customer.customerName,
    );
    expect(fixture.nativeElement.querySelector('#booking-form')).toBeNull();
  });

  it('ignores old service errors without hiding the current availability loading state', () => {
    const oldRequest = new Subject<AvailableSlot[]>();
    const currentRequest = new Subject<AvailableSlot[]>();
    api.getAvailableSlots.mockReturnValueOnce(oldRequest).mockReturnValueOnce(currentRequest);
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    component.selectService({ ...service, id: 'another-service', durationMinutes: 30 });

    oldRequest.error(new Error('Old availability failed'));
    expect(component.loadingSlots()).toBe(true);
    expect(component.slotError()).toBeNull();

    currentRequest.next([slot]);
    currentRequest.complete();
    expect(component.slots()).toEqual([slot]);
    expect(component.loadingSlots()).toBe(false);
  });

  it('resets customer details and invalidates pending availability when starting another booking', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    const pending = new Subject<AvailableSlot[]>();
    api.getAvailableSlots.mockReturnValueOnce(pending);
    component.selectDate(component.quickDates()[1].value);
    component.confirmation.set(booking);

    component.startAnotherBooking();
    pending.next([slot]);
    pending.complete();

    expect(component.confirmation()).toBeNull();
    expect(component.selectedService()).toBeNull();
    expect(component.selectedDate()).toBe('');
    expect(component.selectedSlot()).toBeNull();
    expect(component.slots()).toEqual([]);
    expect(component.form.getRawValue()).toEqual({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
    });
  });

  it('shows an unavailable page when the public shop request fails', () => {
    api.getPublicBarbershop.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.public-unavailable')?.textContent).toContain(
      'Esta página não está disponível neste momento.',
    );
    expect(fixture.nativeElement.querySelector('#booking-form')).toBeNull();
  });

  it('shows an availability error instead of offering an unavailable slot', () => {
    api.getAvailableSlots.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    fixture.detectChanges();

    expect(component.loadingSlots()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível consultar os horários.',
    );
    expect(fixture.nativeElement.querySelector('.slot-grid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.booking-submit').disabled).toBe(true);
  });

  it('lets the customer retry a failed availability request for the same date', () => {
    api.getAvailableSlots.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const date = component.quickDates()[0].value;
    component.selectService(service);
    component.selectDate(date);
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.slot-retry') as HTMLButtonElement;
    expect(retryButton?.textContent).toContain('Tentar novamente');
    retryButton.click();
    fixture.detectChanges();

    expect(api.getAvailableSlots.mock.calls).toEqual([
      [shop.slug, service.id, date],
      [shop.slug, service.id, date],
    ]);
    expect(component.slotError()).toBeNull();
    expect(fixture.nativeElement.querySelector('.slot-grid button')).not.toBeNull();
  });

  it('rejects a phone number made only of punctuation before submitting', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    component.form.controls.customerPhone.setValue('-------');
    component.submit();

    expect(component.form.controls.customerPhone.invalid).toBe(true);
    expect(api.createPublicBooking).not.toHaveBeenCalled();
  });

  it('uses the booking calendar limits supplied by the shop', () => {
    api.getPublicBarbershop.mockReturnValueOnce(
      of(Object.assign({}, shop, { bookingStartDate: '2026-10-24', bookingEndDate: '2026-12-23' })),
    );
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const dateInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

    expect(dateInput.min).toBe('2026-10-24');
    expect(dateInput.max).toBe('2026-12-23');
    expect(fixture.componentInstance.quickDates().map(({ value }) => value)).toEqual([
      '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30',
    ]);
  });

  it('exposes the selected service, date and time to assistive technology', () => {
    const fixture = readyToBook();
    for (const selector of ['.public-service-option', '.quick-date-list button', '.slot-grid button']) {
      expect(fixture.nativeElement.querySelector(selector).getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('keeps customer details and allows retry after a temporary booking failure', () => {
    const fixture = readyToBook();
    const component = fixture.componentInstance;
    api.createPublicBooking.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );

    component.submit();
    fixture.detectChanges();

    expect(component.confirmation()).toBeNull();
    expect(component.form.getRawValue()).toEqual(customer);
    expect(component.selectedSlot()).toEqual(slot);
    expect(fixture.nativeElement.querySelector('.booking-submit').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível concluir a marcação.',
    );

    component.submit();
    expect(api.createPublicBooking).toHaveBeenCalledTimes(2);
    expect(component.confirmation()).toEqual(booking);
  });
  it('updates dates and prices in English while preserving service names and selections', () => {
    const fixture = TestBed.createComponent(PublicBooking);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectService(service);
    component.selectDate(component.quickDates()[0].value);
    const date = component.selectedDate();
    TestBed.inject(LanguageService).setLanguage('en-GB');
    fixture.detectChanges();
    expect(component.quickDates()[0].weekday).toBe('Today');
    expect(fixture.nativeElement.textContent).toContain('Choose your service');
    expect(fixture.nativeElement.textContent).toContain('Corte clássico');
    expect(fixture.nativeElement.textContent).toContain('€18.00');
    expect(component.selectedDate()).toBe(date);
    expect(component.selectedService()).toEqual(service);
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });
});
