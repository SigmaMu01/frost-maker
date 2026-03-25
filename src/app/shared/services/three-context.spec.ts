import { TestBed } from '@angular/core/testing';

import { ThreeContext } from './three-context';

describe('ThreeContext', () => {
  let service: ThreeContext;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeContext);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
