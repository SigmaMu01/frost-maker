import { AfterViewInit, Component, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import * as echarts from 'echarts';

import { MapWorker } from '../../shared/services/map-worker';
import { DataConnector } from '../../shared/services/data-connector';
import { BearingCapacityManager } from '../../shared/services/bearing-capacity-manager';
import { PileManager } from '../../shared/services/pile-manager';

@Component({
  selector: 'app-charts',
  imports: [],
  templateUrl: './charts.html',
  styleUrl: './charts.scss',
})
export class Charts implements AfterViewInit {
  private readonly mapWorker = inject(MapWorker);
  private readonly bearingCapacityManager = inject(BearingCapacityManager);
  private readonly pileManager = inject(PileManager);
  private readonly dataConnector = inject(DataConnector);

  chartRef = viewChild<ElementRef<HTMLDivElement>>('chartContainer');

  private chart?: echarts.ECharts;

  private container = signal<HTMLDivElement | null>(null);

  // Cache results to avoid recomputation
  private cache = new Map<string, Float32Array>();

  constructor() {
    effect(() => {
      const piles = this.pileManager.selectedPiles();
      const timestamps = this.dataConnector.getTimeFrameDates();

      if (!piles.length || !timestamps) return;

      untracked(() => this.updateChart());
    });
  }

  ngAfterViewInit() {
    this.setContainer(this.chartRef()!.nativeElement);
    this.updateChart();
  }

  // Angular doesn't give ref directly → use setter
  setContainer(el: HTMLDivElement) {
    this.container.set(el);

    if (!this.chart) {
      this.chart = echarts.init(el);
    }
  }

  private updateChart() {
    const piles = this.pileManager.getSelectedPileData();
    const timestamps = this.dataConnector.getTimeFrameDates() ?? [];

    if (!this.chart) return;

    if (!piles.length) {
      this.chart.setOption({
        title: {
          text: 'Select piles to display bearing capacity',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#888',
            fontSize: 16,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      });
      return;
    }

    const series: echarts.SeriesOption[] = [];

    for (const pile of piles) {
      let data = this.cache.get(pile.id);

      if (!data) {
        // compute once
        const result = this.bearingCapacityManager.computeForAllPiles([pile]);
        data = result.get(pile.id)!;
        this.cache.set(pile.id, data!);
      }

      series.push({
        name: `Pile ${pile.order}`,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: timestamps.map((t: any, i: number) => [t, data![i]]),
        lineStyle: {
          width: 2,
          color: this.pileManager.getColor(pile.id),
        },
        itemStyle: {
          color: this.pileManager.getColor(pile.id),
        },
      });
    }

    this.chart.setOption({
      animation: true,

      tooltip: {
        trigger: 'axis',
      },

      legend: {
        top: 10,
      },

      grid: {
        left: 60,
        right: 20,
        top: 60,
        bottom: 50,
      },

      xAxis: {
        type: 'category',
        name: 'Time',
        data: timestamps,
      },

      yAxis: {
        type: 'value',
        name: 'Bearing capacity (tf/m²)',
      },

      dataZoom: [
        {
          type: 'inside', // mouse wheel + drag
          xAxisIndex: 0,
        },
        {
          type: 'slider', // visible minimap
          xAxisIndex: 0,
          height: 40,
          bottom: 10,
        },
      ],

      series,
    });
  }
}
