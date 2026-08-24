/**
 * Advanced Main Thread Yielding Mechanism
 * Leverages the Prioritized Task Scheduling API (scheduler.yield())
 * with fallback to setTimeout(0) to break up long tasks,
 * ensuring high-priority user inputs are never blocked.
 */
export async function yieldToMain(): Promise<void> {
  if (typeof globalThis !== 'undefined' && (globalThis as any).scheduler?.yield) {
    try {
      return await (globalThis as any).scheduler.yield();
    } catch {
      // Fallback if yield rejects or is unavailable
    }
  }
  return new Promise((resolve) => {
    if (typeof setTimeout !== 'undefined') {
      setTimeout(resolve, 0);
    } else {
      resolve();
    }
  });
}
