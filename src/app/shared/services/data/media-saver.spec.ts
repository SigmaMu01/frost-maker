import { TestBed } from '@angular/core/testing';

import { MediaSaver } from './media-saver';

describe('MediaSaver', () => {
  let service: MediaSaver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaSaver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
