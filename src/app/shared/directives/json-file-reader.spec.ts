import { JsonFileReader } from './json-file-reader';

describe('JsonFileReader', () => {
  it('should create an instance', () => {
    const directive = new JsonFileReader();
    expect(directive).toBeTruthy();
  });
});
