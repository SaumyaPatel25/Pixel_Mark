import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We will simulate the detectRenderer logic from overlay.js here 
// since overlay.js is an IIFE meant for direct browser injection.

function detectRendererMock(windowMock: any, documentMock: any) {
  var hasCanvas = false;
  var canvasCount = 0;
  var isWebGL = false;
  var isWebGL2 = false;
  var rafDetected = false;
  var threeDetected = false;

  if (windowMock.THREE || windowMock.BABYLON || windowMock.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    threeDetected = true;
  }

  var canvases = documentMock.querySelectorAll('canvas');
  canvasCount = canvases.length;
  if (canvasCount > 0) {
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      if (c.width > 0 && c.height > 0) {
        hasCanvas = true;
        if (c.width > 300 || c.height > 300) {
          var gl = null;
          try { gl = c.getContext('webgl2'); if (gl) isWebGL2 = true; } catch(e) {}
          if (!gl) {
            try { gl = c.getContext('webgl') || c.getContext('experimental-webgl'); if (gl) isWebGL = true; } catch(e) {}
          }
        }
      }
    }
  }

  var rendererType = 'dom';
  if (isWebGL2) rendererType = 'webgl2';
  else if (isWebGL) rendererType = 'webgl';
  else if (hasCanvas || threeDetected) rendererType = 'canvas2d';

  if (rendererType !== 'dom' && documentMock.querySelectorAll('*').length > 100) {
    rendererType = 'mixed';
  }

  return { rendererType, hasCanvas, canvasCount, threeDetected };
}

describe('renderDetector (overlay.js port)', () => {
  it('detects a plain DOM page as dom', () => {
    const win = {}
    const doc = {
      querySelectorAll: (sel: string) => {
        if (sel === 'canvas') return []
        if (sel === '*') return new Array(50) // 50 elements
        return []
      }
    }

    const res = detectRendererMock(win, doc)
    expect(res.rendererType).toBe('dom')
    expect(res.hasCanvas).toBe(false)
  })

  it('detects THREE.js presence', () => {
    const win = { THREE: {} }
    const doc = {
      querySelectorAll: (sel: string) => {
        if (sel === 'canvas') return []
        if (sel === '*') return new Array(50) 
        return []
      }
    }

    const res = detectRendererMock(win, doc)
    expect(res.rendererType).toBe('canvas2d') // Falls back to canvas2d if no actual webgl context found but THREE is global
    expect(res.threeDetected).toBe(true)
  })

  it('detects WebGL2 and classifies as webgl2', () => {
    const win = {}
    const doc = {
      querySelectorAll: (sel: string) => {
        if (sel === 'canvas') {
          return [{
            width: 800,
            height: 600,
            getContext: (type: string) => type === 'webgl2' ? {} : null
          }]
        }
        if (sel === '*') return new Array(50)
        return []
      }
    }

    const res = detectRendererMock(win, doc)
    expect(res.rendererType).toBe('webgl2')
    expect(res.hasCanvas).toBe(true)
  })

  it('classifies as mixed when heavy DOM is present alongside canvas', () => {
    const win = {}
    const doc = {
      querySelectorAll: (sel: string) => {
        if (sel === 'canvas') {
          return [{
            width: 800,
            height: 600,
            getContext: (type: string) => type === 'webgl' ? {} : null
          }]
        }
        if (sel === '*') return new Array(150) // > 100 triggers mixed
        return []
      }
    }

    const res = detectRendererMock(win, doc)
    expect(res.rendererType).toBe('mixed')
  })
})
