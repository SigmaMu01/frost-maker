import { TestBed } from '@angular/core/testing';

import { BuildingManager } from './building-manager';

describe('BuildingManager', () => {
  let service: BuildingManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildingManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
