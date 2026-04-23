import { TestBed } from '@angular/core/testing';

import { PileManager } from './pile-manager';

describe('PileManager', () => {
  let service: PileManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PileManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
