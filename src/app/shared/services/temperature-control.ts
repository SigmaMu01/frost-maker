import { Injectable, signal } from '@angular/core';
import { TempProbe } from '../../core/models/probe';
import { DataFrame } from '../../core/models/temp-json';
import { binary3DCloudData } from '../../core/models/temp-cloud';

type ColorStop = [number, [number, number, number]];

// const ECMWF_SCALE: ColorStop[] = [
//   [-40, [130, 0, 180]], // deep violet
//   [-30, [0, 0, 255]], // blue
//   [-20, [0, 120, 255]], // light blue
//   [-10, [0, 200, 255]], // cyan
//   [0, [0, 255, 150]], // aqua-green
//   [10, [0, 255, 0]], // green
//   [20, [255, 255, 0]], // yellow
//   [30, [255, 165, 0]], // orange
//   [40, [255, 0, 0]], // red
//   [50, [180, 0, 0]], // dark red
// ];

const ECMWF_SCALE: ColorStop[] = [
  [-50, [130, 0, 180]], // deep violet
  [-40, [80, 0, 215]],
  [-35, [0, 0, 255]], // blue
  [-30, [0, 60, 255]],
  [-25, [0, 120, 255]], // light blue
  [-20, [0, 160, 255]],
  [-10, [0, 200, 255]], // cyan
  [-5, [0, 255, 235]],
  [0, [0, 255, 150]], // aqua-green
  [7, [0, 255, 0]], // green
  [13, [130, 255, 0]],
  [20, [255, 255, 0]], // yellow
  [30, [255, 165, 0]], // orange
  [40, [255, 0, 0]], // red
  [50, [180, 0, 0]], // dark red
];

@Injectable({
  providedIn: 'root',
})
export class TemperatureControl {
  // Temperature borders
  readonly minTemp = signal<number>(-5);
  readonly maxTemp = signal<number>(1);

  constructor() {}

  setTempBounds(data: any, scope: number) {
    switch (scope) {
      // Temp chain
      case 0: {
        function getMinMax(obj: DataFrame) {
          // const values = obj.map((i) => i.)
          const values = Object.values(obj);
          // const values = Object.values(obj).flatMap((level1) => Object.values(level1));
          // values.sort((a, b) => a - b);
          const valuesCleaned = values.filter((item) => item !== null && item !== undefined);
          // console.log('Data', cleaned);
          return {
            min: Math.min(...valuesCleaned),
            max: Math.max(...valuesCleaned),
          };
        }

        const minMaxTemp = getMinMax(data);

        this.minTemp.set(minMaxTemp.min);
        this.maxTemp.set(minMaxTemp.max);

        // console.log('New temperatures: ', minMaxTemp.min, minMaxTemp.max);

        break;
      }
      // Frame (all temp chains for a singular time snapshot)
      case 1: {
        function getMinMax(obj: Record<string, DataFrame>) {
          const values = Object.values(obj).flatMap((level1) => Object.values(level1));
          // values.sort((a, b) => a - b);
          const valuesCleaned = values.filter((item) => item !== null && item !== undefined);
          // console.log('Data', cleaned);
          return {
            min: Math.min(...valuesCleaned),
            max: Math.max(...valuesCleaned),
          };
        }

        const minMaxTemp = getMinMax(data);

        this.minTemp.set(minMaxTemp.min);
        this.maxTemp.set(minMaxTemp.max);

        // console.log('New temperatures: ', minMaxTemp.min, minMaxTemp.max);

        break;
      }
      // Slice (like frame but for x/y/z axis slice)
      case 2: {
        function getMinMax(obj: binary3DCloudData) {
          return {
            min: Math.min(...obj),
            max: Math.max(...obj),
          };
        }

        const minMaxTemp = getMinMax(data);

        const min = Math.round(Number(minMaxTemp.min) * 100) / 100;
        const max = Math.round(Number(minMaxTemp.max) * 100) / 100;

        this.minTemp.set(min);
        this.maxTemp.set(max);

        break;
      }

      // All data
      case 3: {
        function getMinMax(obj: Record<string, Record<number, number[]>>) {
          const values = Object.values(obj).flatMap((level1) =>
            Object.values(level1).flatMap((level2) => Object.values(level2))
          );

          const valuesCleaned = values.filter((item) => item !== null && item !== undefined);

          return {
            min: Math.min(...valuesCleaned),
            max: Math.max(...valuesCleaned),
          };
        }

        const minMaxTemp = getMinMax(data);

        this.minTemp.set(minMaxTemp.min);
        this.maxTemp.set(minMaxTemp.max);

        // console.log('New temperatures: ', minMaxTemp.min, minMaxTemp.max);

        break;
      }
    }
  }

