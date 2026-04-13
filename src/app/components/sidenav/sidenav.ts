import { afterNextRender, Component, inject, signal } from '@angular/core';
import { SidenavEdit } from './sidenav-edit/sidenav-edit';
// import { RouterLink } from '@angular/router';
import { SidenavView } from './sidenav-view/sidenav-view';
import { WindowSwitch } from '../../shared/services/window-switch';
import { SidenavSaver } from './sidenav-saver/sidenav-saver';

type sidenavState = 'help' | 'grid' | 'viewport'; // All sidenav options go here

@Component({
  selector: 'app-sidenav',
  imports: [SidenavEdit, SidenavView, SidenavSaver],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  windowSwitch = inject(WindowSwitch);

  isSidenavOpen = signal(false);
  selectedSidenavOption = signal<sidenavState>('help');

  constructor() {
    afterNextRender(() => {
      this.isSidenavOpen.set(false);
    });
  }

  toggleSidenavState() {
    this.isSidenavOpen.update((state) => !state);
  }

  onChangeSelectedSidenavOption(state: sidenavState) {
    this.selectedSidenavOption.set(state);
    this.isSidenavOpen.set(true);

    switch (state) {
      case 'help':
        this.windowSwitch.currentWindow.set('help');
        break;
      case 'grid':
        this.windowSwitch.currentWindow.set('grid');
        break;
      case 'viewport':
        this.windowSwitch.currentWindow.set('viewport');
        break;
      default:
        this.windowSwitch.currentWindow.set('grid');
    }
  }
}
