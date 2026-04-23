import { Component, effect, inject, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { Sidenav } from './components/sidenav/sidenav';
import { Temperature } from './panels/temperature/temperature';
import { Timeline } from './panels/timeline/timeline';
import { Grid } from './panels/grid/grid';
import { Charts } from './panels/charts/charts';
import { Viewport } from './panels/viewport/viewport';
import { WindowSwitch } from './shared/services/window-switch';
import { Overlay } from './components/overlay/overlay';
import { Help } from './panels/intro/help';

@Component({
  selector: 'app-root',
  imports: [Sidenav, Temperature, Timeline, Grid, Viewport, Overlay, Help, Charts],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frost-maker');

  windowSwitch = inject(WindowSwitch);

  constructor() {
    effect(() => {
      const v = this.windowSwitch.currentWindow();
    });
  }
}
