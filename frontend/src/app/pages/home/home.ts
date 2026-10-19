import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarDays,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClock,
  LucideScissors,
} from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';
import { HomeHero } from './home-hero';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-home-agenda-preview',
  imports: [
    TranslatePipe,
    LucideCalendarDays,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClock,
    LucideScissors,
  ],
  template: `
    <figure
      class="agenda-demo"
      [attr.aria-label]="'Demonstração da agenda diária BarberFlow' | translate"
    >
      <div class="demo-window">
        <div class="demo-topbar">
          <span class="brand demo-wordmark" role="img" aria-label="BarberFlow"></span>
          <span class="demo-shop"
            >{{ 'Barbearia Central' | translate
            }}<span class="demo-avatar" aria-hidden="true">BC</span></span
          >
        </div>
        <div class="demo-workspace">
          <div class="demo-sidebar" aria-hidden="true">
            <span class="demo-nav-selected"><svg lucideCalendarDays [size]="19"></svg></span>
            <span><svg lucideScissors [size]="18"></svg></span>
            <span><svg lucideClock [size]="18"></svg></span>
            <span class="demo-sidebar-bottom">BC</span>
          </div>
          <div class="demo-main">
            <div class="demo-heading">
              <h2>{{ 'Agenda' | translate }}</h2>
              <span>{{ 'Vista diária' | translate }}</span>
            </div>
            <div class="demo-date-row">
              <strong>{{ 'Quinta-feira, 17' | translate }}</strong>
              <div aria-hidden="true">
                <svg lucideChevronLeft [size]="15"></svg><svg lucideChevronRight [size]="15"></svg>
              </div>
            </div>
            <div class="demo-day-label">
              <span>{{ 'Horário' | translate }}</span
              ><span>{{ '3 marcações' | translate }}</span>
            </div>
            <div class="demo-slot">
              <time>09:00</time>
              <div class="demo-appointment">
                <div>
                  <strong>Miguel Santos</strong><span>{{ 'Confirmada' | translate }}</span>
                </div>
                <p>{{ 'Corte clássico · 45 min' | translate }}</p>
              </div>
            </div>
            <div class="demo-slot">
              <time>10:00</time>
              <div class="demo-appointment">
                <div>
                  <strong>Rui Almeida</strong><span>{{ 'Confirmada' | translate }}</span>
                </div>
                <p>{{ 'Barba · 30 min' | translate }}</p>
              </div>
            </div>
            <div class="demo-slot demo-slot-free">
              <time>11:00</time>
              <div>
                <span>{{ 'Horário disponível' | translate }}</span>
              </div>
            </div>
            <div class="demo-slot">
              <time>12:00</time>
              <div class="demo-appointment">
                <div>
                  <strong>André Costa</strong><span>{{ 'Confirmada' | translate }}</span>
                </div>
                <p>{{ 'Corte + barba · 60 min' | translate }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    .demo-window {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--paper);
      box-shadow: 0 6px 22px rgb(24 35 47 / 4%);
    }
    .demo-topbar {
      display: flex;
      height: 53px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 18px;
      border-bottom: 1px solid var(--line);
    }
    .demo-wordmark {
      width: 116px;
      height: 26px;
    }
    .demo-shop {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--ink-soft);
      font-size: 0.62rem;
    }
    .demo-avatar,
    .demo-sidebar-bottom {
      display: grid;
      width: 24px;
      height: 24px;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--ink-soft);
      background: var(--canvas);
      font-size: 0.52rem;
      font-weight: 600;
    }
    .demo-workspace {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
    }
    .demo-sidebar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 8px 13px;
      border-right: 1px solid var(--line);
      background: var(--canvas);
    }
    .demo-sidebar > span:not(.demo-sidebar-bottom) {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      color: var(--ink-soft);
    }
    .demo-sidebar .demo-nav-selected {
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--brand) !important;
      background: var(--paper);
    }
    .demo-sidebar-bottom {
      margin-top: auto;
    }
    .demo-main {
      min-width: 0;
      padding: 22px 24px 10px;
    }
    .demo-heading,
    .demo-date-row,
    .demo-day-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .demo-heading {
      margin-bottom: 20px;
    }
    .demo-heading h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .demo-heading > span {
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--ink-soft);
      font-size: 0.59rem;
    }
    .demo-date-row {
      padding-bottom: 15px;
    }
    .demo-date-row strong {
      font-size: 0.75rem;
      font-weight: 600;
    }
    .demo-date-row > div {
      display: flex;
      gap: 13px;
      color: var(--ink-soft);
    }
    .demo-day-label {
      padding-block: 11px;
      border-block: 1px solid var(--line);
      color: var(--ink-soft);
      font-size: 0.58rem;
    }
    .demo-slot {
      display: grid;
      min-height: 73px;
      grid-template-columns: 43px minmax(0, 1fr);
      gap: 7px;
      align-items: start;
      padding-block: 10px;
      border-bottom: 1px solid var(--line);
    }
    .demo-slot:last-child {
      border-bottom: 0;
    }
    .demo-slot time {
      padding-top: 7px;
      color: var(--ink-soft);
      font-size: 0.62rem;
      font-variant-numeric: tabular-nums;
    }
    .demo-appointment {
      min-height: 52px;
      padding: 9px 10px;
      border-left: 2px solid var(--brand);
      border-radius: 0 4px 4px 0;
      background: var(--brand-soft);
    }
    .demo-appointment > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .demo-appointment strong {
      font-size: 0.67rem;
      font-weight: 600;
    }
    .demo-appointment > div > span {
      color: var(--brand-dark);
      font-size: 0.51rem;
    }
    .demo-appointment p {
      margin: 3px 0 0;
      color: var(--ink-soft);
      font-size: 0.59rem;
    }
    .demo-slot-free {
      min-height: 59px;
    }
    .demo-slot-free > div {
      align-self: center;
      padding-left: 12px;
      color: var(--ink-soft);
      font-size: 0.62rem;
    }
    .agenda-demo figcaption {
      margin-top: 10px;
      color: var(--ink-soft);
      font-size: 0.64rem;
      text-align: right;
    }
    @media (max-width: 1100px) {
      .demo-main {
        padding-inline: 16px;
      }
    }
    @media (max-width: 850px) {
      .agenda-demo {
        width: min(100%, 600px);
        justify-self: center;
      }
      .demo-main {
        padding-inline: 24px;
      }
    }
    @media (max-width: 580px) {
      .demo-topbar {
        padding-inline: 12px;
      }
      .demo-shop {
        gap: 7px;
        font-size: 0.52rem;
      }
      .demo-workspace {
        grid-template-columns: 42px minmax(0, 1fr);
      }
      .demo-sidebar {
        padding-inline: 4px;
      }
      .demo-sidebar > span:not(.demo-sidebar-bottom) {
        width: 29px;
        height: 30px;
      }
      .demo-main {
        padding: 18px 12px 8px;
      }
      .demo-heading {
        margin-bottom: 18px;
      }
      .demo-slot {
        grid-template-columns: 34px minmax(0, 1fr);
        gap: 4px;
      }
      .demo-appointment {
        padding-inline: 8px;
      }
      .demo-appointment > div {
        gap: 6px;
      }
      .demo-appointment strong {
        font-size: 0.62rem;
      }
      .demo-appointment > div > span {
        font-size: 0.46rem;
      }
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
