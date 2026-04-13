export interface TempProbe {
  depth: number;
  temp: number;
}

export interface TempProbeCont extends TempProbe {
  y: number; // Coordinate based on where the mouse is located on top of the thermal braid
}

export interface TempProbeFabric {
  x: number;
  y: number;
  temp: number;
  coords: {
    x: number;
    y: number;
    z: number;
  };
}
