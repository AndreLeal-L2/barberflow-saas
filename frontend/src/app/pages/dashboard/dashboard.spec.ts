import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { DashboardAnalytics, DashboardBarbershop } from '../../core/booking.models';
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
    listBookings: vi.fn(() => of([])),
    updatePublication: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-PT' },
        { provide: BookingApiService, useValue: api },
      ],
    }).compileComponents();
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
});
