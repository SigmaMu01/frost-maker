export interface TempProbe {
  depth: number;
  temp: number;
}

export interface TempProbeCont extends TempProbe {
  y: number; // Coordinate based on where the mouse is located on top of the thermal braid
}
