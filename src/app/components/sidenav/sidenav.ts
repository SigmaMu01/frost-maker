import { Component, signal } from '@angular/core';
import { SidenavEdit } from './sidenav-edit/sidenav-edit';

@Component({
  selector: 'app-sidenav',
  imports: [SidenavEdit],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  isSidenavOpen = signal(false);

  toggleSidenavState() {
    this.isSidenavOpen.update((state) => !state);
  }
}
