import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { AvailabilityDay, BlockedTime } from '../../core/booking.models';
import { LanguageService } from '../../core/language.service';
import { Availability } from './availability';

describe('Availability', () => {
  const monday: AvailabilityDay = {
    dayOfWeek: 'MONDAY',
    startTime: '10:00',
    endTime: '19:00',
  };
  let scheduleRequest: Subject<AvailabilityDay[]>;
  let blocksRequest: Subject<BlockedTime[]>;
  const api = {
    getAvailability: vi.fn(),
    listBlockedTimes: vi.fn(),
    updateAvailability: vi.fn((_schedule: AvailabilityDay[]) => of([])),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    scheduleRequest = new Subject<AvailabilityDay[]>();
    blocksRequest = new Subject<BlockedTime[]>();
    api.getAvailability.mockReturnValue(scheduleRequest);
    api.listBlockedTimes.mockReturnValue(blocksRequest);
    await TestBed.configureTestingModule({
      imports: [Availability],
      providers: [{ provide: BookingApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('cannot save while the weekly schedule is still loading', () => {
    const fixture = TestBed.createComponent(Availability);
    fixture.detectChanges();
    blocksRequest.next([]);
    blocksRequest.complete();
    fixture.detectChanges();

    fixture.componentInstance.save();

    const saveButton = fixture.nativeElement.querySelector('.page-heading button');
    expect(saveButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.schedule-list')).toBeNull();
    expect(api.updateAvailability).not.toHaveBeenCalled();
  });

  it('cannot submit the default empty week after the schedule request fails', () => {
    const fixture = TestBed.createComponent(Availability);
    fixture.detectChanges();
    scheduleRequest.error(new Error('Schedule unavailable'));
    blocksRequest.next([]);
    blocksRequest.complete();
    fixture.detectChanges();

    fixture.componentInstance.save();

    const saveButton = fixture.nativeElement.querySelector('.page-heading button');
    expect(saveButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.schedule-list')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os horários.');
    expect(api.updateAvailability).not.toHaveBeenCalled();
  });

  it('keeps a loaded schedule editable when blocked times cannot be loaded', () => {
    const fixture = TestBed.createComponent(Availability);
    fixture.detectChanges();
    scheduleRequest.next([monday]);
    scheduleRequest.complete();
    blocksRequest.error(new Error('Blocked times unavailable'));
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.page-heading button');
    expect(saveButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.day-toggle input').checked).toBe(true);
    expect(fixture.nativeElement.querySelector('input[type="time"]').value).toBe('10:00');
    fixture.componentInstance.save();

    expect(api.updateAvailability).toHaveBeenCalledExactlyOnceWith([monday]);
  });

  it('can intentionally close every day after successfully loading the saved schedule', () => {
    const fixture = TestBed.createComponent(Availability);
    fixture.detectChanges();
    scheduleRequest.next([monday]);
    scheduleRequest.complete();
    blocksRequest.next([]);
    blocksRequest.complete();
    fixture.componentInstance.dayControls.forEach((day) => day.controls.enabled.setValue(false));
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.page-heading button');
    expect(saveButton.disabled).toBe(false);
    saveButton.click();

    expect(api.updateAvailability).toHaveBeenCalledExactlyOnceWith([]);
  });
});
