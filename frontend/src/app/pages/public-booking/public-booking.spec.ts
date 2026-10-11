import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en-GB';
import { LanguageService } from '../../core/language.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { AvailableSlot, CatalogService, PublicBarbershop } from '../../core/booking.models';
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

  beforeEach(async () => {
    vi.clearAllMocks();
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
