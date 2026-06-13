export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function initScreenshotCapture(): Promise<MediaStream | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    console.warn('[Screen Capture] getDisplayMedia is not supported in this browser.');
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser'
      },
      audio: false,
      // @ts-ignore
      preferCurrentTab: true,
    });
    return stream;
  } catch (error: any) {
    if (error && error.name === 'NotAllowedError') {
      console.warn('[Screen Capture] Screen capture permission denied by user.');
    } else {
      console.error('[Screen Capture] Failed to initialize stream:', error);
    }
    return null;
  }
}

export async function captureFrameFromStream(
  stream: MediaStream,
  cropRect?: CropRect,
  elementHighlightRect?: CropRect
): Promise<string | null> {
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2d context for screenshot canvas');
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop video playback but DO NOT stop the stream tracks
    video.pause();
    video.srcObject = null;
    
    if (!cropRect) {
      return canvas.toDataURL('image/png');
    }

    // Attempt to crop the canvas
    const cropCanvas = document.createElement('canvas');
    
    // Calculate scale factor (video dimensions vs viewport dimensions)
    const scaleX = canvas.width / window.innerWidth;
    const scaleY = canvas.height / window.innerHeight;

    let { x, y, width, height } = cropRect;
    
    // Clamp to viewport
    const srcX = Math.max(0, x * scaleX);
    const srcY = Math.max(0, y * scaleY);
    const srcW = Math.min(canvas.width - srcX, width * scaleX);
    const srcH = Math.min(canvas.height - srcY, height * scaleY);

    if (srcW <= 0 || srcH <= 0) {
      return canvas.toDataURL('image/png'); // Fallback to full if crop is invalid
    }

    cropCanvas.width = srcW;
    cropCanvas.height = srcH;
    const cropCtx = cropCanvas.getContext('2d');
    
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        srcX, srcY, srcW, srcH,
        0, 0, srcW, srcH
      );
      
      // Draw purple highlight box on crop if elementHighlightRect is provided
      if (elementHighlightRect) {
        const highlightX = (elementHighlightRect.x - cropRect.x) * scaleX;
        const highlightY = (elementHighlightRect.y - cropRect.y) * scaleY;
        const highlightW = elementHighlightRect.width * scaleX;
        const highlightH = elementHighlightRect.height * scaleY;
        
        cropCtx.strokeStyle = '#7c3aed';
        cropCtx.lineWidth = Math.max(2, 3 * scaleX); // 2px CSS border
        cropCtx.strokeRect(highlightX, highlightY, highlightW, highlightH);
      } else {
        // Fallback or region selection: draw border around the crop boundary if desired
        cropCtx.strokeStyle = '#7c3aed';
        cropCtx.lineWidth = Math.max(2, 3 * scaleX);
        cropCtx.strokeRect(0, 0, srcW, srcH);
      }
      
      return cropCanvas.toDataURL('image/png');
    }

    return null;
  } catch (error) {
    console.error('[Screen Capture] Failed to capture frame from stream:', error);
    return null;
  }
}

