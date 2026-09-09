import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './public-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {}
