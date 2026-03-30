import { TestBed } from '@angular/core/testing';

import { WindowSwitch } from './window-switch';

describe('WindowSwitch', () => {
  let service: WindowSwitch;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WindowSwitch);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
