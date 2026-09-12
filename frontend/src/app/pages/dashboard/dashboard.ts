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
import { RouterLink } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCircle,
  LucideCircleCheck,
  LucideCopy,
  LucideExternalLink,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { ApiError } from '../../core/auth.models';
import { Booking, DashboardAnalytics, DashboardBarbershop } from '../../core/booking.models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    LucideCalendarDays,
    LucideCircle,
    LucideCircleCheck,
    LucideCopy,
    LucideExternalLink,
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly api = inject(BookingApiService);

  readonly shop = signal<DashboardBarbershop | null>(null);
  readonly analytics = signal<DashboardAnalytics | null>(null);
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly savingPublication = signal(false);
  readonly copied = signal(false);
  readonly error = signal<string | null>(null);

  readonly publicUrl = computed(() => {
    const slug = this.shop()?.slug;
    return slug ? window.location.origin + '/b/' + slug : '';
  });

  readonly progress = computed(() => (this.shop()?.completedSetupSteps ?? 1) * 25);

  readonly nextBookings = computed(() =>
    this.bookings()
      .filter(
        (booking) =>
          booking.status === 'CONFIRMED' && new Date(booking.startAt).getTime() >= Date.now(),
      )
      .slice(0, 3),
  );

  readonly activityDays = computed(() => {
    const days = this.analytics()?.upcomingDailyBookings ?? [];
    const maximum = Math.max(1, ...days.map((day) => day.bookingCount));

    return days.map((day) => ({
      ...day,
      height: day.bookingCount === 0 ? 0 : Math.max(10, (day.bookingCount / maximum) * 100),
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  togglePublication(): void {
    const shop = this.shop();
    if (!shop || this.savingPublication()) {
      return;
    }

    this.error.set(null);
    this.savingPublication.set(true);
    this.api
      .updatePublication(!shop.published)
      .pipe(finalize(() => this.savingPublication.set(false)))
      .subscribe({
        next: (updated) => this.shop.set(updated),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  copyPublicUrl(): void {
    const url = this.publicUrl();
    if (!url) {
      return;
    }

    void navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 1800);
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      shop: this.api.getBarbershop(),
      analytics: this.api.getDashboardAnalytics(),
      bookings: this.api.listBookings(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ shop, analytics, bookings }) => {
          this.shop.set(shop);
          this.analytics.set(analytics);
          this.bookings.set(bookings);
        },
        error: () => this.error.set('Não foi possível carregar o painel.'),
      });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível atualizar a publicação.';
  }
}
