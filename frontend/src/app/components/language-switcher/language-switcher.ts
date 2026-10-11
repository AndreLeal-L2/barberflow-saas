import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Language, LanguageService } from '../../core/language.service';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  readonly i18n = inject(LanguageService);

  changeLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }
}
