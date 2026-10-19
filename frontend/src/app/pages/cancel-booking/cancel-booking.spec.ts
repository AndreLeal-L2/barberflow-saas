import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { MessageResponse } from '../../core/auth.models';
import { LanguageService } from '../../core/language.service';
import { CancelBooking } from './cancel-booking';

describe('CancelBooking', () => {
  const api = { cancelPublicBooking: vi.fn() };
  const route = { snapshot: { queryParamMap: convertToParamMap({ token: 'cancel-token' }) } };

  beforeEach(async () => {
    vi.resetAllMocks();
    route.snapshot.queryParamMap = convertToParamMap({ token: 'cancel-token' });
    api.cancelPublicBooking.mockReturnValue(of({ message: 'A marcação foi cancelada.' }));
    await TestBed.configureTestingModule({
      imports: [CancelBooking],
      providers: [
        provideRouter([]),
        { provide: BookingApiService, useValue: api },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('does not request a cancellation when the token is missing', () => {
    route.snapshot.queryParamMap = convertToParamMap({});
    const fixture = TestBed.createComponent(CancelBooking);
    fixture.detectChanges();
    fixture.componentInstance.cancel();

    expect(api.cancelPublicBooking).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.button-danger').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'O link de cancelamento está incompleto.',
    );
  });

  it('requires explicit confirmation and prevents duplicate requests while pending', () => {
    const pending = new Subject<MessageResponse>();
    api.cancelPublicBooking.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(CancelBooking);
    fixture.detectChanges();
    expect(api.cancelPublicBooking).not.toHaveBeenCalled();
    const confirmation = fixture.nativeElement.querySelector('.button-danger') as HTMLButtonElement;
    confirmation.click();
    fixture.componentInstance.cancel();
    fixture.detectChanges();

    expect(api.cancelPublicBooking).toHaveBeenCalledExactlyOnceWith('cancel-token');
    expect(confirmation.disabled).toBe(true);
    pending.next({ message: 'A marcação foi cancelada.' });
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.button-danger')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('A marcação foi cancelada.');
  });

  it('keeps the confirmation available for retry after a server failure', () => {
    const pending = new Subject<MessageResponse>();
    api.cancelPublicBooking.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(CancelBooking);
    fixture.detectChanges();
    fixture.componentInstance.cancel();
    pending.error(
      new HttpErrorResponse({ status: 503, error: { message: 'Serviço indisponível.' } }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.querySelector('.button-danger').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço indisponível.',
    );
    fixture.componentInstance.cancel();
    expect(api.cancelPublicBooking).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.success()).toBe('A marcação foi cancelada.');
  });
});
