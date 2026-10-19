import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { CatalogService } from '../../core/booking.models';
import { LanguageService } from '../../core/language.service';
import { Services } from './services';

registerLocaleData(localePt);

describe('Services management', () => {
  const haircut: CatalogService = {
    id: 'haircut',
    name: 'Corte',
    description: null,
    durationMinutes: 30,
    priceAmount: 15,
    priceCurrency: 'EUR',
  };
  const beard: CatalogService = {
    ...haircut,
    id: 'beard',
    name: 'Barba',
    durationMinutes: 15,
    priceAmount: 10,
  };
  const api = {
    listServices: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    api.listServices.mockReturnValue(of([haircut, beard]));
    api.createService.mockReturnValue(of(haircut));
    api.updateService.mockReturnValue(of(haircut));
    api.deleteService.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [Services],
      providers: [{ provide: BookingApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('pt-PT');
  });

  it('waits for the initial catalogue before allowing a service to be saved', () => {
    const initial = new Subject<CatalogService[]>();
    api.listServices.mockReturnValueOnce(initial);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.name.setValue('Corte novo');

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(api.createService).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('sends only one deletion while its confirmation is pending', () => {
    const pending = new Subject<void>();
    api.deleteService.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.confirmDelete(haircut.id);
    component.remove(haircut.id);
    fixture.detectChanges();
    component.remove(haircut.id);

    expect(api.deleteService).toHaveBeenCalledExactlyOnceWith(haircut.id);
    expect(fixture.nativeElement.querySelector('.inline-confirm button').disabled).toBe(true);

    pending.next();
    pending.complete();
    fixture.detectChanges();
    expect(component.services()).toEqual([beard]);
    expect(component.deletingId()).toBeNull();
  });

  it('preserves the current edit and disables the editor until its save finishes', () => {
    const pending = new Subject<CatalogService>();
    api.updateService.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.edit(haircut);
    component.form.controls.name.setValue('Corte atualizado');
    component.save();
    component.edit(beard);
    component.cancelEdit();
    component.confirmDelete(haircut.id);
    fixture.detectChanges();

    expect(component.editingId()).toBe(haircut.id);
    expect(component.form.controls.name.value).toBe('Corte atualizado');
    expect(fixture.nativeElement.querySelector('#serviceName').disabled).toBe(true);
    expect(component.deletingId()).toBeNull();

    pending.next({ ...haircut, name: 'Corte atualizado' });
    pending.complete();
    fixture.detectChanges();

    expect(component.saving()).toBe(false);
    expect(fixture.nativeElement.querySelector('#serviceName').disabled).toBe(false);
    expect(component.services().find((service) => service.id === haircut.id)?.name).toBe(
      'Corte atualizado',
    );
    expect(component.editingId()).toBeNull();
  });

  it('does not save or switch edits while a deletion is pending and supports retry after failure', () => {
    const pending = new Subject<void>();
    api.deleteService.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.edit(beard);
    component.confirmDelete(haircut.id);
    component.remove(haircut.id);

    component.save();
    component.edit(haircut);
    component.cancelDelete();
    expect(api.updateService).not.toHaveBeenCalled();
    expect(component.editingId()).toBe(beard.id);
    expect(component.deletingId()).toBe(haircut.id);

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Tente novamente.' } }));
    fixture.detectChanges();
    expect(component.services()).toEqual([haircut, beard]);
    expect(component.error()).toBe('Tente novamente.');
    expect(fixture.nativeElement.querySelector('.inline-confirm button').disabled).toBe(false);
    component.remove(haircut.id);
    expect(api.deleteService).toHaveBeenCalledTimes(2);
    expect(component.services()).toEqual([beard]);
  });

  it('rejects a whitespace-only service name before calling the API', () => {
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.name.setValue('   ');
    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(api.createService).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.field-error')?.textContent).toContain(
      'Introduza um nome para o serviço.',
    );
  });

  it('creates a service once and displays its returned name, duration and price', () => {
    const pending = new Subject<CatalogService>();
    api.createService.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const request = {
      name: 'Corte e barba',
      description: 'Serviço completo',
      durationMinutes: 60,
      priceAmount: 25,
    };
    component.form.setValue(request);

    component.save();
    component.save();
    expect(api.createService).toHaveBeenCalledExactlyOnceWith(request);
    pending.next({ id: 'complete', ...request, priceCurrency: 'EUR' });
    pending.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.service-list')?.textContent).toContain(
      'Corte e barba',
    );
    expect(fixture.nativeElement.querySelector('.service-list')?.textContent).toContain('60 min');
    expect(component.services()).toHaveLength(3);
    expect(component.form.pristine).toBe(true);
    expect(component.form.controls.name.value).toBe('');
  });

  it('preserves unsaved service details and restores editing after a failed update', () => {
    const pending = new Subject<CatalogService>();
    api.updateService.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.edit(haircut);
    component.form.controls.priceAmount.setValue(20);
    component.form.markAsDirty();
    component.save();
    pending.error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();

    expect(component.editingId()).toBe(haircut.id);
    expect(component.form.controls.priceAmount.value).toBe(20);
    expect(component.form.dirty).toBe(true);
    expect(fixture.nativeElement.querySelector('#servicePrice').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível guardar o serviço.',
    );
    expect(component.services()).toEqual([haircut, beard]);
  });

  it('clears the editor when its service is deleted', () => {
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.edit(haircut);
    component.confirmDelete(haircut.id);
    component.remove(haircut.id);

    expect(component.editingId()).toBeNull();
    expect(component.form.controls.name.value).toBe('');
    expect(component.services()).toEqual([beard]);
  });

  it.each([
    { durationMinutes: 14, priceAmount: 15 },
    { durationMinutes: 481, priceAmount: 15 },
    { durationMinutes: 30, priceAmount: -1 },
  ])('does not save invalid duration or price: %j', (values) => {
    const fixture = TestBed.createComponent(Services);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ name: 'Corte', ...values });
    fixture.componentInstance.save();

    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(api.createService).not.toHaveBeenCalled();
  });
});
