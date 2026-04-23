import { FabricObject } from 'fabric';

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

export type PileSelection = {
  id: string; // stable (pile_0, pile_1…)
  order: number; // dynamic (1..n)
  object: FabricObject;
};
