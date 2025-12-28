import { TestBed } from '@angular/core/testing';

import { DataConnector } from './data-connector';

describe('DataConnector', () => {
  let service: DataConnector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataConnector);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
