import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
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
  private readonly buildingManager = inject(BuildingManager);
  private readonly cameraControl = inject(CameraControl);
  private readonly mapWorker = inject(MapWorker);
  private readonly windowSwitch = inject(WindowSwitch);
  readonly tempCloudWorker = inject(TempCloudWorker);

  readonly isSubmenuOpen = input(false);
  readonly floorNum = model<number>(5);
  readonly fieldOfViewValue = model<number>(60);
  readonly sliceValue = signal(0);

  readonly sliceMax = computed(() => {
    switch (this.tempCloudWorker.sliceMode()) {
      case 'xy':
        return this.tempCloudWorker.nz()! - 1;
      case 'xz':
        return this.tempCloudWorker.ny()! - 1;
      case 'yz':
        return this.tempCloudWorker.nx()! - 1;
    }
  });

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

  centerOnObject() {
    switch (this.windowSwitch.currentWindow()) {
      case 'grid': {
        this.mapWorker.fitToOutline();
        break;
      }
      case 'viewport': {
        this.cameraControl.centerCamera();
        break;
      }
      default: {
        break;
      }
    }
  }
}
