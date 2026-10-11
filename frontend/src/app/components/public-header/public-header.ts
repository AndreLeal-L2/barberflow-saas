import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { LanguageSwitcher } from '../../components/language-switcher/language-switcher';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-public-header',
  imports: [LanguageSwitcher, TranslatePipe, RouterLink, RouterLinkActive, ThemeToggle],
  templateUrl: './public-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {}
