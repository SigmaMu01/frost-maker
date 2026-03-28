import { TestBed } from '@angular/core/testing';

import { CameraControl } from './camera-control';

describe('CameraControl', () => {
  let service: CameraControl;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CameraControl);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
