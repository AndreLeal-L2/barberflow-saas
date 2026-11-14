import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BookingApiService } from './booking-api.service';

describe('Dashboard request sharing', () => {
  const owner = signal<object | null>({ id: 'owner-a' });
  let api: BookingApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    owner.set({ id: 'owner-a' });
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { user: owner } },
    ] });
    api = TestBed.inject(BookingApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('shares one pending shop request between layout and page and refreshes after completion', () => {
    const layout = vi.fn();
    const page = vi.fn();
    api.getBarbershop().subscribe(layout);
    api.getBarbershop().subscribe(page);
    const requests = http.match('/api/dashboard/barbershop');
    expect(requests).toHaveLength(1);
    requests[0].flush({ id: 'shop-a' });
    expect(layout).toHaveBeenCalledExactlyOnceWith({ id: 'shop-a' });
    expect(page).toHaveBeenCalledExactlyOnceWith({ id: 'shop-a' });
    api.getBarbershop().subscribe();
    http.expectOne('/api/dashboard/barbershop').flush({ id: 'shop-a', published: true });
  });

  it('does not share a pending response across account changes', () => {
    const oldResult = vi.fn();
    api.getBarbershop().subscribe(oldResult);
    const oldRequest = http.expectOne('/api/dashboard/barbershop');
    owner.set({ id: 'owner-b' });
    const newResult = vi.fn();
    api.getBarbershop().subscribe(newResult);
    const newRequest = http.expectOne('/api/dashboard/barbershop');
    oldRequest.flush({ id: 'shop-a' });
    api.getBarbershop().subscribe();
    http.expectNone('/api/dashboard/barbershop');
    newRequest.flush({ id: 'shop-b' });
    expect(newResult).toHaveBeenCalledExactlyOnceWith({ id: 'shop-b' });
  });

  it('allows a fresh request after an error instead of caching the failure', () => {
    api.getBarbershop().subscribe({ error: () => {} });
    http.expectOne('/api/dashboard/barbershop').flush({}, { status: 503, statusText: 'Unavailable' });
    api.getBarbershop().subscribe();
    http.expectOne('/api/dashboard/barbershop').flush({ id: 'shop-a' });
  });
});
