import { TestBed } from '@angular/core/testing';

import { IsoSurfaceWorker } from './iso-surface-worker';

describe('IsoSurfaceWorker', () => {
  let service: IsoSurfaceWorker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IsoSurfaceWorker);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
