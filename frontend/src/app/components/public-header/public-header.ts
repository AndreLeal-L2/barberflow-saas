import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideScissors } from '@lucide/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-header',
  imports: [LucideScissors, RouterLink, RouterLinkActive],
  templateUrl: './public-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {}
