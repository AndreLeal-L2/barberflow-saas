import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-home-hero',
  imports: [RouterLink, LucideArrowRight, TranslatePipe],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHero {}
