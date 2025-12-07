import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sidenav-edit',
  imports: [],
  templateUrl: './sidenav-edit.html',
  styleUrl: './sidenav-edit.scss',
})
export class SidenavEdit {
  readonly isOpen = input(false);
  readonly acceptedFileExtensions = input('');

  constructor() {}

  onFileSelected(file) {}
}
