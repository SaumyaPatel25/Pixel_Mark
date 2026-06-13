import { captureFrameFromStream, captureFullPage, CropRect } from './screenshotCapture';
import { api } from '@/lib/api';
import { useScreenshotStore, ScreenshotMode } from '@/store/screenshotStore';

export interface CaptureStrategyResult {
  dataUrl: string;
  source: 'element' | 'fullpage' | 'region' | 'playwright' | 'placeholder';
}

export async function orchestrateScreenshot(
  sessionId: string,
  url: string,
  mode: ScreenshotMode,
  cropRect?: CropRect,
  shareToken?: string,
  iframeNode?: HTMLIFrameElement | null
): Promise<CaptureStrategyResult> {
  
  const { screenshotStream, screenshotPermission } = useScreenshotStore.getState();

  console.log(`[PixelMark Screenshot] mode=${mode} permission=${screenshotPermission}`);

  // Layer 1: Screen Capture API via active stream
  if (screenshotStream && screenshotPermission === 'granted') {
    let screenCapture: string | null = null;
    let sourceMode: 'element' | 'fullpage' | 'region' = mode;
    
    if (mode === 'fullpage') {
      screenCapture = await captureFullPage(screenshotStream, iframeNode);
    } else {
      let adjustedCrop: CropRect | undefined = cropRect;
      let highlightRect: CropRect | undefined = undefined;

      if (mode === 'element' && cropRect && iframeNode) {
        const iframeRect = iframeNode.getBoundingClientRect();

        // Save original bounding rect relative to the parent viewport
        highlightRect = {
          x: cropRect.x + iframeRect.left,
          y: cropRect.y + iframeRect.top,
          width: cropRect.width,
          height: cropRect.height
        };

        // Add 8px padding around element
        const padding = 8;
        const expandedX = Math.max(0, cropRect.x - padding);
        const expandedY = Math.max(0, cropRect.y - padding);
        const expandedWidth = Math.min(iframeRect.width - expandedX, cropRect.width + padding * 2);
        const expandedHeight = Math.min(iframeRect.height - expandedY, cropRect.height + padding * 2);

        adjustedCrop = {
          x: expandedX + iframeRect.left,
          y: expandedY + iframeRect.top,
          width: expandedWidth,
          height: expandedHeight
        };
      }

      screenCapture = await captureFrameFromStream(screenshotStream, adjustedCrop, highlightRect);
      
      if (adjustedCrop) {
        console.log(`[PixelMark Screenshot] crop rect=${Math.round(adjustedCrop.x)},${Math.round(adjustedCrop.y)},${Math.round(adjustedCrop.width)},${Math.round(adjustedCrop.height)}`);
      }
    }
    
    if (screenCapture) {
      console.log(`[PixelMark Screenshot] source=screen-capture`);
      return { dataUrl: screenCapture, source: sourceMode };
    }
  }

  // Layer 2: Server-side Playwright via backend API
  try {
    console.log('[PixelMark Screenshot] Screen Capture unavailable/failed. Falling back to Playwright (Layer 2).');
    const response = await api.screenshot.take(sessionId, url, shareToken);
    if (response && response.screenshot_url) {
      console.log(`[PixelMark Screenshot] source=playwright`);
      return { dataUrl: response.screenshot_url, source: 'playwright' };
    }
  } catch (err) {
    console.error('[PixelMark Screenshot] Playwright fallback failed:', err);
  }

  // Layer 3: Placeholder generator
  console.warn('[PixelMark Screenshot] Both primary layers failed. Using placeholder.');
  console.log(`[PixelMark Screenshot] source=placeholder`);
  return { dataUrl: createPlaceholderScreenshot(url, mode), source: 'placeholder' };
}

function createPlaceholderScreenshot(url: string, mode: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Elegant slate backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid pattern
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Subtle gradient ring
    const grad = ctx.createRadialGradient(600, 400, 50, 600, 400, 300);
    grad.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(600, 400, 300, 0, Math.PI * 2);
    ctx.fill();

    // Text details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PixelMark Screenshot Placeholder', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`Target: ${url}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Mode: ${mode}`, canvas.width / 2, canvas.height / 2 + 45);
    ctx.fillText(`Timestamp: ${new Date().toISOString()}`, canvas.width / 2, canvas.height / 2 + 80);

    // Accent line
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 - 90);
    ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 - 90);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

export function createDetailedPlaceholderScreenshot({
  url,
  title,
  tag,
  selector,
  reason,
  timestamp
}: {
  url: string;
  title: string;
  tag: string;
  selector: string;
  reason: string;
  timestamp: string;
}): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Elegant slate backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid pattern
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.1)'; // red tint
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Centered block
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Screenshot unavailable', canvas.width / 2, 220);

    ctx.fillStyle = '#f87171'; // red accent
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Reason: ${reason}`, canvas.width / 2, 280);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const leftMargin = 300;
    ctx.fillText(`Page Title: ${title}`, leftMargin, 360);
    ctx.fillText(`Page URL: ${url}`, leftMargin, 410);
    ctx.fillText(`Element Tag: <${tag.toLowerCase()}>`, leftMargin, 460);
    ctx.fillText(`Selector: ${selector}`, leftMargin, 510);
    ctx.fillText(`Timestamp: ${timestamp}`, leftMargin, 560);

    // Border around details
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftMargin - 40, 310, 680, 310);
  }
  return canvas.toDataURL('image/png');
}
