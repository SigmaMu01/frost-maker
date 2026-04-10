import { BinFileReader } from './bin-file-reader';

describe('BinFileReader', () => {
  it('should create an instance', () => {
    const directive = new BinFileReader();
    expect(directive).toBeTruthy();
  });
});
