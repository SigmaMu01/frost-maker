import { TestBed } from '@angular/core/testing';

import { SvgMapParser } from './svg-map-parser';

describe('SvgMapParser', () => {
  let service: SvgMapParser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SvgMapParser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
