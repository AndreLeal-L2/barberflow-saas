import { of } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DashboardLayout } from './dashboard-layout';

describe('Public page shortcuts', () => {
  const writeText = vi.fn();
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  beforeEach(async () => {
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: BookingApiService, useValue: { getBarbershop: () => of({ logoUrl: null }) } },
        {
          provide: AuthService,
          useValue: {
            user: signal({
              name: 'Profissional exemplo',
              email: 'owner@example.test',
              barbershop: { name: 'Estúdio', slug: 'studio' },
            }),
          },
        },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  afterEach(() => {
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('copies the current business link and offers a direct page preview', async () => {
    writeText.mockResolvedValue(undefined);
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();
    await fixture.componentInstance.copyLink();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(window.location.origin + '/b/studio');
    expect(fixture.nativeElement.querySelector('.share-link').textContent).toContain(
      'Link copiado',
    );
    expect(fixture.nativeElement.querySelector('a[target="_blank"]').getAttribute('href')).toBe(
      window.location.origin + '/b/studio',
    );
  });

  it('lets a page that loads the business own that request even when its chunk loads later', () => {
    const api = TestBed.inject(BookingApiService);
    const read = vi.spyOn(api, 'getBarbershop');
    vi.spyOn(TestBed.inject(ActivatedRoute), 'firstChild', 'get').mockReturnValue({
      snapshot: { data: { loadsBarbershop: true } },
    } as unknown as ActivatedRoute);
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();
    expect(read).not.toHaveBeenCalled();
  });

  it('offers a selectable URL if clipboard access is denied', async () => {
    writeText.mockRejectedValue(new Error('Permission denied'));
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();
    await fixture.componentInstance.copyLink();
    fixture.detectChanges();
    const fallback = fixture.nativeElement.querySelector(
      '.copy-fallback input',
    ) as HTMLInputElement;
    expect(fallback.value).toBe(window.location.origin + '/b/studio');
    expect(fallback.readOnly).toBe(true);
  });
  it('clears a previous copy confirmation when a later copy fails', async () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    writeText
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Permission denied'));
    await fixture.componentInstance.copyLink();
    expect(fixture.componentInstance.copied()).toBe(true);
    await fixture.componentInstance.copyLink();
    expect(fixture.componentInstance.copied()).toBe(false);
    expect(fixture.componentInstance.copyError()).toBe(true);
  });
});
