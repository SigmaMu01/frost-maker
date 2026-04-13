import { Component, inject, input } from '@angular/core';
import { TempProbeFabric } from '../../core/models/probe';
import { DecimalPipe } from '@angular/common';
import { TempProber } from './temp-prober';

@Component({
  selector: 'app-temp-probe',
  imports: [DecimalPipe],
  templateUrl: './temp-probe.html',
  styleUrl: './temp-probe.scss',
})
export class TempProbe {
  readonly tempProber = inject(TempProber);
  // readonly isProbeVisible = input(false);
  // readonly probe = input<TempProbeFabric>({} as TempProbeFabric);
}
