import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideKeyRound } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmation')?.value
    ? null
    : { passwordsDoNotMatch: true };
}

@Component({
  selector: 'app-reset-password',
  imports: [LucideEye, LucideEyeOff, LucideKeyRound, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly submitting = signal(false);
  readonly error = signal<string | null>(
    this.token ? null : 'O link de recuperação está incompleto.',
  );
  readonly success = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly form = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(72)]],
      confirmation: ['', Validators.required],
    },
    { validators: matchingPasswords },
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (!this.token || this.form.invalid || this.submitting()) {
      return;
    }

    this.error.set(null);
    this.submitting.set(true);
    this.authService
      .resetPassword(this.token, this.form.getRawValue().password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => this.success.set(response.message),
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.error.set(apiError?.message ?? 'Não foi possível alterar a palavra-passe.');
        },
      });
  }
}
