import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-home-hero',
  imports: [RouterLink, LucideArrowRight, TranslatePipe],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
  host: {
    '[style.--hero-viewport-height.px]': 'viewportHeight()',
    '(window:resize)': 'updateViewportHeight()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHero {
  protected readonly viewportHeight = signal(window.innerHeight);
  private viewportWidth = window.innerWidth;

  protected updateViewportHeight(): void {
    // Mobile browser controls resize the height during scroll. Only a width
    // change should reframe the photograph (for example, device rotation).
    if (window.innerWidth !== this.viewportWidth) {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight.set(window.innerHeight);
    }
  }
}
