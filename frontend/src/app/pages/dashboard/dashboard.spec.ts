import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { Booking, DashboardAnalytics, DashboardBarbershop } from '../../core/booking.models';
import { LanguageService } from '../../core/language.service';
import { Dashboard } from './dashboard';

registerLocaleData(localePt);

describe('Dashboard', () => {
  const shop: DashboardBarbershop = {
    id: 'a923f451-3fd5-4b0e-af9e-a34139862845',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    phone: '+351 910 000 001',
    email: 'owner@example.test',
    publicDescription: null,
    publicAddress: null,
    published: true,
    subscriptionStatus: 'TRIALING',
    serviceCount: 1,
    availabilityDayCount: 1,
    completedSetupSteps: 4,
    canPublish: true,
  };

  const analytics: DashboardAnalytics = {
    asOfDate: '2026-09-12',
    upcomingPeriodEnd: '2026-10-11',
    bookingsToday: 1,
    upcomingBookings: 3,
    completedLast30Days: 7,
    cancelledLast30Days: 2,
    scheduledValue: 54,
    priceCurrency: 'EUR',
    topUpcomingService: { name: 'Corte clássico', bookingCount: 2 },
    upcomingDailyBookings: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-09-${String(index + 12).padStart(2, '0')}`,
      bookingCount: index === 1 ? 2 : index === 2 ? 1 : 0,
    })),
  };

  const api = {
    getBarbershop: vi.fn(() => of(shop)),
    getDashboardAnalytics: vi.fn(() => of(analytics)),
    listBookings: vi.fn(() => of<Booking[]>([])),
    updatePublication: vi.fn((published: boolean) => of({ ...shop, published })),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    api.getBarbershop.mockReturnValue(of(shop));
    api.getDashboardAnalytics.mockReturnValue(of(analytics));
    api.listBookings.mockReturnValue(of([]));
    api.updatePublication.mockImplementation((published) => of({ ...shop, published }));
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-PT' },
        { provide: BookingApiService, useValue: api },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('renders operational metrics and scales daily activity bars', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const metricElements = fixture.nativeElement.querySelectorAll(
      '.analytics-metrics dd',
    ) as NodeListOf<HTMLElement>;
    const bars = fixture.nativeElement.querySelectorAll('.activity-bar') as NodeListOf<HTMLElement>;
    const metricValues = Array.from(metricElements).map((element) => element.textContent?.trim());

    expect(metricValues).toEqual(['1', '3', '7', '€ 54,00']);
    expect(bars).toHaveLength(14);
    expect(bars[1].style.height).toBe('100%');
    expect(bars[2].style.height).toBe('50%');
    expect(fixture.nativeElement.textContent).toContain('Corte clássico');
    expect(api.getDashboardAnalytics).toHaveBeenCalledOnce();
  });

  it('keeps setup, public link and publication available when analytics and bookings fail', () => {
    api.getBarbershop.mockReturnValueOnce(
      of({ ...shop, published: false, completedSetupSteps: 3 }),
    );
    api.getDashboardAnalytics.mockReturnValueOnce(
      throwError(() => new Error('Analytics unavailable')),
    );
    api.listBookings.mockReturnValueOnce(throwError(() => new Error('Bookings unavailable')));
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.componentInstance.shop()?.id).toBe(shop.id);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.public-link-section')?.textContent).toContain(
      '/b/barbearia-central',
    );
    expect(fixture.nativeElement.querySelectorAll('.setup-list li')).toHaveLength(4);
    expect(
      fixture.nativeElement.querySelector('.setup-list a[href="/dashboard/profile"]')?.textContent,
    ).toContain('Publicar página');
    expect(fixture.nativeElement.querySelector('.analytics-section')?.textContent).toContain(
      'Não foi possível carregar as estatísticas.',
    );
    expect(fixture.nativeElement.querySelector('.agenda-section')?.textContent).toContain(
      'Não foi possível carregar as próximas marcações.',
    );
    expect(fixture.nativeElement.querySelector('.agenda-empty')).toBeNull();
    expect(fixture.nativeElement.querySelector('.analytics-metrics')).toBeNull();

    const publicationButton = fixture.nativeElement.querySelector(
      '.activation-actions button',
    ) as HTMLButtonElement;
    expect(publicationButton.disabled).toBe(false);
    publicationButton.click();
    expect(api.updatePublication).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('keeps the page loading until the shop request completes despite failures in secondary reads', () => {
    const pendingShop = new Subject<DashboardBarbershop>();
    api.getBarbershop.mockReturnValueOnce(pendingShop);
    api.getDashboardAnalytics.mockReturnValueOnce(
      throwError(() => new Error('Analytics unavailable')),
    );
    api.listBookings.mockReturnValueOnce(throwError(() => new Error('Bookings unavailable')));
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.loading-state')?.textContent).toContain(
      'A carregar o painel...',
    );
    expect(fixture.nativeElement.querySelector('.activation-banner')).toBeNull();

    pendingShop.next(shop);
    pendingShop.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.activation-banner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.public-link-section')).not.toBeNull();
  });

  it('reveals shop controls while secondary reads are pending without claiming an empty agenda', () => {
    const pendingAnalytics = new Subject<DashboardAnalytics>();
    const pendingBookings = new Subject<Booking[]>();
    api.getDashboardAnalytics.mockReturnValueOnce(pendingAnalytics);
    api.listBookings.mockReturnValueOnce(pendingBookings);
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.activation-actions button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.public-link-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.agenda-section .panel-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.analytics-section .panel-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.agenda-empty')).toBeNull();

    pendingAnalytics.next(analytics);
    pendingAnalytics.complete();
    pendingBookings.next([]);
    pendingBookings.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.analytics-metrics')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.agenda-empty')?.textContent).toContain(
      'A agenda está livre.',
    );
  });
});
