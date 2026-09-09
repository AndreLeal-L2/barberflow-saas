import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarCheck,
  LucideCheck,
  LucideClock,
  LucideLink,
} from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';

@Component({
  selector: 'app-home',
  imports: [
    LucideArrowRight,
    LucideCalendarCheck,
    LucideCheck,
    LucideClock,
    LucideLink,
    PublicHeader,
    RouterLink,
  ],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
