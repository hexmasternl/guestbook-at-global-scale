import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./features/guestbook-list/guestbook-list').then((m) => m.GuestbookList),
  },
];
