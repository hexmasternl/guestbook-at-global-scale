import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * Landing hero page: headline, sub-headline, animated Earth graphic, and a
 * placeholder call-to-action pointing at the (not yet built) interactive
 * guestbook map/form. Purely presentational — makes no calls to the
 * guestbook API.
 */
@Component({
  selector: 'gkb-landing',
  imports: [MatButtonModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {}
