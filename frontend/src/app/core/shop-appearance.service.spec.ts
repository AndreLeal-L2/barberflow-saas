import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DashboardBarbershop } from './booking.models';
import { ShopAppearanceService } from './shop-appearance.service';

describe('Shop appearance', () => {
  it('does not replace a newly uploaded logo with an older dashboard response', () => {
    const service = TestBed.inject(ShopAppearanceService);
    const pending = new Subject<DashboardBarbershop>();
    service.load(pending);
    const latest = {
      id: 'shop',
      logoUrl: '/api/dashboard/barbershop/images/logo?v=new',
    } as DashboardBarbershop;
    service.update(latest);
    pending.next({ ...latest, logoUrl: null });
    pending.complete();
    expect(service.shop()?.logoUrl).toBe(latest.logoUrl);
  });

  it('clears the previous business on leaving the dashboard and ignores late responses', () => {
    const service = TestBed.inject(ShopAppearanceService);
    const pending = new Subject<DashboardBarbershop>();
    service.load(pending);
    service.clear();
    pending.next({ id: 'previous', logoUrl: '/previous.png' } as DashboardBarbershop);
    expect(service.shop()).toBeNull();
  });
});