  // Monotonic cubic interpolation (PCHIP)
  interpolateTemp(probes: TempProbe[], depth: number): number | null {
    if (!probes || probes.length === 0) return 0;

    const sorted = probes.slice().sort((a, b) => a.depth - b.depth);
    const n = sorted.length;

    if (n === 1) return sorted[0].temp;

    const first = sorted[0];
    const last = sorted[n - 1];

    if (depth < first.depth || depth > last.depth) {
      return null;
    }

    // Step 1: compute secant slopes
    const d: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = sorted[i + 1].depth - sorted[i].depth;
      const dy = sorted[i + 1].temp - sorted[i].temp;
      d.push(dy / dx);
    }

    // Step 2: compute tangents (PCHIP)
    const m: number[] = new Array(n);

    // Endpoints
    m[0] = d[0];
    m[n - 1] = d[n - 2];

    // Internal points
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) {
        m[i] = 0;
      } else {
        m[i] = (d[i - 1] + d[i]) / 2;
      }
    }

    // Step 3: find segment
    for (let i = 0; i < n - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      if (depth >= a.depth && depth <= b.depth) {
        const h = b.depth - a.depth;
        const t = (depth - a.depth) / h;

        // Hermite basis
        const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
        const h10 = t ** 3 - 2 * t ** 2 + t;
        const h01 = -2 * t ** 3 + 3 * t ** 2;
        const h11 = t ** 3 - t ** 2;

        return h00 * a.temp + h10 * h * m[i] + h01 * b.temp + h11 * h * m[i + 1];
      }
    }

    return last.temp;
  }

  getECMWFColor(temp: number, min: number, max: number, steps = 0) {
    if (Math.abs(max - min) < 1e-6) {
      const mid = ECMWF_SCALE[Math.floor(ECMWF_SCALE.length / 2)][1];
      return `rgb(${mid[0]}, ${mid[1]}, ${mid[2]})`;
    }

    // Normalize
    let norm = (temp - min) / (max - min);
    norm = Math.max(0, Math.min(1, norm));

    // OPTIONAL quantization (disabled by default)
    if (steps > 0) {
      norm = Math.round(norm * steps) / steps;
    }

    // Map to palette temperature domain
    const minT = ECMWF_SCALE[0][0];
    const maxT = ECMWF_SCALE[ECMWF_SCALE.length - 1][0];
    const scaledTemp = minT + norm * (maxT - minT);

    // Interpolate color
    for (let i = 0; i < ECMWF_SCALE.length - 1; i++) {
      const [t1, c1] = ECMWF_SCALE[i];
      const [t2, c2] = ECMWF_SCALE[i + 1];

      if (scaledTemp >= t1 && scaledTemp <= t2) {
        const ratio = (scaledTemp - t1) / (t2 - t1);

        const rgb = c1.map((v, idx) => Math.round(v + (c2[idx] - v) * ratio));

        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
    }

    // Fallbacks
    if (scaledTemp < minT) {
      const c = ECMWF_SCALE[0][1];
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }

    const c = ECMWF_SCALE[ECMWF_SCALE.length - 1][1];
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  findZeroCrossings(probes: TempProbe[]): TempProbe[] {
    const result: TempProbe[] = [];

    if (probes.length < 2) return result;

    for (let i = 0; i < probes.length - 1; i++) {
      const a = probes[i];
      const b = probes[i + 1];

      // Case 1: exact zero measurement
      if (a.temp === 0) {
        result.push({ depth: a.depth, temp: 0 });
        continue;
      }

      // Case 2: sign change => crossing
      if ((a.temp > 0 && b.temp < 0) || (a.temp < 0 && b.temp > 0)) {
        const t = (0 - a.temp) / (b.temp - a.temp);

        const depth = a.depth + t * (b.depth - a.depth);

        result.push({
          depth,
          temp: 0,
        });
      }
    }

    // console.log('Found zeroes: ', result);
    return result;
  }
}
