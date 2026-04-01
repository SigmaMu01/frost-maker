import { Component, effect, inject, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { Sidenav } from './components/sidenav/sidenav';
import { Temperature } from './panels/temperature/temperature';
import { Timeline } from './panels/timeline/timeline';
import { Grid } from './panels/grid/grid';
import { Viewport } from './panels/viewport/viewport';
import { WindowSwitch } from './shared/services/window-switch';

@Component({
  selector: 'app-root',
  imports: [Sidenav, Temperature, Timeline, Grid, Viewport],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frost-maker');

  windowSwitch = inject(WindowSwitch);

  constructor() {
    effect(() => {
      const v = this.windowSwitch.showViewport();
      console.log(v);
    });
  }
}
