import { Injectable, signal } from '@angular/core';
import { TempProbeFabric } from '../../core/models/probe';

@Injectable({
  providedIn: 'root',
})
export class TempProber {
  readonly isProbeVisible = signal(false);
  readonly probe = signal<TempProbeFabric>({} as TempProbeFabric);
}
