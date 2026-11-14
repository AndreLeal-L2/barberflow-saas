import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardBarbershop } from './booking.models';

@Injectable({ providedIn: 'root' })
export class ShopAppearanceService {
  private revision = 0;
  private readonly current = signal<DashboardBarbershop | null>(null);
  readonly shop = this.current.asReadonly();

  load(request: Observable<DashboardBarbershop>): void {
    const revision = ++this.revision;
    request.subscribe({
      next: (shop) => {
        if (revision === this.revision) this.current.set(shop);
      },
      error: () => {},
    });
  }
  update(shop: DashboardBarbershop): void {
    this.revision++;
    this.current.set(shop);
  }
  clear(): void {
    this.revision++;
    this.current.set(null);
  }
}
