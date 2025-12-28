import { Component, effect, signal } from '@angular/core';
import { DataConnector } from '../../shared/services/data-connector';

@Component({
  selector: 'app-timeline',
  imports: [],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {
  readonly timeFrameDates = signal<string[]>([]);
  readonly selectedFrame = signal<number>(0);

  constructor(private dataConnector: DataConnector) {
    effect(() => {
      if (this.dataConnector.isJSONLoaded()) {
        this.timeFrameDates.set(this.dataConnector.getTimeFrameDates());
      }
    });
    effect(() => {
      this.selectedFrame.set(this.dataConnector.selectedFrame());
    });
  }

  onSelectFrame(index: number) {
    this.dataConnector.setCurrentFrame(index);
  }
}
