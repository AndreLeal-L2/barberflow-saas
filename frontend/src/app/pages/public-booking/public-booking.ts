import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCalendarCheck, LucideCheck, LucideClock, LucideMapPin } from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import {
  AvailableSlot,
  Booking,
  CatalogService,
  PublicBarbershop,
} from '../../core/booking.models';

@Component({
  selector: 'app-public-booking',
  imports: [
    CurrencyPipe,
    LucideCalendarCheck,
    LucideCheck,
    LucideClock,
    LucideMapPin,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './public-booking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicBooking implements OnInit {
  private readonly api = inject(BookingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  readonly shop = signal<PublicBarbershop | null>(null);
  readonly services = signal<CatalogService[]>([]);
  readonly selectedService = signal<CatalogService | null>(null);
  readonly selectedDate = signal('');
  readonly slots = signal<AvailableSlot[]>([]);
  readonly selectedSlot = signal<AvailableSlot | null>(null);
  readonly loading = signal(true);
  readonly loadingSlots = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly slotError = signal<string | null>(null);
  readonly confirmation = signal<Booking | null>(null);

  readonly today = this.toDateInput(new Date());
  readonly maxDate = this.toDateInput(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
  readonly form = this.formBuilder.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerPhone: ['', [Validators.required, Validators.maxLength(30)]],
    customerEmail: ['', [Validators.email, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    if (!this.slug) {
      this.loading.set(false);
      this.error.set('Esta página de marcações não existe.');
      return;
    }

    forkJoin({
      shop: this.api.getPublicBarbershop(this.slug),
      services: this.api.getPublicServices(this.slug),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ shop, services }) => {
          this.shop.set(shop);
          this.services.set(services);
        },
        error: () => this.error.set('Esta página não está disponível neste momento.'),
      });
  }

  selectService(service: CatalogService): void {
    this.selectedService.set(service);
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.slotError.set(null);
    if (this.selectedDate()) {
      this.loadSlots();
    }
  }

  chooseDate(event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.slotError.set(null);
    if (date && this.selectedService()) {
      this.loadSlots();
    }
  }

  selectSlot(slot: AvailableSlot): void {
    this.selectedSlot.set(slot);
  }

  canSubmit(): boolean {
    return Boolean(this.selectedService() && this.selectedSlot()) && this.form.valid;
  }

  submit(): void {
    this.form.markAllAsTouched();
    const service = this.selectedService();
    const slot = this.selectedSlot();
    if (!service || !slot || this.form.invalid || this.submitting()) {
      return;
    }

    this.error.set(null);
    this.submitting.set(true);
    this.api
      .createPublicBooking(this.slug, {
        serviceId: service.id,
        startAt: slot.startAt,
        ...this.form.getRawValue(),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (booking) => this.confirmation.set(booking),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  startAnotherBooking(): void {
    this.confirmation.set(null);
    this.selectedService.set(null);
    this.selectedDate.set('');
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.form.reset({ customerName: '', customerPhone: '', customerEmail: '' });
  }

  dateLabel(date: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date + 'T12:00:00'));
  }

  timeLabel(dateTime: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateTime));
  }

  private loadSlots(): void {
    const service = this.selectedService();
    const date = this.selectedDate();
    if (!service || !date) {
      return;
    }

    this.loadingSlots.set(true);
    this.api
      .getAvailableSlots(this.slug, service.id, date)
      .pipe(finalize(() => this.loadingSlots.set(false)))
      .subscribe({
        next: (slots) => this.slots.set(slots),
        error: () => this.slotError.set('Não foi possível consultar os horários.'),
      });
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível concluir a marcação.';
  }
}
