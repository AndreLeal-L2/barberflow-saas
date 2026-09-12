import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCheck } from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';

@Component({
  selector: 'app-pricing',
  imports: [LucideArrowRight, LucideCheck, PublicHeader, RouterLink],
  templateUrl: './pricing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pricing {}
