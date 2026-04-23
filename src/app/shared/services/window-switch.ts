import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WindowSwitch {
  readonly currentWindow = signal<'help' | 'grid' | 'viewport' | 'charts'>('grid');

  readonly isCubeVisible = signal(true);

  toggleCube() {
    this.isCubeVisible.update((v) => !v);
  }

  toggleTheme() {
    // if (!document.documentElement.classList.contains('light')) {
    //   document.documentElement.classList.toggle('light');
    // } else document.documentElement.classList.remove('light');
    document.documentElement.classList.toggle('light');
  }
}
