import { TestBed } from '@angular/core/testing';

import { MapWorker } from './map-worker';

describe('MapWorker', () => {
  let service: MapWorker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapWorker);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
