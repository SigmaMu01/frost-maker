import { Component, inject, input } from '@angular/core';
import { ThreeContext } from '../../../shared/services/three-context';
import { MediaSaver } from '../../../shared/services/data/media-saver';

@Component({
  selector: 'app-sidenav-saver',
  imports: [],
  templateUrl: './sidenav-saver.html',
  styleUrl: './sidenav-saver.scss',
})
export class SidenavSaver {
  // private readonly three = inject(ThreeContext);
  private readonly mediaSaver = inject(MediaSaver);

  readonly isSubmenuOpen = input(false);

  saveScreenshot = this.mediaSaver.saveScreenshot.bind(this.mediaSaver);
  saveAnimation = this.mediaSaver.recordAnimation.bind(this.mediaSaver);
}
