import { TestBed } from '@angular/core/testing';

import { GridDraw } from './grid-draw';

describe('MapWorker', () => {
  let service: GridDraw;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GridDraw);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
