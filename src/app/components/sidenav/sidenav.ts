import { Component, signal } from '@angular/core';
import { SidenavEdit } from './sidenav-edit/sidenav-edit';
import { RouterLink } from '@angular/router';
import { SidenavView } from './sidenav-view/sidenav-view';

type sidenavState = 'home' | 'edit' | 'view'; // All sidenav options go here

@Component({
  selector: 'app-sidenav',
  imports: [SidenavEdit, SidenavView, RouterLink],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  isSidenavOpen = signal(false);
  selectedSidenavOption = signal<sidenavState>('home');

  toggleSidenavState() {
    this.isSidenavOpen.update((state) => !state);
  }

  onChangeSelectedSidenavOption(state: sidenavState) {
    this.selectedSidenavOption.set(state);
    this.isSidenavOpen.set(true);
  }
}
