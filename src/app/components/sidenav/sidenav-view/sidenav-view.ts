import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { BuildingManager } from '../../../shared/services/building-manager';
import { FormsModule } from '@angular/forms';
import { CameraControl } from '../../../panels/viewport/utils/camera-control';
import { MapWorker } from '../../../shared/services/map-worker';
import { WindowSwitch } from '../../../shared/services/window-switch';
import { TempCloudWorker } from '../../../shared/services/temp-cloud-worker';
import { TempProber } from '../../temp-probe/temp-prober';
import { toggleFlag } from '../../../core/utils/toggler';
import { IsoSurfaceWorker } from '../../../shared/services/iso-surface-worker';
import { PileManager } from '../../../shared/services/pile-manager';

@Component({
  selector: 'app-sidenav-view',
  imports: [FormsModule],
  templateUrl: './sidenav-view.html',
  styleUrls: ['../sidenav-edit/sidenav-edit.scss', './sidenav-view.scss'],
})
export class SidenavView {
  private readonly buildingManager = inject(BuildingManager);
  private readonly cameraControl = inject(CameraControl);
  private readonly mapWorker = inject(MapWorker);
  private readonly windowSwitch = inject(WindowSwitch);
  private readonly tempProber = inject(TempProber);
  private readonly isoSurfaceWorker = inject(IsoSurfaceWorker);
  private readonly pileManager = inject(PileManager);
  readonly tempCloudWorker = inject(TempCloudWorker);

  readonly isSubmenuOpen = input(false);
  readonly showSlices = model<boolean>(true);
  readonly floorNum = model<number>(5);
  readonly fieldOfViewValue = model<number>(60);
  readonly sliceValue = this.tempCloudWorker.sliceIndex.bind(this.tempCloudWorker);

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
      const show = this.showSlices();
      this.tempCloudWorker.showSlices.set(show);
    });

    // effect(() => {
    //   this.tempCloudWorker.sliceIndexes.update((idxs) => ({
    //     ...idxs,
    //     [this.tempCloudWorker.sliceMode()]: this.sliceValue() ?? 0,
    //   })); // Reset to default first slice on clear [this.tempCloudWorker.sliceMode()]
    // });
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
    toggleFlag(this.windowSwitch.isCubeVisible);
  }

  toggleProbe() {
    toggleFlag(this.tempProber.isProbeEnabled);
  }

  toggleGrid() {
    this.mapWorker.toggleGrid();
  }

  toggleColorTheme() {
    this.windowSwitch.toggleTheme();
  }

  toggleAxes() {
    this.mapWorker.toggleAxes();
  }

  toggleIsoPoints() {
    toggleFlag(this.isoSurfaceWorker.isIsoPointsActive);
  }

  toggleIsoMeshes() {
    toggleFlag(this.isoSurfaceWorker.isIsoMeshesActive);
  }

  selectAllPiles() {
    this.pileManager.selectAllPiles();
  }

  clearAllPiles() {
    this.pileManager.clearSelection();
  }

  centerOnObject() {
    switch (this.windowSwitch.currentWindow()) {
      case 'grid': {
        if (this.tempCloudWorker.isBinLoaded()) {
          this.tempCloudWorker.fitToTemperatureSlice();
        } else {
          this.mapWorker.fitToOutline();
        }
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

  onSliceChange(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    const axis = this.tempCloudWorker.sliceMode();

    this.tempCloudWorker.sliceIndexes.update((idxs) => ({
      ...idxs,
      [axis]: value,
    }));
  }
}
