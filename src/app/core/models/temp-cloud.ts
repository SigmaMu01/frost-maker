export interface binary3DCloudHeader {
  resolution: [nx: number, ny: number, nz: number];
  timestamps: string[];
  shape: [nt: number, nx: number, ny: number, nz: number];
}

export type binary3DCloudData = Float32Array;
