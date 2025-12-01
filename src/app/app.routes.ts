import { Routes } from '@angular/router';

import { Grid } from './panels/grid/grid';
import { Intro } from './panels/intro/intro';
import { Viewport } from './panels/viewport/viewport';

export const routes: Routes = [
  {
    path: '',
    component: Intro,
  },
  {
    path: 'grid',
    component: Grid,
  },
  {
    path: 'viewport',
    component: Viewport,
  },
];
