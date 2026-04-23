import { TestBed } from '@angular/core/testing';

import { BearingCapacityManager } from './bearing-capacity-manager';

describe('BearingCapacityManager', () => {
  let service: BearingCapacityManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BearingCapacityManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
