import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailabilityDay,
  AvailableSlot,
  BarbershopProfileRequest,
  Booking,
  BookingStatus,
  CatalogService,
  CreateBookingRequest,
  DashboardBarbershop,
  PublicBarbershop,
  ServiceRequest,
} from './booking.models';
import { CsrfService } from './csrf.service';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);

  getBarbershop(): Observable<DashboardBarbershop> {
    return this.http.get<DashboardBarbershop>('/api/dashboard/barbershop');
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

  listBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>('/api/dashboard/bookings');
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
}
