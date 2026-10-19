import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { CatalogService } from '../../core/booking.models';
import { LanguageService } from '../../core/language.service';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-services',
  imports: [
    TranslatePipe,
    CurrencyPipe,
    LucidePencil,
    LucidePlus,
    LucideTrash2,
    LucideX,
    ReactiveFormsModule,
  ],
  templateUrl: './services.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Services implements OnInit {
  readonly i18n = inject(LanguageService);
  private readonly api = inject(BookingApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly services = signal<CatalogService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly mutating = computed(() => this.saving() || this.removingId() !== null);
  readonly error = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
    durationMinutes: [30, [Validators.required, Validators.min(15), Validators.max(480)]],
    priceAmount: [15, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.api
      .listServices()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (services) => this.services.set(services),
        error: () => this.error.set('Não foi possível carregar os serviços.'),
      });
  }

  edit(service: CatalogService): void {
    if (this.mutating()) {
      return;
    }
    this.editingId.set(service.id);
    this.deletingId.set(null);
    this.form.setValue({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
    });
  }

  cancelEdit(): void {
    if (this.mutating()) {
      return;
    }
    this.editingId.set(null);
    this.resetForm();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading() || this.mutating()) {
      return;
    }

    this.error.set(null);
    this.saving.set(true);
    const id = this.editingId();
    const request = this.form.getRawValue();
    this.form.disable({ emitEvent: false });
    const operation = id ? this.api.updateService(id, request) : this.api.createService(request);

    operation
      .pipe(
        finalize(() => {
          this.form.enable({ emitEvent: false });
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (saved) => {
          this.services.update((current) =>
            [...current.filter((service) => service.id !== saved.id), saved].sort((a, b) =>
              a.name.localeCompare(b.name, 'pt'),
            ),
          );
          this.editingId.set(null);
          this.resetForm();
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  confirmDelete(id: string): void {
    if (this.mutating()) {
      return;
    }
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    if (this.mutating()) {
      return;
    }
    this.deletingId.set(null);
  }

  remove(id: string): void {
    if (this.mutating()) {
      return;
    }
    this.error.set(null);
    this.removingId.set(id);
    this.api
      .deleteService(id)
      .pipe(finalize(() => this.removingId.set(null)))
      .subscribe({
        next: () => {
          this.services.update((current) => current.filter((service) => service.id !== id));
          this.deletingId.set(null);
          if (this.editingId() === id) {
            this.editingId.set(null);
            this.resetForm();
          }
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      description: '',
      durationMinutes: 30,
      priceAmount: 15,
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível guardar o serviço.';
  }
}
