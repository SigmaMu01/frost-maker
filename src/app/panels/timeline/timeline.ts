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

  private isDragging = false;
  private isZooming = false;

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
      if (this.isZooming) return;

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

  // =========================
  // Mouse control
  // =========================

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // LMB only
    this.isDragging = true;
    this.updateFrameFromMouse(event);
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    this.updateFrameFromMouse(event);
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    this.isZooming = true;

    const el = this.nav().nativeElement;

    const rect = el.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    const scrollLeft = el.scrollLeft;
    const worldX = scrollLeft + mouseX;

    const oldWidth = this.frameWidth();

    const delta = Math.sign(event.deltaY);
    const newWidth = Math.max(5, Math.min(80, oldWidth - delta * 2));

    if (newWidth === oldWidth) {
      this.isZooming = false;
      return;
    }

    const ratio = newWidth / oldWidth;

    this.frameWidth.set(newWidth);

    el.scrollLeft = worldX * ratio - mouseX;

    requestAnimationFrame(() => {
      this.isZooming = false;
    });
  }

  private updateFrameFromMouse(event: MouseEvent) {
    const navEl = this.nav().nativeElement;

    const rect = navEl.getBoundingClientRect();

    const x = event.clientX - rect.left + navEl.scrollLeft;

    const index = Math.floor(x / this.frameWidth());

    const clamped = Math.max(0, Math.min(index, this.timeFrameDates().length - 1));

    this.onSelectFrame(clamped);
  }
}
