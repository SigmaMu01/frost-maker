import { TestBed } from '@angular/core/testing';

import { TemperatureControl } from './temperature-control';

describe('TemperatureControl', () => {
  let service: TemperatureControl;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TemperatureControl);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
