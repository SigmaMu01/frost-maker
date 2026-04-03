import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WindowSwitch {
  readonly showViewport = signal(false);

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
