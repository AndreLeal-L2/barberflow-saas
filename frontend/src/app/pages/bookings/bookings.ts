import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  viewChild,
  OnDestroy,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  LucideCalendarCheck,
  LucideCalendarDays,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideList,
  LucidePlus,
  LucideRefreshCw,
  LucideX,
} from '@lucide/angular';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';
import { PublicBooking } from '../public-booking/public-booking';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { TranslatePipe } from '../../core/translate.pipe';
import { LanguageService } from '../../core/language.service';
import { ThemeService } from '../../core/theme.service';
import { ShopAppearanceService } from '../../core/shop-appearance.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AvailabilityDay,
  BlockedTime,
  Booking,
  BookingStatus,
  DayOfWeek,
  DashboardBarbershop,
} from '../../core/booking.models';

type BookingFilter = 'UPCOMING' | 'HISTORY';
type BookingView = 'CALENDAR' | 'LIST';
type CalendarItemKind = 'booking' | 'block';

interface CalendarRange {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

interface CalendarTimeSlot {
  minutes: number;
  label: string;
  top: number;
  isHour: boolean;
}

interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  booking: Booking | null;
  block: BlockedTime | null;
  title: string;
  subtitle: string;
  meta: string;
  status: BookingStatus | null;
  top: number;
  height: number;
}

interface CalendarLane {
  id: string;
  label: string;
  initials: string;
  items: CalendarItem[];
}

const BOOKING_VIEW_KEY = 'barberflow.bookings.view';
const FALLBACK_START_MINUTES = 9 * 60;
const FALLBACK_END_MINUTES = 19 * 60;
const SLOT_MINUTES = 30;
const WEEK_DAYS_BY_DATE_INDEX: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

