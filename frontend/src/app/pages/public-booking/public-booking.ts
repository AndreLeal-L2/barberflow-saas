import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideCalendarCheck,
  LucideCalendarDays,
  LucideCheck,
  LucideClock,
  LucideMapPin,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';
import {
  AvailableSlot,
  Booking,
  CatalogService,
  PublicBarbershop,
} from '../../core/booking.models';
import { LanguageSwitcher } from '../../components/language-switcher/language-switcher';
import { LanguageService } from '../../core/language.service';
import { PHONE_NUMBER_PATTERN } from '../../core/phone-number';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-public-booking',
  imports: [
    LanguageSwitcher,
    TranslatePipe,
    ThemeToggle,
    CurrencyPipe,
    LucideCalendarCheck,
    LucideCalendarDays,
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
  readonly i18n = inject(LanguageService);
  private readonly api = inject(BookingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly bookingSlug = input('');
  readonly initialDate = input('');
  readonly initialTime = input('');
  readonly embedded = input(false);
  readonly booked = output<Booking>();
  private get slug(): string {
    return this.bookingSlug() || this.route.snapshot.paramMap.get('slug') || '';
  }
  readonly activeStep = signal<1 | 2 | 3>(1);
  private slotRequestId = 0;

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

  private readonly localDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Lisbon',
    dateStyle: 'short',
  }).format(new Date());
  readonly today = computed(() => this.shop()?.bookingStartDate ?? this.localDate);
  readonly maxDate = computed(
    () => this.shop()?.bookingEndDate ?? this.calendarDay(this.today(), 60).toISOString().slice(0, 10),
  );
  readonly quickDates = computed(() => this.buildQuickDates());
  readonly form = this.formBuilder.group({
    customerName: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.pattern(/^[^\u0000-\u001F\u007F-\u009F]+$/u),
        Validators.maxLength(120),
      ],
    ],
    customerPhone: ['', [Validators.required, Validators.pattern(PHONE_NUMBER_PATTERN)]],
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
    if (this.submitting()) return;
    this.activeStep.set(2);
    if (!this.selectedDate() && this.initialDate()) this.selectedDate.set(this.initialDate());
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
    this.selectDate(date);
  }

  goToStep(step: 1 | 2 | 3): void {
    if (
      this.submitting() ||
      (step >= 2 && !this.selectedService()) ||
      (step === 3 && !this.selectedSlot())
    )
      return;
    this.activeStep.set(step);
  }

  selectDate(date: string): void {
    if (this.submitting()) return;
    if (date === this.selectedDate()) {
      return;
    }

    this.activeStep.set(2);
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.slotError.set(null);
    this.slotRequestId += 1;
    this.loadingSlots.set(false);
    if (date && this.selectedService()) {
      this.loadSlots();
    }
  }

  selectSlot(slot: AvailableSlot): void {
    if (this.submitting()) return;
    this.selectedSlot.set(slot);
    this.activeStep.set(3);
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
        next: (booking) => {
          this.confirmation.set(booking);
          this.booked.emit(booking);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.errorMessage(error));
          if ((error.error as Partial<ApiError> | null)?.code === 'BOOKING_SLOT_UNAVAILABLE') {
            this.activeStep.set(2);
            this.selectedSlot.set(null);
            this.slots.set([]);
            this.loadSlots();
          }
        },
      });
  }

  startAnotherBooking(): void {
    if (this.submitting()) return;
    this.activeStep.set(1);
    this.confirmation.set(null);
    this.selectedService.set(null);
    this.selectedDate.set('');
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.slotRequestId += 1;
    this.loadingSlots.set(false);
    this.slotError.set(null);
    this.error.set(null);
    this.form.reset({ customerName: '', customerPhone: '', customerEmail: '' });
  }

  dateLabel(date: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(this.calendarDay(date));
  }

  timeLabel(dateTime: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateTime));
  }

  loadSlots(): void {
    const service = this.selectedService();
    const date = this.selectedDate();
    if (!service || !date) {
      return;
    }

    const requestId = ++this.slotRequestId;
    const serviceId = service.id;
    this.slotError.set(null);
    this.loadingSlots.set(true);
    this.api
      .getAvailableSlots(this.slug, service.id, date)
      .pipe(
        finalize(() => {
          if (requestId === this.slotRequestId) {
            this.loadingSlots.set(false);
          }
        }),
      )
      .subscribe({
        next: (slots) => {
          if (requestId === this.slotRequestId) {
            this.slots.set(slots);
            const preferred = slots.find(
              (slot) => slot.startAt.slice(11, 16) === this.initialTime(),
            );
            if (preferred && this.embedded()) this.selectSlot(preferred);
          }
        },
        error: () => {
          if (requestId === this.slotRequestId && this.selectedService()?.id === serviceId) {
            this.slotError.set('Não foi possível consultar os horários.');
          }
        },
      });
  }

  private buildQuickDates(): ReadonlyArray<{
    value: string;
    weekday: string;
    day: string;
    month: string;
  }> {
    const today = this.today();
    const locale = this.i18n.locale();
    const timeZone = 'UTC';
    return Array.from({ length: 7 }, (_, index) => {
      const date = this.calendarDay(today, index);

      return {
        value: date.toISOString().slice(0, 10),
        weekday:
          index === 0
            ? this.i18n.translate('Hoje')
            : new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone })
                .format(date)
                .replace('.', ''),
        day: new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone }).format(date),
        month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone })
          .format(date)
          .replace('.', ''),
      };
    });
  }

  private calendarDay(date: string, days = 0): Date {
    const day = new Date(`${date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + days);
    return day;
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível concluir a marcação.';
  }
}
