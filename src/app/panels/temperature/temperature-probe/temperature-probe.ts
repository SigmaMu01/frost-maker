import { DecimalPipe } from '@angular/common';
import { Component, effect, input } from '@angular/core';
import { TempProbeCont } from '../../../core/models/probe';

@Component({
  selector: 'app-temperature-probe',
  imports: [DecimalPipe],
  templateUrl: './temperature-probe.html',
  styleUrl: './temperature-probe.scss',
})
export class TemperatureProbe {
  readonly isProbeVisible = input(false);
  readonly probe = input<TempProbeCont>({} as TempProbeCont);
}
