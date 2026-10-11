import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LanguageService } from './language.service';

@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly language = inject(LanguageService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.language.setPageTitle(this.buildTitle(snapshot) ?? 'BarberFlow');
  }
}
