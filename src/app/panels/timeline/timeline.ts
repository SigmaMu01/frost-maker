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
    // Load all available dates from dataset
    effect(() => {
      if (this.dataConnector.isJSONLoaded()) {
        this.timeFrameDates.set(this.dataConnector.getTimeFrameDates());
      }
    });
    // Update selected frame on the timeline
    effect(() => {
      this.selectedFrame.set(this.dataConnector.selectedFrame());
    });
  }

  onSelectFrame(index: number) {
    this.dataConnector.setCurrentFrame(index);
  }
}