@Component({
  selector: 'app-bookings',
  imports: [
    TranslatePipe,
    RouterLink,
    PublicBooking,
    CurrencyPipe,
    DatePipe,
    LucideCalendarCheck,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideList,
    LucidePlus,
    LucideRefreshCw,
    LucideX,
  ],
  templateUrl: './bookings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bookings implements OnInit, OnDestroy {
  readonly i18n = inject(LanguageService);
  private readonly api = inject(BookingApiService);
  private readonly appearance = inject(ShopAppearanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly today = this.toDateInput(new Date());

  readonly shop = signal<DashboardBarbershop | null>(null);
  readonly dialogOpen = signal(false);
  readonly draftTime = signal('');
  readonly detailId = signal<string | null>(null);
  readonly detailBooking = computed(
    () => this.bookings().find((booking) => booking.id === this.detailId()) ?? null,
  );
  readonly bookingDialog = viewChild<ElementRef<HTMLDialogElement>>('bookingDialog');
  readonly detailDialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');
  readonly bookingEditor = viewChild(PublicBooking);
  private readonly refreshOnFocus = () => this.reload();
  private refresh?: Subscription;
  private page = 0;
  private readonly pageSize = 50;
  readonly hasMore = signal(false);

  ngOnDestroy(): void {
    window.removeEventListener('focus', this.refreshOnFocus);
    this.refresh?.unsubscribe();
  }

  openBooking(time = ''): void {
    if (!this.shop()?.published || this.loading()) return;
    this.draftTime.set(time);
    this.dialogOpen.set(true);
    this.bookingDialog()?.nativeElement.showModal();
  }

  closeBooking(event?: Event): void {
    event?.preventDefault();
    if (this.bookingEditor()?.submitting()) return;
    this.bookingDialog()?.nativeElement.close();
    this.dialogOpen.set(false);
  }

  bookingCreated(booking: Booking): void {
    this.bookings.update((items) => [booking, ...items.filter((item) => item.id !== booking.id)]);
  }

  showBooking(booking: Booking): void {
    this.detailId.set(booking.id);
    this.detailDialog()?.nativeElement.showModal();
  }

  slotIsFree(minutes: number, lane: CalendarLane): boolean {
    const start = `${this.selectedDate()}T${this.formatMinutes(minutes)}:00`;
    const end = new Date(new Date(start).getTime() + SLOT_MINUTES * 60_000);
    const schedule = this.selectedAvailability();
    return Boolean(
      this.shop()?.published &&
      schedule &&
      new Date(start).getTime() > Date.now() &&
      minutes >= this.timeToMinutes(schedule.startTime) &&
      minutes + SLOT_MINUTES <= this.timeToMinutes(schedule.endTime) &&
      !lane.items.some((item) => {
        if (item.status === 'CANCELLED') return false;
        const event = item.booking ?? item.block;
        return event && new Date(event.startAt) < end && new Date(event.endAt) > new Date(start);
      }),
    );
  }

  readonly bookings = signal<Booking[]>([]);
  readonly blockedTimes = signal<BlockedTime[]>([]);
  readonly availability = signal<AvailabilityDay[]>([]);
  readonly filter = signal<BookingFilter>('UPCOMING');
  readonly view = signal<BookingView>(
    this.readPreference(BOOKING_VIEW_KEY, 'CALENDAR', ['CALENDAR', 'LIST']),
  );
  readonly theme = inject(ThemeService).theme;
  readonly selectedDate = signal(this.today);
  readonly loading = signal(false);
  readonly updatingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly visibleBookings = computed(() => {
    const now = Date.now();
    return this.bookings().filter((booking) => {
      const isUpcoming = booking.status === 'CONFIRMED' && new Date(booking.endAt).getTime() >= now;
      return this.filter() === 'UPCOMING' ? isUpcoming : !isUpcoming;
    });
  });

  readonly calendarBookings = computed(() =>
    this.bookings()
      .filter(
        (booking) =>
          booking.status !== 'CANCELLED' &&
          this.overlapsSelectedDate(booking.startAt, booking.endAt),
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  );

  readonly calendarBlocks = computed(() =>
    this.blockedTimes()
      .filter((block) => this.overlapsSelectedDate(block.startAt, block.endAt))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  );

  readonly selectedAvailability = computed(() => {
    const day = this.dayOfWeek(this.selectedDate());
    return this.availability().find((item) => item.dayOfWeek === day) ?? null;
  });

  readonly calendarRange = computed(() => {
    const availability = this.selectedAvailability();
    let startMinutes = availability
      ? this.timeToMinutes(availability.startTime)
      : FALLBACK_START_MINUTES;
    let endMinutes = availability ? this.timeToMinutes(availability.endTime) : FALLBACK_END_MINUTES;

    const itemWindows = [
      ...this.calendarBookings().map((booking) =>
        this.clippedMinutes(booking.startAt, booking.endAt),
      ),
      ...this.calendarBlocks().map((block) => this.clippedMinutes(block.startAt, block.endAt)),
    ].filter((window): window is { startMinutes: number; endMinutes: number } => Boolean(window));

    if (itemWindows.length) {
      startMinutes = Math.min(
        startMinutes,
        this.floorToStep(Math.min(...itemWindows.map((window) => window.startMinutes)), 60),
      );
      endMinutes = Math.max(
        endMinutes,
        this.ceilToStep(Math.max(...itemWindows.map((window) => window.endMinutes)), 60),
      );
    }

    startMinutes = Math.max(0, this.floorToStep(startMinutes, SLOT_MINUTES));
    endMinutes = Math.min(24 * 60, this.ceilToStep(endMinutes, SLOT_MINUTES));
    if (endMinutes - startMinutes < 120) {
      endMinutes = Math.min(24 * 60, startMinutes + 120);
    }

    return {
      startMinutes,
      endMinutes,
      durationMinutes: Math.max(SLOT_MINUTES, endMinutes - startMinutes),
    };
  });

  readonly timeSlots = computed(() => {
    const range = this.calendarRange();
    const slots: CalendarTimeSlot[] = [];

    for (let minutes = range.startMinutes; minutes <= range.endMinutes; minutes += SLOT_MINUTES) {
      slots.push({
        minutes,
        label: this.formatMinutes(minutes),
        top: ((minutes - range.startMinutes) / range.durationMinutes) * 100,
        isHour: minutes % 60 === 0,
      });
    }

    return slots;
  });

  readonly calendarIntervals = computed(() => this.calendarRange().durationMinutes / SLOT_MINUTES);

  readonly calendarLanes = computed(() => {
    const range = this.calendarRange();
    const lanes = new Map<string, CalendarLane>();

    for (const booking of this.calendarBookings()) {
      const lane = this.ensureLane(lanes, booking.barberId, booking.barberName);
      const item = this.bookingCalendarItem(booking, range);
      if (item) {
        lane.items.push(item);
      }
    }

    for (const block of this.calendarBlocks()) {
      const lane = this.ensureLane(lanes, block.barberId, block.barberName);
      const item = this.blockCalendarItem(block, range);
      if (item) {
        lane.items.push(item);
      }
    }

    if (!lanes.size) {
      lanes.set('agenda', {
        id: 'agenda',
        label: 'Agenda',
        initials: 'AG',
        items: [],
      });
    }

    return [...lanes.values()]
      .map((lane) => ({
        ...lane,
        items: lane.items.sort((a, b) => a.top - b.top),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, this.i18n.locale()));
  });

  readonly calendarGridColumns = computed(
    () => `var(--calendar-time-width) repeat(${this.calendarLanes().length}, minmax(228px, 1fr))`,
  );

  readonly calendarItemCount = computed(
    () => this.calendarBookings().length + this.calendarBlocks().length,
  );

  readonly selectedDateLabel = computed(() => {
    const date = this.dateInputToDate(this.selectedDate());
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(date);
  });

  readonly selectedDateSummary = computed(() => {
    const bookings = this.calendarBookings().length;
    const blocks = this.calendarBlocks().length;
    const pieces = [
      `${bookings} ${this.i18n.translate(bookings === 1 ? 'marcação' : 'marcações')}`,
      `${blocks} ${this.i18n.translate(blocks === 1 ? 'bloqueio' : 'bloqueios')}`,
    ];
    const availability = this.selectedAvailability();

    if (availability) {
      pieces.push(`${availability.startTime.slice(0, 5)}-${availability.endTime.slice(0, 5)}`);
    } else {
      pieces.push(this.i18n.translate('sem horário configurado'));
    }

    return pieces.join(' · ');
  });

  ngOnInit(): void {
    this.reload();
    window.addEventListener('focus', this.refreshOnFocus);
  }

  reload(replacePending = false, append = false): void {
    if (this.dialogOpen() || this.updatingId() || (this.loading() && !replacePending)) return;
    this.refresh?.unsubscribe();
    if (!append) this.page = 0;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getBarbershop()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (shop) => {
        this.shop.set(shop);
        this.appearance.update(shop);
      }, error: () => this.shop.set(null) });
    const date = this.selectedDate();
    const query = this.view() === 'CALENDAR'
      ? { from: date, to: this.toDateInput(this.dateBoundaries(date).end) }
      : { view: this.filter() === 'HISTORY' ? 'history' : 'upcoming', page: this.page, size: this.pageSize };
    this.refresh = forkJoin({
      bookings: this.api.listBookings(query),
      blockedTimes: this.api.listBlockedTimes(),
      availability: this.api.getAvailability(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ bookings, blockedTimes, availability }) => {
          const paginated = this.view() === 'LIST';
          this.hasMore.set(paginated && bookings.length > this.pageSize);
          const items = paginated ? bookings.slice(0, this.pageSize) : bookings;
          this.bookings.update((previous) => append ? [...previous, ...items] : items);
          this.blockedTimes.set(blockedTimes);
          this.availability.set(availability);
        },
        error: () => {
          if (append) this.page--;
          this.error.set('Não foi possível carregar as marcações.');
        },
      });
  }

  setFilter(filter: BookingFilter): void {
    if (filter === this.filter()) return;
    this.filter.set(filter);
    if (this.view() === 'LIST') this.reload(true);
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;
    this.page++;
    this.reload(false, true);
  }

  setView(view: BookingView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.storePreference(BOOKING_VIEW_KEY, view);
    this.reload(true);
  }

  selectToday(): void {
    this.selectedDate.set(this.today);
    this.reload(true);
  }

  moveDate(days: number): void {
    const date = this.dateInputToDate(this.selectedDate());
    date.setDate(date.getDate() + days);
    this.selectedDate.set(this.toDateInput(date));
    this.reload(true);
  }

  selectDate(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedDate.set(value);
      this.reload(true);
    }
  }

  canComplete(booking: Booking): boolean {
    return booking.status === 'CONFIRMED' && new Date(booking.startAt).getTime() <= Date.now();
  }

  updateStatus(booking: Booking, status: BookingStatus): void {
    if (this.updatingId() || this.loading()) {
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

  calendarStatusLabel(item: CalendarItem): string {
    return item.kind === 'block' ? 'Bloqueado' : this.statusLabel(item.status ?? 'CONFIRMED');
  }

  private bookingCalendarItem(booking: Booking, range: CalendarRange): CalendarItem | null {
    const window = this.clippedMinutes(booking.startAt, booking.endAt);
    if (!window) {
      return null;
    }

    return this.positionedItem(
      {
        id: booking.id,
        kind: 'booking',
        booking,
        block: null,
        title: booking.customerName,
        subtitle: booking.serviceName,
        meta: `${this.formatDateTime(booking.startAt)}-${this.formatDateTime(booking.endAt)} · ${
          booking.serviceDurationMinutes
        } min`,
        status: booking.status,
      },
      window,
      range,
    );
  }

  private blockCalendarItem(block: BlockedTime, range: CalendarRange): CalendarItem | null {
    const window = this.clippedMinutes(block.startAt, block.endAt);
    if (!window) {
      return null;
    }

    return this.positionedItem(
      {
        id: block.id,
        kind: 'block',
        booking: null,
        block,
        title: this.i18n.translate('BLOQUEADO'),
        subtitle: block.reason || this.i18n.translate('Indisponível'),
        meta: block.fullDay
          ? this.i18n.translate('Dia completo')
          : `${this.formatDateTime(block.startAt)}-${this.formatDateTime(block.endAt)}`,
        status: null,
      },
      window,
      range,
    );
  }

  private positionedItem(
    item: Omit<CalendarItem, 'top' | 'height'>,
    window: { startMinutes: number; endMinutes: number },
    range: CalendarRange,
  ): CalendarItem | null {
    const startMinutes = Math.max(window.startMinutes, range.startMinutes);
    const endMinutes = Math.min(window.endMinutes, range.endMinutes);
    if (endMinutes <= startMinutes) {
      return null;
    }

    return {
      ...item,
      top: ((startMinutes - range.startMinutes) / range.durationMinutes) * 100,
      height: Math.max(4, ((endMinutes - startMinutes) / range.durationMinutes) * 100),
    };
  }

  private ensureLane(
    lanes: Map<string, CalendarLane>,
    barberId: string | undefined,
    barberName: string | undefined,
  ): CalendarLane {
    const label = barberName?.trim() || 'Agenda';
    const id = barberId || label.toLowerCase().replace(/\s+/g, '-');
    const existing = lanes.get(id);
    if (existing) {
      return existing;
    }

    const lane = {
      id,
      label,
      initials: this.initials(label),
      items: [],
    };
    lanes.set(id, lane);
    return lane;
  }

  private overlapsSelectedDate(startAt: string, endAt: string): boolean {
    const start = this.parseLocalDateTime(startAt);
    const end = this.parseLocalDateTime(endAt);
    if (!start || !end) {
      return false;
    }

    const boundaries = this.dateBoundaries(this.selectedDate());
    return start < boundaries.end && end > boundaries.start;
  }

  private clippedMinutes(
    startAt: string,
    endAt: string,
  ): { startMinutes: number; endMinutes: number } | null {
    const start = this.parseLocalDateTime(startAt);
    const end = this.parseLocalDateTime(endAt);
    if (!start || !end) {
      return null;
    }

    const boundaries = this.dateBoundaries(this.selectedDate());
    if (start >= boundaries.end || end <= boundaries.start) {
      return null;
    }

    const clippedStart = new Date(Math.max(start.getTime(), boundaries.start.getTime()));
    const clippedEnd = new Date(Math.min(end.getTime(), boundaries.end.getTime()));
    const startMinutes = this.minutesFromDate(clippedStart);
    const endMinutes =
      clippedEnd.getTime() >= boundaries.end.getTime() ? 24 * 60 : this.minutesFromDate(clippedEnd);

    return { startMinutes, endMinutes };
  }

  private dayOfWeek(dateInput: string): DayOfWeek {
    return WEEK_DAYS_BY_DATE_INDEX[this.dateInputToDate(dateInput).getDay()];
  }

  private dateBoundaries(dateInput: string): { start: Date; end: Date } {
    const date = this.dateInputToDate(dateInput);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return { start, end };
  }

  private dateInputToDate(dateInput: string): Date {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private parseLocalDateTime(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private minutesFromDate(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  private formatDateTime(value: string): string {
    const parsed = this.parseLocalDateTime(value);
    return parsed ? this.formatMinutes(this.minutesFromDate(parsed)) : value.slice(11, 16);
  }

  private floorToStep(value: number, step: number): number {
    return Math.floor(value / step) * step;
  }

  private ceilToStep(value: number, step: number): number {
    return Math.ceil(value / step) * step;
  }

  private initials(label: string): string {
    return label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private readPreference<T extends string>(key: string, fallback: T, options: readonly T[]): T {
    try {
      if (typeof localStorage === 'undefined') {
        return fallback;
      }
      const value = localStorage.getItem(key);
      return options.includes(value as T) ? (value as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private storePreference(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Preference persistence is optional; the agenda works without it.
    }
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível atualizar a marcação.';
  }
}
