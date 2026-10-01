import {Component, inject} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';
import {TranslocoHelperService} from '../../services/transloco-helper.service';

/**
 * Landing page in the banner's layout: the pitch and a query field on the left, the three steps on the
 * right. The field hands off to the search page (`search?q=…`), which runs the actual query.
 */
@Component({
  selector: 'themis-home',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FaIconComponent,
    TranslocoDirective
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  private readonly router = inject(Router);

  protected readonly lang$$ = inject(TranslocoHelperService).currentLang$$;
  protected readonly steps = ['describe', 'retrieve', 'shortlist'] as const;
  protected readonly query = new FormControl('', {nonNullable: true});

  protected search(): void {
    const q = this.query.value.trim();
    void this.router.navigate(['/', this.lang$$(), 'search'], q ? {queryParams: {q}} : {});
  }
}
