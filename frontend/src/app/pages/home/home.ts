import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { PublicHeader } from '../../components/public-header/public-header';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-home',
  imports: [TranslatePipe, LucideArrowRight, PublicHeader, RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
