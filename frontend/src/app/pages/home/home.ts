import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCalendarDays, LucideClock, LucideScissors } from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';
import { HomeHero } from './home-hero';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-home-agenda-preview',
  imports: [TranslatePipe],
  template: `
    <figure
      class="agenda-demo"
      [attr.aria-label]="'Demonstração da agenda diária Compasso' | translate"
    >
      <picture>
        <source media="(max-width: 580px)" srcset="/images/compasso-agenda-mobile.webp" width="716" height="1994" />
        <img
          src="/images/compasso-agenda-desktop.webp"
          width="1550"
          height="2000"
          alt=""
          loading="lazy"
        />
      </picture>
      <figcaption>{{ 'Pré-visualização · Dados ilustrativos' | translate }}</figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .agenda-demo {
      min-width: 0;
      margin: 0;
    }
    picture {
      display: block;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius-panel);
    }
    img {
      display: block;
      width: 100%;
      height: 620px;
      object-fit: cover;
      object-position: top;
    }
    @media (max-width: 850px) {
      img {
        height: auto;
      }
    }
    figcaption {
      margin-top: var(--space-md);
      color: var(--ink-soft);
      font-size: var(--text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HomeAgendaPreview {}

@Component({
  selector: 'app-home',
  imports: [
    TranslatePipe,
    LucideArrowRight,
    LucideCalendarDays,
    LucideClock,
    LucideScissors,
    HomeAgendaPreview,
    HomeHero,
    PublicHeader,
    RouterLink,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
