import { TestBed } from '@angular/core/testing';

import { TempCloudWorker } from './temp-cloud-worker';

describe('TempCloudWorker', () => {
  let service: TempCloudWorker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCloudWorker);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
