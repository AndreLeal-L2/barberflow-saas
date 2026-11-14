import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideCircle, LucideCircleCheck, LucideExternalLink, LucideSave } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { BookingApiService } from '../../core/booking-api.service';
import { ShopAppearanceService } from '../../core/shop-appearance.service';
import { DashboardBarbershop, ShopImageKind } from '../../core/booking.models';
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
  readonly imageKinds: ShopImageKind[] = ['cover', 'logo'];
  readonly section = signal<'PUBLICATION' | 'DETAILS' | 'APPEARANCE'>('PUBLICATION');
  readonly appearance = inject(ShopAppearanceService);
  readonly imageBusy = signal<ShopImageKind | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly imageSuccess = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (shop) => {
          this.shop.set(shop);
          this.appearance.update(shop);
          this.form.setValue({
            publicDescription: shop.publicDescription ?? '',
            publicAddress: shop.publicAddress ?? '',
          });
        },
        error: () => this.error.set('Não foi possível carregar os dados da barbearia.'),
      });
  }

  uploadImage(kind: ShopImageKind, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.imageBusy() || this.saving() || this.savingPublication()) return;
    this.imageError.set(null);
    this.imageSuccess.set(null);
    this.success.set(null);
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.imageError.set('Escolha uma imagem PNG ou JPEG até 5 MB.');
      return;
    }
    this.imageBusy.set(kind);
    this.api
      .uploadImage(kind, file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.imageBusy.set(null)),
      )
      .subscribe({
        next: (shop) => this.applyImage(shop, 'Imagem atualizada.'),
        error: (error: HttpErrorResponse) =>
          this.imageError.set(this.errorMessage(error, 'Não foi possível enviar a imagem.')),
      });
  }

  removeImage(kind: ShopImageKind): void {
    if (this.imageBusy() || this.saving() || this.savingPublication()) return;
    this.imageError.set(null);
    this.imageSuccess.set(null);
    this.success.set(null);
    this.imageBusy.set(kind);
    this.api
      .removeImage(kind)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.imageBusy.set(null)),
      )
      .subscribe({
        next: (shop) => this.applyImage(shop, 'Imagem removida.'),
        error: (error: HttpErrorResponse) =>
          this.imageError.set(this.errorMessage(error, 'Não foi possível remover a imagem.')),
      });
  }

  private applyImage(shop: DashboardBarbershop, message: string): void {
    this.shop.set(shop);
    this.appearance.update(shop);
    this.imageSuccess.set(message);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      this.loading() ||
      !this.shop() ||
      this.saving() ||
      this.savingPublication() ||
      this.imageBusy()
    ) {
      return;
    }

    this.error.set(null);
    this.success.set(null);
    this.saving.set(true);
    this.api
      .updateProfile(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (shop) => {
          this.shop.set(shop);
          this.appearance.update(shop);
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
      this.imageBusy() ||
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingPublication.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.shop.set(updated);
          this.appearance.update(updated);
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
