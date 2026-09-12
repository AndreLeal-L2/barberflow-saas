import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCalendarX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';

@Component({
  selector: 'app-cancel-booking',
  imports: [LucideCalendarX, RouterLink],
  templateUrl: './cancel-booking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelBooking {
  private readonly api = inject(BookingApiService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly submitting = signal(false);
  readonly error = signal<string | null>(
    this.token ? null : 'O link de cancelamento está incompleto.',
  );
  readonly success = signal<string | null>(null);

  cancel(): void {
    if (!this.token || this.submitting()) {
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.api
      .cancelPublicBooking(this.token)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => this.success.set(response.message),
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.error.set(apiError?.message ?? 'Não foi possível cancelar a marcação.');
        },
      });
  }
}
