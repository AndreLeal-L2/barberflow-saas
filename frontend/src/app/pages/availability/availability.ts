import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideSave } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { AvailabilityDay, DayOfWeek } from '../../core/booking.models';

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
  imports: [LucideSave, ReactiveFormsModule],
  templateUrl: './availability.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Availability implements OnInit {
  private readonly api = inject(BookingApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
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
  readonly dayControls = this.form.controls.days.controls;

  ngOnInit(): void {
    this.api
      .getAvailability()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (schedule) => this.applySchedule(schedule),
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
    return apiError?.message ?? 'Não foi possível guardar os horários.';
  }
}
