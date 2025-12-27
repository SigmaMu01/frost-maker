import { SvgFileReader } from './svg-file-reader';

describe('SvgFileReader', () => {
  it('should create an instance', () => {
    const directive = new SvgFileReader();
    expect(directive).toBeTruthy();
  });
});