export async function captureFullPage(
  stream: MediaStream,
  iframeNode?: HTMLIFrameElement | null
): Promise<string | null> {
  if (!iframeNode || !iframeNode.contentWindow) {
    console.warn('[Full Page Stitching] Iframe node not available, falling back to viewport capture.');
    return captureFrameFromStream(stream);
  }

  let iframeWin: Window;
  let iframeDoc: Document;

  try {
    iframeWin = iframeNode.contentWindow;
    iframeDoc = iframeWin.document;
    // Trigger access check to test cross-origin boundary
    const _ = iframeDoc.body;
  } catch (err) {
    console.warn('[Full Page Stitching] Cannot access iframe document due to cross-origin security boundary. Falling back to single viewport capture.', err);
    return captureFrameFromStream(stream);
  }

  // 1. Get original scroll position and document layout metrics
  const originalScrollX = iframeWin.scrollX || 0;
  const originalScrollY = iframeWin.scrollY || 0;

  const docWidth = Math.max(
    iframeDoc.documentElement.scrollWidth,
    iframeDoc.body.scrollWidth,
    iframeWin.innerWidth
  );
  const docHeight = Math.max(
    iframeDoc.documentElement.scrollHeight,
    iframeDoc.body.scrollHeight,
    iframeWin.innerHeight
  );

  const viewportWidth = iframeWin.innerWidth;
  const viewportHeight = iframeWin.innerHeight;

  // Get the iframe's bounding rect inside the parent window.
  const iframeRect = iframeNode.getBoundingClientRect();

  console.log(`[PixelMark Screenshot] full-page stitch height=${docHeight} viewportHeight=${viewportHeight}`);

  // Prepare final stitched canvas
  const stitchedCanvas = document.createElement('canvas');
  stitchedCanvas.width = viewportWidth;
  stitchedCanvas.height = docHeight;
  const stitchedCtx = stitchedCanvas.getContext('2d');

  if (!stitchedCtx) {
    console.error('[Full Page Stitching] Failed to create 2d context for stitched canvas');
    return captureFrameFromStream(stream);
  }

  // Constrain max memory usage (e.g. maximum height of 8000px)
  const MAX_STITCH_HEIGHT = 8000;
  if (stitchedCanvas.height > MAX_STITCH_HEIGHT) {
    console.warn(`[PixelMark Screenshot] height ${stitchedCanvas.height} exceeds max ${MAX_STITCH_HEIGHT}. Clamping.`);
    stitchedCanvas.height = MAX_STITCH_HEIGHT;
  }

  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = reject;
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('Could not get 2d context for temp canvas');
    }

    const scaleX = tempCanvas.width / window.innerWidth;
    const scaleY = tempCanvas.height / window.innerHeight;

    // Source rect for the iframe inside the parent window (scale it to video size)
    const srcX = iframeRect.left * scaleX;
    const srcY = iframeRect.top * scaleY;
    const srcW = iframeRect.width * scaleX;
    const srcH = iframeRect.height * scaleY;

    let currentY = 0;
    let frameIndex = 0;

    // Hide scrollbars in the iframe temporarily to avoid capturing scrollbars
    const originalOverflow = iframeDoc.documentElement.style.overflow;
    iframeDoc.documentElement.style.overflow = 'hidden';

    while (currentY < stitchedCanvas.height) {
      // Scroll iframe to current Y
      iframeWin.scrollTo(originalScrollX, currentY);
      
      // Wait briefly for content to settle (render/lazy load/etc)
      await new Promise(resolve => setTimeout(resolve, 250));

      // Draw current video frame to temp canvas
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      // Crop the iframe part from the temp canvas and copy it to the stitched canvas
      const destY = currentY;
      const destH = Math.min(viewportHeight, stitchedCanvas.height - currentY);
      
      // Determine source height based on scale
      const cropH = destH * scaleY;

      stitchedCtx.drawImage(
        tempCanvas,
        srcX, srcY, srcW, cropH,
        0, destY, viewportWidth, destH
      );

      console.log(`[PixelMark Screenshot] stitched frame=${frameIndex} yOffset=${destY}`);
      
      currentY += viewportHeight;
      frameIndex++;

      // Safety break to prevent infinite loops / excessive memory
      if (frameIndex > 15) {
        console.warn('[PixelMark Screenshot] reached maximum full-page scroll steps');
        break;
      }
    }

    // Restore scrollbars & scroll position
    iframeDoc.documentElement.style.overflow = originalOverflow;
    iframeWin.scrollTo(originalScrollX, originalScrollY);

    // Stop video playback but DO NOT stop the stream tracks
    video.pause();
    video.srcObject = null;

    console.log(`[PixelMark Screenshot] stitched frames=${frameIndex}`);
    return stitchedCanvas.toDataURL('image/png');

  } catch (error) {
    console.error('[PixelMark Screenshot] Stitching failed, using single viewport fallback:', error);
    // Restore scroll and scrollbar in case of error
    try {
      iframeWin.scrollTo(originalScrollX, originalScrollY);
    } catch (_) {}
    return captureFrameFromStream(stream);
  }
}
