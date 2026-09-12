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
import { LucideExternalLink, LucideSave } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { BookingApiService } from '../../core/booking-api.service';
import { DashboardBarbershop } from '../../core/booking.models';

@Component({
  selector: 'app-profile',
  imports: [LucideExternalLink, LucideSave, ReactiveFormsModule],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {
  private readonly api = inject(BookingApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly shop = signal<DashboardBarbershop | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly publicUrl = computed(() => {
    const slug = this.shop()?.slug;
    return slug ? window.location.origin + '/b/' + slug : '';
  });

  readonly form = this.formBuilder.group({
    publicDescription: ['', Validators.maxLength(500)],
    publicAddress: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    this.api
      .getBarbershop()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (shop) => {
          this.shop.set(shop);
          this.form.setValue({
            publicDescription: shop.publicDescription ?? '',
            publicAddress: shop.publicAddress ?? '',
          });
        },
        error: () => this.error.set('Não foi possível carregar os dados da barbearia.'),
      });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }

    this.error.set(null);
    this.success.set(null);
    this.saving.set(true);
    this.api
      .updateProfile(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (shop) => {
          this.shop.set(shop);
          this.success.set('Página pública atualizada.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? 'Não foi possível guardar os dados.';
  }
}
