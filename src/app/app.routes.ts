import {Routes} from '@angular/router';
import {DEFAULT_LANGUAGE} from './constants/application.constant';
import {langGuard} from './guards/lang.guard';

export const routes: Routes = [
  {
    path: ':lang',
    canActivate: [langGuard],
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'home'},
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'search',
        loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent)
      },
      {
        path: 'index',
        loadComponent: () => import('./pages/index/index.component').then(m => m.IndexComponent)
      }
    ]
  },
  {path: '**', redirectTo: DEFAULT_LANGUAGE}
];
