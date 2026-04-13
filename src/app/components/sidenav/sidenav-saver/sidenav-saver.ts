import { Component, inject, input } from '@angular/core';
import { ThreeContext } from '../../../shared/services/three-context';
import { MediaSaver } from '../../../shared/services/data/media-saver';
import { WindowSwitch } from '../../../shared/services/window-switch';

@Component({
  selector: 'app-sidenav-saver',
  imports: [],
  templateUrl: './sidenav-saver.html',
  styleUrl: './sidenav-saver.scss',
})
export class SidenavSaver {
  // private readonly three = inject(ThreeContext);
  private readonly mediaSaver = inject(MediaSaver);
  private readonly windowSwitch = inject(WindowSwitch);

  readonly isSubmenuOpen = input(false);

  // saveScreenshot = this.mediaSaver.saveThreeScreenshot.bind(this.mediaSaver);
  // saveAnimation = this.mediaSaver.recordThreeAnimation.bind(this.mediaSaver);

  saveAnimation = () => {
    switch (this.windowSwitch.currentWindow()) {
      case 'grid': {
        this.mediaSaver.recordFabricAnimation();
        break;
      }
      case 'viewport': {
        this.mediaSaver.recordThreeAnimation();
        break;
      }
      default: {
        break;
      }
    }
  };

  saveScreenshot = () => {
    switch (this.windowSwitch.currentWindow()) {
      case 'grid': {
        this.mediaSaver.saveFabricScreenshot();
        break;
      }
      case 'viewport': {
        this.mediaSaver.saveThreeScreenshot();
        break;
      }
      default: {
        break;
      }
    }
  };
}
