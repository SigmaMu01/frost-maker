import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidenav } from './components/sidenav/sidenav';
import { Temperature } from './panels/temperature/temperature';
import { Timeline } from './panels/timeline/timeline';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidenav, Temperature, Timeline],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frost-maker');
}
