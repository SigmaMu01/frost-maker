import { Component, input } from '@angular/core';

import { monitoringDataJSON } from '../../../core/models/temp-json';

import { JsonFileReader } from '../../../shared/directives/json-file-reader';
import { SvgFileReader } from '../../../shared/directives/svg-file-reader';
import { mapSVG } from '../../../core/models/building';

@Component({
  selector: 'app-sidenav-edit',
  imports: [JsonFileReader, SvgFileReader],
  templateUrl: './sidenav-edit.html',
  styleUrl: './sidenav-edit.scss',
})
export class SidenavEdit {
  readonly isSubmenuOpen = input(false);

  dataJSON = input<monitoringDataJSON>({} as monitoringDataJSON);
  // confSVG = input<mapSVG>({} as mapSVG);

  constructor() {}
}
