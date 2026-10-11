import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/language.service';
import { ThemeService } from './core/theme.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly language = inject(LanguageService);
  private readonly theme = inject(ThemeService);
}
