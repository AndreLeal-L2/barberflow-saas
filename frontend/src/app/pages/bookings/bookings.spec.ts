import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { LanguageService } from '../../core/language.service';
import { ShopAppearanceService } from '../../core/shop-appearance.service';
import { Bookings } from './bookings';

registerLocaleData(localePt);

describe('Daily agenda actions', () => {
  const date = '2030-10-21';
  const api = {
    updateBookingStatus: vi.fn(() => of({})),
    getBarbershop: vi.fn(() => of({ published: true, slug: 'studio' })),
    getAvailability: vi.fn(() =>
      of([{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '18:00' }]),
    ),
    listBookings: vi.fn(() =>
      of([
        {
          id: 'booking-1',
          customerName: 'Cliente exemplo',
          customerPhone: '+351 930 000 001',
          startAt: `${date}T10:00:00`,
          endAt: `${date}T10:45:00`,
          serviceName: 'Sessão',
          serviceDurationMinutes: 45,
          servicePrice: 25,
          priceCurrency: 'EUR',
          status: 'CONFIRMED',
        },
      ]),
    ),
    listBlockedTimes: vi.fn(() =>
      of([
        { id: 'block-1', startAt: `${date}T12:00:00`, endAt: `${date}T13:00:00`, reason: 'Pausa' },
      ]),
    ),
  };

  beforeEach(async () => {
    localStorage.removeItem('barberflow.bookings.view');
    await TestBed.configureTestingModule({
      imports: [Bookings],
      providers: [provideRouter([]), { provide: BookingApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('offers click-to-book only inside working hours, excluding appointments and blocks', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    fixture.componentInstance.selectedDate.set(date);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[aria-label="Marcar às 09:00"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Marcar às 10:00"]')).toBeNull();
    expect(element.querySelector('[aria-label="Marcar às 10:30"]')).toBeNull();
    expect(element.querySelector('[aria-label="Marcar às 12:00"]')).toBeNull();
    expect(element.querySelector('[aria-label="Marcar às 18:00"]')).toBeNull();
    const open = vi.spyOn(fixture.componentInstance, 'openBooking').mockImplementation(() => {});
    (element.querySelector('[aria-label="Marcar às 09:00"]') as HTMLButtonElement).click();
    expect(open).toHaveBeenCalledExactlyOnceWith('09:00');
    fixture.componentInstance.shop.set({ ...fixture.componentInstance.shop()!, published: false });
    fixture.detectChanges();
    expect(element.querySelectorAll('.calendar-free-slot')).toHaveLength(0);
  });

  it('releases cancelled appointments from the calendar while keeping their history', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectedDate.set(date);
    component.bookings.update((items) =>
      items.map((item) => ({ ...item, status: 'CANCELLED' as const })),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.calendar-event.status-cancelled')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Marcar às 10:00"]')).not.toBeNull();
    component.setFilter('HISTORY');
    expect(component.visibleBookings()).toHaveLength(1);
    expect(component.visibleBookings()[0].status).toBe('CANCELLED');
  });

  it('updates the daily calendar after a manual booking and keeps its details accessible', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectedDate.set(date);
    const booking = {
      ...component.bookings()[0],
      id: 'manual',
      startAt: `${date}T09:00:00`,
      endAt: `${date}T09:45:00`,
    };
    component.bookingCreated(booking);
    component.bookingCreated(booking);
    fixture.detectChanges();
    expect(component.bookings().filter((item) => item.id === booking.id)).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.calendar-event[role="button"]')).toHaveLength(
      2,
    );
    component.detailId.set('manual');
    expect(component.detailBooking()?.startAt).toBe(`${date}T09:00:00`);
  });
  it('does not start overlapping calendar refreshes while a response is pending', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const pending = new Subject<ReturnType<typeof component.bookings>>();
    const calls = api.listBookings.mock.calls.length;
    api.listBookings.mockReturnValueOnce(pending);
    component.reload();
    component.reload();
    expect(api.listBookings).toHaveBeenCalledTimes(calls + 1);
    pending.next(component.bookings());
    pending.complete();
    expect(component.loading()).toBe(false);
  });
  it('keeps booking status changes locked until a calendar refresh finishes', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const pending = new Subject<ReturnType<typeof component.bookings>>();
    api.listBookings.mockReturnValueOnce(pending);
    component.reload();
    component.updateStatus(component.bookings()[0], 'CANCELLED');
    expect(api.updateBookingStatus).not.toHaveBeenCalled();
    pending.next(component.bookings());
    pending.complete();
  });

  it('requests only the selected day instead of the complete booking history', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const next = new Date(component.selectedDate() + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    expect(api.listBookings).toHaveBeenLastCalledWith({ from: component.selectedDate(), to });
  });

  it('replaces a pending day request when navigating and ignores its late response', () => {
    const oldDay = new Subject<any[]>();
    const newDay = new Subject<any[]>();
    api.listBookings.mockReturnValueOnce(oldDay).mockReturnValueOnce(newDay);
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.moveDate(1);
    newDay.next([{ id: 'new-day', startAt: `${date}T11:00:00`, endAt: `${date}T11:30:00`, status: 'CONFIRMED' }]);
    newDay.complete();
    oldDay.next([{ id: 'old-day' }]);
    oldDay.complete();
    expect(component.bookings().map((item) => item.id)).toEqual(['new-day']);
    expect(component.loading()).toBe(false);
  });

  it('loads bounded pages when switching to the history list', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    fixture.componentInstance.setView('LIST');
    fixture.componentInstance.setFilter('HISTORY');
    expect(api.listBookings).toHaveBeenLastCalledWith({ view: 'history', page: 0, size: 50 });
  });

  it('does not restore the previous business from a response received after leaving the page', () => {
    const pending = new Subject<any>();
    api.getBarbershop.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    fixture.destroy();
    pending.next({ id: 'previous-owner', published: true, slug: 'old-shop' });
    pending.complete();
    expect(TestBed.inject(ShopAppearanceService).shop()).toBeNull();
  });

  it('keeps every loaded page and exposes another page only when the server returns a sentinel', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const sample = component.bookings()[0];
    const records = Array.from({ length: 51 }, (_, i) => ({ ...sample, id: `page-${i}` }));
    api.listBookings.mockReturnValueOnce(of(records));
    component.setView('LIST');
    expect(component.bookings()).toHaveLength(50);
    expect(component.hasMore()).toBe(true);
    api.listBookings.mockReturnValueOnce(of(records.slice(50)));
    component.loadMore();
    expect(api.listBookings).toHaveBeenLastCalledWith({ view: 'upcoming', page: 1, size: 50 });
    expect(component.bookings()).toHaveLength(51);
    expect(component.hasMore()).toBe(false);
  });
});
