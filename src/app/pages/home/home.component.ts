import {Component} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';

/**
 * Placeholder landing page: the banner's message plus a strip of Material controls, so the theme can be
 * judged in both modes. The matcher features (query, ranked researchers, recommendation, index panel)
 * replace the preview card.
 */
@Component({
  selector: 'themis-home',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    FaIconComponent,
    TranslocoDirective
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  protected readonly steps = ['describe', 'retrieve', 'shortlist'] as const;
}
