import { inject, Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import html2canvas from 'html2canvas';
import { ThreeContext } from '../three-context';
import { DataConnector } from '../data-connector';

@Injectable({
  providedIn: 'root',
})
export class MediaSaver {
  private readonly three = inject(ThreeContext);
  private readonly dataConnector = inject(DataConnector);

  async saveScreenshot() {
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

  async recordAnimation() {
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
