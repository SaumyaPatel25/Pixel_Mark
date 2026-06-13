import { create } from 'zustand'

export type ScreenshotMode = 'element' | 'fullpage' | 'region'
export type ScreenshotPermission = 'pending' | 'granted' | 'denied' | 'skipped' | 'idle' | 'ended'

interface ScreenshotState {
  screenshotPermission: ScreenshotPermission
  screenshotStream: MediaStream | null
  screenshotMode: ScreenshotMode
  screenshotStatus: 'idle' | 'capturing' | 'success' | 'failed'
  screenshotDataUrl: string | null
  screenshotSource: string | null
  screenshotError: string | null
  setPermission: (perm: ScreenshotPermission) => void
  setStream: (stream: MediaStream | null) => void
  setMode: (mode: ScreenshotMode) => void
  setScreenshotState: (
    status: 'idle' | 'capturing' | 'success' | 'failed',
    dataUrl: string | null,
    source: string | null,
    error: string | null
  ) => void
  teardown: () => void
}

export const useScreenshotStore = create<ScreenshotState>((set, get) => ({
  screenshotPermission: 'idle',
  screenshotStream: null,
  screenshotMode: 'element',
  screenshotStatus: 'idle',
  screenshotDataUrl: null,
  screenshotSource: null,
  screenshotError: null,
  setPermission: (perm) => set({ screenshotPermission: perm }),
  setStream: (stream) => {
    const oldStream = get().screenshotStream;
    if (oldStream && oldStream !== stream) {
      oldStream.getTracks().forEach(t => t.stop());
    }
    set({ screenshotStream: stream })
  },
  setMode: (mode) => set({ screenshotMode: mode }),
  setScreenshotState: (status, dataUrl, source, error) =>
    set({
      screenshotStatus: status,
      screenshotDataUrl: dataUrl,
      screenshotSource: source,
      screenshotError: error
    }),
  teardown: () => {
    const { screenshotStream } = get()
    if (screenshotStream) {
      screenshotStream.getTracks().forEach(t => t.stop())
    }
    set({
      screenshotStream: null,
      screenshotPermission: 'idle',
      screenshotStatus: 'idle',
      screenshotDataUrl: null,
      screenshotSource: null,
      screenshotError: null
    })
  }
}))
