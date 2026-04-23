import { inject, Injectable } from '@angular/core';
import { TempCloudWorker } from './temp-cloud-worker';
import { MapWorker } from './map-worker';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from './building-manager';

type Pile = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type SoilModel = {
  gammaT: number;
  gammaC: number;
  interpolate: (T: number) => { pressure: number; shaftResist: number };
};

@Injectable({
  providedIn: 'root',
})
export class BearingCapacityManager {
  private temp = inject(TempCloudWorker);
  private map = inject(MapWorker);

  // ---- Soil model (replace later if needed)
  private soil: SoilModel = {
    gammaT: 0.67,
    gammaC: 0.9,
    interpolate: (T: number) => this.interpolateSoil(T),
  };

  // ---- MAIN ENTRY
  computeForAllPiles(piles: Pile[]): Map<string, Float32Array> {
    const nt = this.temp.nt()!;
    const result = new Map<string, Float32Array>();

    for (const pile of piles) {
      const arr = new Float32Array(nt);

      for (let t = 0; t < nt; t++) {
        arr[t] = this.computePileAtTime(pile, t);
      }

      result.set(pile.id, arr);
    }

    return result;
  }

  // ---- CORE COMPUTATION
  private computePileAtTime(pile: Pile, t: number): number {
    const nx = this.temp.nx()!;
    const ny = this.temp.ny()!;
    const nz = this.temp.nz()!;

    const w_m = pile.w / PX_PER_M;
    const h_m = pile.h / PX_PER_M;

    const perimeter = 2 * (w_m + h_m);
    const area = w_m * h_m;

    const bounds = this.map.getBounds();

    // Convert world → grid
    const gx = (pile.x / bounds.x) * nx;
    const gy = (pile.y / bounds.y) * ny;

    const gx2 = ((pile.x + pile.w) / bounds.x) * nx;
    const gy2 = ((pile.y + pile.h) / bounds.y) * ny;

    const ix = Math.floor((gx + gx2) / 2);
    const iy = Math.floor((gy + gy2) / 2);

    let sum = 0;

    for (let z = 1; z < nz; z++) {
      // const T = this.sampleTemp(t, ix, iy, z);
      // const T1 = this.sampleTemp(t, ix, iy, z);
      // const T0 = this.sampleTemp(t, ix, iy, z - 1);
      // const T = 0.5 * (T1 + T0);
      const T1 = this.samplePileArea(t, pile, z);
      const T0 = this.samplePileArea(t, pile, z - 1);
      const T = 0.5 * (T1 + T0);

      const { shaftResist } = this.soil.interpolate(T);

      const dz = this.getDz(z);

      sum += shaftResist * dz * perimeter;
    }

    // base
    // const Tbase = this.sampleTemp(t, ix, iy, nz - 1);
    const Tbase = this.samplePileArea(t, pile, nz - 1);
    const { pressure } = this.soil.interpolate(Tbase);

    // sum += pressure * area;
    sum += pressure * area * 0.04;

    // coefficients
    sum *= this.soil.gammaT * this.soil.gammaC;

    // kPa → t/m²
    return sum / 9.8;
  }

  // ---- TEMPERATURE SAMPLING
  private sampleTemp(t: number, x: number, y: number, z: number): number {
    const idx = this.temp['idx'](t, x, y, z);
    // return this.temp['data']()![idx] - 273; // Kelvin → Celsius
    return this.temp['data']()![idx]; // Celsius → Celsius
  }

  // ---- Z spacing
  private getDz(z: number): number {
    const totalHeight = TEMP_CHAIN_HEIGHT_M; // TEMP_CHAIN_HEIGHT_M
    const nz = this.temp.nz()!;
    return totalHeight / (nz - 1);
  }

  // ---- Soil interpolation (table-based)
  private interpolateSoil(T: number) {
    const table = [
      { t: 0.0, pressure: 500, shaftResist: 25 },
      { t: -0.3, pressure: 1000, shaftResist: 50 },
      { t: -0.5, pressure: 1550, shaftResist: 80 },
      { t: -1.0, pressure: 1650, shaftResist: 130 },
      { t: -1.5, pressure: 1750, shaftResist: 160 },
      { t: -2.0, pressure: 2000, shaftResist: 200 },
      { t: -2.5, pressure: 2100, shaftResist: 230 },
      { t: -3.0, pressure: 2200, shaftResist: 260 },
      { t: -3.5, pressure: 2300, shaftResist: 290 },
      { t: -4.0, pressure: 2500, shaftResist: 330 },
      { t: -6.0, pressure: 3000, shaftResist: 380 },
      { t: -8.0, pressure: 3500, shaftResist: 440 },
      { t: -10.0, pressure: 4000, shaftResist: 500 },
    ];

    for (let i = 0; i < table.length - 1; i++) {
      const a = table[i];
      const b = table[i + 1];

      if (T >= table[0].t) return table[0]; // warmest
      if (T <= table[table.length - 1].t) return table[table.length - 1]; // coldest
      if (T >= 0) {
        return { pressure: 500, shaftResist: 25 };
      }
      if (T <= a.t && T > b.t) {
        const k = (T - a.t) / (b.t - a.t);
        return {
          pressure: a.pressure + k * (b.pressure - a.pressure),
          shaftResist: a.shaftResist + k * (b.shaftResist - a.shaftResist),
        };
      }
    }

    return table[table.length - 1];
  }

  private samplePileArea(t: number, pile: Pile, z: number): number {
    const nx = this.temp.nx()!;
    const ny = this.temp.ny()!;
    const bounds = this.map.getBounds();

    const samples = 4; // 2x2 grid
    let sum = 0;
    let count = 0;

    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < samples; j++) {
        const px = pile.x + (i + 0.5) * (pile.w / samples);
        const py = pile.y + (j + 0.5) * (pile.h / samples);

        const gx = Math.round((px / bounds.x) * nx);
        const gy = Math.round((py / bounds.y) * ny);

        sum += this.sampleTemp(t, gx, gy, z);
        count++;
      }
    }

    return sum / count;
  }
}
