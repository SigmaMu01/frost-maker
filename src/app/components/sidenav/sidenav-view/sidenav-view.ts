import { Component, effect, inject, input, model } from '@angular/core';
import { BuildingManager } from '../../../shared/services/building-manager';
import { FormsModule } from '@angular/forms';
import { CameraControl } from '../../../panels/viewport/utils/camera-control';
import { MapWorker } from '../../../shared/services/map-worker';
import { WindowSwitch } from '../../../shared/services/window-switch';

@Component({
  selector: 'app-sidenav-view',
  imports: [FormsModule],
  templateUrl: './sidenav-view.html',
  styleUrl: '../sidenav-edit/sidenav-edit.scss',
})
export class SidenavView {
  readonly buildingManager = inject(BuildingManager);
  readonly cameraControl = inject(CameraControl);
  readonly mapWorker = inject(MapWorker);
  readonly windowSwitch = inject(WindowSwitch);

  readonly isSubmenuOpen = input(false);
  readonly floorNum = model<number>(5);
  readonly fieldOfViewValue = model<number>(60);

  constructor() {
    effect(() => {
      const f = this.floorNum();
      this.buildingManager.floorNum.set(f);
    });

    effect(() => {
      const fov = this.fieldOfViewValue();
      this.cameraControl.fov.set(fov);
    });
  }

  makeBuildingTransparent() {
    if (!this.mapWorker.isSVGLoaded()) return;
    this.buildingManager.setBuildingTransparency(0.25);
  }

  restoreBuilding() {
    if (!this.mapWorker.isSVGLoaded()) return;
    this.buildingManager.restoreBuildingMaterials();
  }

  toggleCube() {
    this.windowSwitch.toggleCube();
  }

  toggleColorTheme() {
    this.windowSwitch.toggleTheme();
  }
}
