import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { LucideCalendarCheck, LucideCheck, LucideX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { Booking, BookingStatus } from '../../core/booking.models';

type BookingFilter = 'UPCOMING' | 'HISTORY';

@Component({
  selector: 'app-bookings',
  imports: [CurrencyPipe, DatePipe, LucideCalendarCheck, LucideCheck, LucideX],
  templateUrl: './bookings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bookings implements OnInit {
  private readonly api = inject(BookingApiService);

  readonly bookings = signal<Booking[]>([]);
  readonly filter = signal<BookingFilter>('UPCOMING');
  readonly loading = signal(true);
  readonly updatingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly visibleBookings = computed(() => {
    const now = Date.now();
    return this.bookings().filter((booking) => {
      const isUpcoming = booking.status === 'CONFIRMED' && new Date(booking.endAt).getTime() >= now;
      return this.filter() === 'UPCOMING' ? isUpcoming : !isUpcoming;
    });
  });

  ngOnInit(): void {
    this.api
      .listBookings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (bookings) => this.bookings.set(bookings),
        error: () => this.error.set('Não foi possível carregar as marcações.'),
      });
  }

  setFilter(filter: BookingFilter): void {
    this.filter.set(filter);
  }

  canComplete(booking: Booking): boolean {
    return booking.status === 'CONFIRMED' && new Date(booking.startAt).getTime() <= Date.now();
  }

  updateStatus(booking: Booking, status: BookingStatus): void {
    if (this.updatingId()) {
      return;
    }

    this.error.set(null);
    this.updatingId.set(booking.id);
    this.api
      .updateBookingStatus(booking.id, status)
      .pipe(finalize(() => this.updatingId.set(null)))
      .subscribe({
        next: (updated) =>
          this.bookings.update((bookings) =>
            bookings.map((current) => (current.id === updated.id ? updated : current)),
          ),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  statusLabel(status: BookingStatus): string {
    return {
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Concluída',
    }[status];
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível atualizar a marcação.';
  }
}
