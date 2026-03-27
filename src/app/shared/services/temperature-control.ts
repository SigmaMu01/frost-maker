import { Injectable } from '@angular/core';
import { TempProbe } from '../../core/models/probe';

@Injectable({
  providedIn: 'root',
})
export class TemperatureControl {
  interpolateTemp(probes: TempProbe[], depth: number) {
    const arr = probes;

    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i];
      const b = arr[i + 1];

      if (depth >= a.depth && depth <= b.depth) {
        const t = (depth - a.depth) / (b.depth - a.depth);

        return a.temp + t * (b.temp - a.temp);
      }
    }

    return arr[arr.length - 1].temp;
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

    console.log('Found zeroes: ', result);
    return result;
  }
}
