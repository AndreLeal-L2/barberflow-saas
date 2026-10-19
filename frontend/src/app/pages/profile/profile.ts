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
import { RouterLink } from '@angular/router';
import { LucideCircle, LucideCircleCheck, LucideExternalLink, LucideSave } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { BookingApiService } from '../../core/booking-api.service';
import { DashboardBarbershop } from '../../core/booking.models';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-profile',
  imports: [
    TranslatePipe,
    LucideCircle,
    LucideCircleCheck,
    LucideExternalLink,
    LucideSave,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {
  private readonly api = inject(BookingApiService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly shop = signal<DashboardBarbershop | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPublication = signal(false);
  readonly sendingVerification = signal(false);
  readonly checkingVerification = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly publicationError = signal<string | null>(null);
  readonly publicationSuccess = signal<string | null>(null);
  readonly verificationMessage = signal<string | null>(null);
  readonly verificationRequired = computed(() =>
    Boolean(this.auth.user()?.emailVerificationRequired),
  );
  readonly emailVerificationPending = computed(
    () => this.verificationRequired() && !this.auth.user()?.emailVerified,
  );
  readonly subscriptionAllowsPublication = computed(() => {
    const status = this.shop()?.subscriptionStatus;
    return status === 'TRIALING' || status === 'ACTIVE';
  });
  readonly canPublish = computed(
    () => Boolean(this.auth.user() && this.shop()?.canPublish) && !this.emailVerificationPending(),
  );
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
    if (
      this.form.invalid ||
      this.loading() ||
      !this.shop() ||
      this.saving() ||
      this.savingPublication()
    ) {
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
        error: (error: HttpErrorResponse) =>
          this.error.set(this.errorMessage(error, 'Não foi possível guardar os dados.')),
      });
  }

  togglePublication(): void {
    const shop = this.shop();
    if (
      !shop ||
      this.loading() ||
      this.saving() ||
      this.savingPublication() ||
      (!shop.published && !this.canPublish())
    ) {
      return;
    }

    const published = !shop.published;
    this.publicationError.set(null);
    this.publicationSuccess.set(null);
    this.savingPublication.set(true);
    this.api
      .updatePublication(published)
      .pipe(finalize(() => this.savingPublication.set(false)))
      .subscribe({
        next: (updated) => {
          this.shop.set(updated);
          this.publicationSuccess.set(
            updated.published
              ? 'Página publicada. Já pode partilhar o seu link.'
              : 'Marcações pausadas.',
          );
        },
        error: (error: HttpErrorResponse) =>
          this.publicationError.set(
            this.errorMessage(error, 'Não foi possível atualizar a publicação.'),
          ),
      });
  }

  resendVerification(): void {
    if (
      !this.emailVerificationPending() ||
      this.sendingVerification() ||
      this.checkingVerification()
    ) {
      return;
    }

    this.verificationMessage.set(null);
    this.publicationError.set(null);
    this.sendingVerification.set(true);
    this.auth
      .resendVerification()
      .pipe(finalize(() => this.sendingVerification.set(false)))
      .subscribe({
        next: (response) => this.verificationMessage.set(response.message),
        error: (error: HttpErrorResponse) =>
          this.publicationError.set(
            this.errorMessage(error, 'Não foi possível enviar um novo link.'),
          ),
      });
  }

  recheckVerification(): void {
    if (
      !this.emailVerificationPending() ||
      this.checkingVerification() ||
      this.sendingVerification()
    ) {
      return;
    }

    this.verificationMessage.set(null);
    this.publicationError.set(null);
    this.checkingVerification.set(true);
    this.auth
      .loadCurrentUser(true)
      .pipe(finalize(() => this.checkingVerification.set(false)))
      .subscribe({
        next: (user) => {
          if (!user) {
            this.publicationError.set('A sessão expirou. Entre novamente.');
            return;
          }

          this.verificationMessage.set(
            user.emailVerified
              ? 'E-mail confirmado com sucesso.'
              : user.emailVerificationRequired
                ? 'A confirmação continua pendente. Abra o link enviado para o seu e-mail e tente novamente.'
                : 'A confirmação de e-mail não é necessária.',
          );
        },
        error: (error: HttpErrorResponse) =>
          this.publicationError.set(
            this.errorMessage(
              error,
              'Não foi possível atualizar a confirmação do e-mail. Tente novamente.',
            ),
          ),
      });
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    const apiError = error.error as Partial<ApiError> | null;
    return apiError?.message ?? fallback;
  }
}
