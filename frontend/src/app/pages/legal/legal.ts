import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeader } from '../../components/public-header/public-header';

@Component({
  selector: 'app-legal',
  imports: [PublicHeader, RouterLink],
  templateUrl: './legal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legal {
  private readonly route = inject(ActivatedRoute);
  readonly document = this.route.snapshot.data['document'] as 'privacy' | 'terms';
}
