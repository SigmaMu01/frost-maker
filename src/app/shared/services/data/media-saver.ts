import { inject, Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import html2canvas from 'html2canvas';
import { ThreeContext } from '../three-context';
import { DataConnector } from '../data-connector';
import { MapWorker } from '../map-worker';

@Injectable({
  providedIn: 'root',
})
export class MediaSaver {
  private readonly three = inject(ThreeContext);
  private readonly dataConnector = inject(DataConnector);
  private readonly mapWorker = inject(MapWorker);

  async saveFabricScreenshot() {
    const canvas = this.mapWorker.getCanvas();
    const fabricCanvasEl = canvas.getElement(); // lower canvas (rendered)
    const legendEl = document.querySelector('#canvas-legend') as HTMLElement;

    // Ensure latest render is applied
    canvas.requestRenderAll();

    // Capture legend (same as before)
    const legendCanvas = await html2canvas(legendEl, {
      backgroundColor: null,
      scale: window.devicePixelRatio,
    });

    // Use Fabric export (includes viewportTransform)
    const fabricExport = canvas.toCanvasElement(window.devicePixelRatio);

    // Create final canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = fabricExport.width;
    finalCanvas.height = fabricExport.height;

    const ctx = finalCanvas.getContext('2d')!;

    // Draw Fabric scene
    // ctx.drawImage(fabricExport, 0, 0);
    const containerRect = this.mapWorker.getContainer().getBoundingClientRect();
    const canvasRect = fabricCanvasEl.getBoundingClientRect();

    const scaleX = fabricExport.width / canvasRect.width;
    const scaleY = fabricExport.height / canvasRect.height;

    const sx = (containerRect.left - canvasRect.left) * scaleX;
    const sy = (containerRect.top - canvasRect.top) * scaleY;
    const sw = containerRect.width * scaleX;
    const sh = containerRect.height * scaleY;

    ctx.drawImage(
      fabricExport,
      sx,
      sy,
      sw,
      sh, // source crop
      0,
      0,
      sw,
      sh // destination
    );

    // Overlay positioning
    const legendRect = legendEl.getBoundingClientRect();

    const x = (legendRect.left - canvasRect.left) * scaleX;
    const y = (legendRect.top - canvasRect.top) * scaleY;
    const w = legendRect.width * scaleX;
    const h = legendRect.height * scaleY;

    ctx.drawImage(legendCanvas, x, y, w, h);

    // Export
    const dataURL = finalCanvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `fabric_${formatDate(new Date(), 'yyyy-MM-dd_HHmmss', 'en-US')}.png`;
    a.click();
  }

  async saveThreeScreenshot() {
    const threeCanvas = this.three.renderer.domElement;
    const legendEl = document.querySelector('#canvas-legend') as HTMLElement;

    // Capture legend
    const legendCanvas = await html2canvas(legendEl, {
      backgroundColor: null,
      scale: window.devicePixelRatio,
    });

    // Create final canvas (match WebGL buffer size, not CSS size)
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = threeCanvas.width;
    finalCanvas.height = threeCanvas.height;

    const ctx = finalCanvas.getContext('2d')!;

    // Draw Three.js scene
    ctx.drawImage(threeCanvas, 0, 0);

    const rect = legendEl.getBoundingClientRect();
    const canvasRect = threeCanvas.getBoundingClientRect();

    const scaleX = threeCanvas.width / canvasRect.width;
    const scaleY = threeCanvas.height / canvasRect.height;

    const x = (rect.left - canvasRect.left) * scaleX;
    const y = (rect.top - canvasRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;

    ctx.drawImage(legendCanvas, x, y, w, h);

    // Export
    const dataURL = finalCanvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `scene_${formatDate(new Date(), 'yyyy-MM-dd_HHmmss', 'en-US')}.png`;
    a.click();
  }

  async recordFabricAnimation() {
    const canvas = this.mapWorker.getCanvas();
    const fabricCanvasEl = canvas.getElement();
    const legendEl = document.querySelector('#canvas-legend') as HTMLElement;

    const container = this.mapWorker.getContainer();
    const containerRect = container.getBoundingClientRect();
    const canvasRect = fabricCanvasEl.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    // Recording canvas (final output)
    const recordCanvas = document.createElement('canvas');
    recordCanvas.width = containerRect.width * dpr;
    recordCanvas.height = containerRect.height * dpr;

    const ctx = recordCanvas.getContext('2d')!;

    const stream = recordCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    // Pre-capture legend once (faster)
    const legendCanvas = await html2canvas(legendEl, {
      backgroundColor: null,
      scale: dpr,
    });

    const scaleX = (canvas.width * dpr) / canvasRect.width;
    const scaleY = (canvas.height * dpr) / canvasRect.height;

    for (let i = 0; i < this.dataConnector.totalFrames(); i++) {
      this.dataConnector.selectedFrame.set(i);

      // Wait for Angular + Fabric render
      await new Promise((r) => requestAnimationFrame(r));

      // Force sync render (important)
      canvas.renderAll();

      // Export Fabric frame
      const fabricExport = canvas.toCanvasElement(dpr);

      // Crop visible viewport
      const sx = (containerRect.left - canvasRect.left) * scaleX;
      const sy = (containerRect.top - canvasRect.top) * scaleY;
      const sw = containerRect.width * scaleX;
      const sh = containerRect.height * scaleY;

      ctx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);

      ctx.drawImage(fabricExport, sx, sy, sw, sh, 0, 0, recordCanvas.width, recordCanvas.height);

      // ---- Draw legend (container-relative) ----
      const legendRect = legendEl.getBoundingClientRect();

      const lx = (legendRect.left - containerRect.left) * dpr;
      const ly = (legendRect.top - containerRect.top) * dpr;
      const lw = legendRect.width * dpr;
      const lh = legendRect.height * dpr;

      ctx.drawImage(legendCanvas, lx, ly, lw, lh);

      // Push frame
      await new Promise((r) => setTimeout(r, 1000 / 30));
    }

    recorder.stop();

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fabric_animation.webm';
      a.click();

      URL.revokeObjectURL(url);
    };
  }

  async recordThreeAnimation() {
    const canvas = this.three.renderer.domElement;

    const stream = canvas.captureStream(30); // 30 FPS

    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    // Play the timeline
    for (let i = 0; i < this.dataConnector.totalFrames(); i++) {
      this.dataConnector.selectedFrame.set(i);

      // Wait for render
      await new Promise((r) => requestAnimationFrame(r));
    }

    recorder.stop();

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.webm';
      a.click();

      URL.revokeObjectURL(url);
    };
  }
}
