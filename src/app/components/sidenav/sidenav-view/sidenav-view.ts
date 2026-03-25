import { Component, effect, inject, input, model } from '@angular/core';
import { BuildingManager } from '../../../shared/services/building-manager';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidenav-view',
  imports: [FormsModule],
  templateUrl: './sidenav-view.html',
  styleUrl: '../sidenav-edit/sidenav-edit.scss',
})
export class SidenavView {
  readonly buildingManager = inject(BuildingManager);

  readonly isSubmenuOpen = input(false);
  readonly floorNum = model<number>(1);

  constructor() {
    effect(() => {
      const f = this.floorNum();
      this.buildingManager.floorNum.set(f);
    });
  }
}
