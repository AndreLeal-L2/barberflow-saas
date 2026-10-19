import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCheck } from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-pricing',
  imports: [TranslatePipe, LucideArrowRight, LucideCheck, PublicHeader, RouterLink],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pricing {}
