import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DataConnector } from '../../shared/services/data-connector';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-timeline',
  imports: [DatePipe],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {
  private readonly dataConnector = inject(DataConnector);
  readonly timeFrameDates = signal<string[]>([]);
  readonly selectedTimeFrame = signal<number>(0);

  readonly nav = viewChild.required<ElementRef>('timelineNav');

  readonly isPlaying = signal(false);
  readonly fps = signal(10);
  private playInterval: any = null;

  readonly frameWidth = signal(20); // px

  readonly labels = computed(() => {
    const dates = this.timeFrameDates();
    const width = this.frameWidth();

    const step = Math.ceil(80 / width); // ~80px per label

    return dates.map((d, i) => ({
      date: d,
      index: i,
      show: i % step === 0,
    }));
  });

  constructor() {
    // Load all available dates from dataset
    effect(() => {
      if (this.dataConnector.isJSONLoaded()) {
        this.timeFrameDates.set(this.dataConnector.getTimeFrameDates());
      } else {
        this.timeFrameDates.set([]);
      }
    });

    // Update selected frame on the timeline
    effect(() => {
      this.selectedTimeFrame.set(this.dataConnector.selectedFrame());
    });

    effect(() => {
      const index = this.selectedTimeFrame();
      const el = this.nav().nativeElement;

      const x = index * this.frameWidth();

      el.scrollTo({
        left: x - el.clientWidth / 2,
        behavior: 'smooth',
      });
    });
  }

  onSelectFrame(index: number) {
    this.dataConnector.setCurrentFrame(index);
  }

  togglePlay() {
    if (this.isPlaying()) {
      clearInterval(this.playInterval);
      this.isPlaying.set(false);
      return;
    }

    this.isPlaying.set(true);

    this.playInterval = setInterval(() => {
      let next = this.selectedTimeFrame() + 1;

      if (next >= this.timeFrameDates().length) {
        // next = 0; // loop
        clearInterval(this.playInterval);
        this.goStart();
        this.isPlaying.set(false);
        return;
      }

      this.onSelectFrame(next);
    }, 1000 / this.fps());
  }

  goStart() {
    this.onSelectFrame(0);
  }

  goEnd() {
    this.onSelectFrame(this.timeFrameDates().length - 1);
  }

  nextFrame() {
    this.onSelectFrame(Math.min(this.selectedTimeFrame() + 1, this.timeFrameDates().length - 1));
  }

  prevFrame() {
    this.onSelectFrame(Math.max(this.selectedTimeFrame() - 1, 0));
  }
}
