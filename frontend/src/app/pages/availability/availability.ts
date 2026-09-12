import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCalendarOff, LucidePlus, LucideSave, LucideTrash2 } from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { AvailabilityDay, BlockedTime, DayOfWeek } from '../../core/booking.models';

const WEEK_DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Terça-feira' },
  { value: 'WEDNESDAY', label: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

@Component({
  selector: 'app-availability',
  imports: [DatePipe, LucideCalendarOff, LucidePlus, LucideSave, LucideTrash2, ReactiveFormsModule],
  templateUrl: './availability.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Availability implements OnInit {
  private readonly api = inject(BookingApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly creatingBlock = signal(false);
  readonly deletingBlockId = signal<string | null>(null);
  readonly confirmingBlockId = signal<string | null>(null);
  readonly blocks = signal<BlockedTime[]>([]);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly today = this.toDateInput(new Date());
  readonly maxBlockDate = this.toDateInput(new Date(Date.now() + 366 * 24 * 60 * 60 * 1000));
  readonly form = this.formBuilder.group({
    days: this.formBuilder.array(
      WEEK_DAYS.map((day) =>
        this.formBuilder.group({
          dayOfWeek: [day.value],
          enabled: [false],
          startTime: ['09:00'],
          endTime: ['18:00'],
        }),
      ),
    ),
  });
  readonly blockForm = this.formBuilder.group({
    date: [this.today, Validators.required],
    fullDay: [true],
    startTime: ['09:00'],
    endTime: ['18:00'],
    reason: ['', Validators.maxLength(255)],
  });
  readonly dayControls = this.form.controls.days.controls;

  ngOnInit(): void {
    forkJoin({
      schedule: this.api.getAvailability(),
      blocks: this.api.listBlockedTimes(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ schedule, blocks }) => {
          this.applySchedule(schedule);
          this.blocks.set(blocks);
        },
        error: () => this.error.set('Não foi possível carregar os horários.'),
      });
  }

  dayLabel(day: DayOfWeek): string {
    return WEEK_DAYS.find((item) => item.value === day)?.label ?? day;
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    const selected = this.form.getRawValue().days.filter((day) => day.enabled);
    if (selected.some((day) => day.endTime <= day.startTime)) {
      this.error.set('A hora de fecho deve ser posterior à hora de abertura.');
      return;
    }

    const request: AvailabilityDay[] = selected.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime,
      endTime: day.endTime,
    }));

    this.error.set(null);
    this.success.set(null);
    this.saving.set(true);
    this.api
      .updateAvailability(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.success.set('Horário semanal guardado.'),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  createBlock(): void {
    this.blockForm.markAllAsTouched();
    if (this.blockForm.invalid || this.creatingBlock()) {
      return;
    }

    const value = this.blockForm.getRawValue();
    if (!value.fullDay && value.endTime <= value.startTime) {
      this.error.set('A hora final deve ser posterior à hora inicial.');
      return;
    }

    const startAt = value.fullDay
      ? value.date + 'T00:00:00'
      : value.date + 'T' + value.startTime + ':00';
    const endAt = value.fullDay
      ? this.nextDate(value.date) + 'T00:00:00'
      : value.date + 'T' + value.endTime + ':00';

    this.error.set(null);
    this.success.set(null);
    this.creatingBlock.set(true);
    this.api
      .createBlockedTime({ startAt, endAt, reason: value.reason })
      .pipe(finalize(() => this.creatingBlock.set(false)))
      .subscribe({
        next: (created) => {
          this.blocks.update((blocks) =>
            [...blocks, created].sort((a, b) => a.startAt.localeCompare(b.startAt)),
          );
          this.blockForm.controls.reason.reset('');
          this.success.set('Indisponibilidade adicionada.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  confirmBlockDelete(id: string): void {
    this.confirmingBlockId.set(id);
  }

  cancelBlockDelete(): void {
    this.confirmingBlockId.set(null);
  }

  deleteBlock(id: string): void {
    if (this.deletingBlockId()) {
      return;
    }

    this.error.set(null);
    this.success.set(null);
    this.deletingBlockId.set(id);
    this.api
      .deleteBlockedTime(id)
      .pipe(finalize(() => this.deletingBlockId.set(null)))
      .subscribe({
        next: () => {
          this.blocks.update((blocks) => blocks.filter((block) => block.id !== id));
          this.confirmingBlockId.set(null);
          this.success.set('Indisponibilidade removida.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  private applySchedule(schedule: AvailabilityDay[]): void {
    this.dayControls.forEach((control) => {
      const saved = schedule.find((day) => day.dayOfWeek === control.controls.dayOfWeek.value);
      control.patchValue({
        enabled: Boolean(saved),
        startTime: saved?.startTime.slice(0, 5) ?? '09:00',
        endTime: saved?.endTime.slice(0, 5) ?? '18:00',
      });
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível atualizar a disponibilidade.';
  }

  private nextDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return this.toDateInput(new Date(year, month - 1, day + 1));
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
