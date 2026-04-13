import { TestBed } from '@angular/core/testing';

import { TempProber } from './temp-prober';

describe('TempProber', () => {
  let service: TempProber;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempProber);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
