import { Component, effect, inject, input, model, signal } from '@angular/core';
import { BuildingManager } from '../../../shared/services/building-manager';
import { FormsModule } from '@angular/forms';
import { CameraControl } from '../../../panels/viewport/utils/camera-control';
import { MapWorker } from '../../../shared/services/map-worker';
import { WindowSwitch } from '../../../shared/services/window-switch';
import { TempCloudWorker } from '../../../shared/services/temp-cloud-worker';

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
  readonly tempCloudWorker = inject(TempCloudWorker);

  readonly isSubmenuOpen = input(false);
  readonly floorNum = model<number>(5);
  readonly fieldOfViewValue = model<number>(60);
  readonly sliceValue = signal(0);

  constructor() {
    effect(() => {
      const f = this.floorNum();
      this.buildingManager.floorNum.set(f);
    });

    effect(() => {
      const fov = this.fieldOfViewValue();
      this.cameraControl.fov.set(fov);
    });

    effect(() => {
      this.tempCloudWorker.sliceIndex.set(this.sliceValue() ?? 0); // Reset to default first slice on clear
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
