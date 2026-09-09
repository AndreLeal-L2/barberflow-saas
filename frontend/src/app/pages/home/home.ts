import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';

@Component({
  selector: 'app-home',
  imports: [LucideArrowRight, PublicHeader, RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
