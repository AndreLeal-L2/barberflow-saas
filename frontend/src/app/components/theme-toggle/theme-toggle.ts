import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../core/theme.service';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe, LucideMoon, LucideSun],
  templateUrl: './theme-toggle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  readonly themes = inject(ThemeService);
}
