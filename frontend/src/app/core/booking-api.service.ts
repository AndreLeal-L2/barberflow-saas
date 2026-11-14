import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, Observable, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';
import { MessageResponse } from './auth.models';
import {
  AvailabilityDay,
  AvailableSlot,
  BarbershopProfileRequest,
  Booking,
  BookingStatus,
  CatalogService,
  CreateBookingRequest,
  CreateBlockedTimeRequest,
  DashboardAnalytics,
  DashboardBarbershop,
  BlockedTime,
  PublicBarbershop,
  ServiceRequest,
  ShopImageKind,
} from './booking.models';
import { CsrfService } from './csrf.service';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly auth = inject(AuthService);
  private shopRequest?: { owner: unknown; response: Observable<DashboardBarbershop> };

  getBarbershop(): Observable<DashboardBarbershop> {
    const owner = this.auth.user();
    if (this.shopRequest?.owner === owner) return this.shopRequest.response;
    const response = this.http.get<DashboardBarbershop>('/api/dashboard/barbershop').pipe(
      finalize(() => {
        if (this.shopRequest?.response === response) this.shopRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.shopRequest = { owner, response };
    return response;
  }

  getDashboardAnalytics(): Observable<DashboardAnalytics> {
    return this.http.get<DashboardAnalytics>('/api/dashboard/analytics');
  }

  uploadImage(kind: ShopImageKind, file: File): Observable<DashboardBarbershop> {
    const body = new FormData();
    body.append('file', file);
    return this.csrf.execute(() =>
      this.http.put<DashboardBarbershop>('/api/dashboard/barbershop/images/' + kind, body),
    );
  }

  removeImage(kind: ShopImageKind): Observable<DashboardBarbershop> {
    return this.csrf.execute(() =>
      this.http.delete<DashboardBarbershop>('/api/dashboard/barbershop/images/' + kind),
    );
  }

  updateProfile(request: BarbershopProfileRequest): Observable<DashboardBarbershop> {
    return this.csrf.execute(() =>
      this.http.put<DashboardBarbershop>('/api/dashboard/barbershop/profile', request),
    );
  }

  updatePublication(published: boolean): Observable<DashboardBarbershop> {
    return this.csrf.execute(() =>
      this.http.patch<DashboardBarbershop>('/api/dashboard/barbershop/publication', {
        published,
      }),
    );
  }

  listServices(): Observable<CatalogService[]> {
    return this.http.get<CatalogService[]>('/api/dashboard/services');
  }

  createService(request: ServiceRequest): Observable<CatalogService> {
    return this.csrf.execute(() =>
      this.http.post<CatalogService>('/api/dashboard/services', request),
    );
  }

  updateService(id: string, request: ServiceRequest): Observable<CatalogService> {
    return this.csrf.execute(() =>
      this.http.put<CatalogService>('/api/dashboard/services/' + id, request),
    );
  }

  deleteService(id: string): Observable<void> {
    return this.csrf.execute(() => this.http.delete<void>('/api/dashboard/services/' + id));
  }

  getAvailability(): Observable<AvailabilityDay[]> {
    return this.http.get<AvailabilityDay[]>('/api/dashboard/availability');
  }

  updateAvailability(days: AvailabilityDay[]): Observable<AvailabilityDay[]> {
    return this.csrf.execute(() =>
      this.http.put<AvailabilityDay[]>('/api/dashboard/availability', { days }),
    );
  }

  listBlockedTimes(): Observable<BlockedTime[]> {
    return this.http.get<BlockedTime[]>('/api/dashboard/availability/blocks');
  }

  createBlockedTime(request: CreateBlockedTimeRequest): Observable<BlockedTime> {
    return this.csrf.execute(() =>
      this.http.post<BlockedTime>('/api/dashboard/availability/blocks', request),
    );
  }

  deleteBlockedTime(id: string): Observable<void> {
    return this.csrf.execute(() =>
      this.http.delete<void>('/api/dashboard/availability/blocks/' + id),
    );
  }

  listBookings(query: { from?: string; to?: string; view?: string; page?: number; size?: number } = {}): Observable<Booking[]> {
    return this.http.get<Booking[]>('/api/dashboard/bookings', { params: query });
  }

  updateBookingStatus(id: string, status: BookingStatus): Observable<Booking> {
    return this.csrf.execute(() =>
      this.http.patch<Booking>('/api/dashboard/bookings/' + id + '/status', { status }),
    );
  }

  getPublicBarbershop(slug: string): Observable<PublicBarbershop> {
    return this.http.get<PublicBarbershop>('/api/public/barbershops/' + slug);
  }

  getPublicServices(slug: string): Observable<CatalogService[]> {
    return this.http.get<CatalogService[]>('/api/public/barbershops/' + slug + '/services');
  }

  getAvailableSlots(slug: string, serviceId: string, date: string): Observable<AvailableSlot[]> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    return this.http.get<AvailableSlot[]>('/api/public/barbershops/' + slug + '/available-slots', {
      params,
    });
  }

  createPublicBooking(slug: string, request: CreateBookingRequest): Observable<Booking> {
    return this.csrf.execute(() =>
      this.http.post<Booking>('/api/public/barbershops/' + slug + '/bookings', request),
    );
  }

  cancelPublicBooking(token: string): Observable<MessageResponse> {
    return this.csrf.execute(() =>
      this.http.post<MessageResponse>('/api/public/bookings/cancel', { token }),
    );
  }
}
