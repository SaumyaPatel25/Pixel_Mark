type QueueItem = {
  id: string
  fn: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  retries: number
  label: string
}

const WRITE_CONCURRENCY = 1
const READ_CONCURRENCY  = 4
const MAX_RETRIES = 3
const RETRY_BASE_MS = 800

class ApiQueue {
  private writeQueue: QueueItem[] = []
  private readQueue: QueueItem[]  = []
  private activeWrites = 0
  private activeReads  = 0
  private pendingWrites: Map<string, Promise<unknown>> = new Map()
  
  private listeners: Set<(status: QueueStatus) => void> = new Set()
  
  enqueueWrite<T>(label: string, fn: () => Promise<T>, dedupeKey?: string): Promise<T> {
    if (dedupeKey && this.pendingWrites.has(dedupeKey)) {
      return this.pendingWrites.get(dedupeKey) as Promise<T>
    }
    
    const promise = new Promise<T>((resolve, reject) => {
      this.writeQueue.push({
        id: crypto.randomUUID(),
        fn, 
        resolve: resolve as (v: unknown) => void,
        reject, 
        retries: 0, 
        label
      })
      this.drainWrites()
    })

    if (dedupeKey) {
      this.pendingWrites.set(dedupeKey, promise as Promise<unknown>)
      promise.finally(() => this.pendingWrites.delete(dedupeKey))
    }
    
    return promise
  }
  
  enqueueRead<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.readQueue.push({
        id: crypto.randomUUID(),
        fn, 
        resolve: resolve as (v: unknown) => void,
        reject, 
        retries: 0, 
        label
      })
      this.drainReads()
    })
  }
  
  private async drainWrites() {
    if (this.activeWrites >= WRITE_CONCURRENCY) return
    const item = this.writeQueue.shift()
    if (!item) return
    this.activeWrites++
    this.notify()
    try {
      const result = await this.executeWithRetry(item)
      item.resolve(result)
    } catch (err) {
      item.reject(err)
    } finally {
      this.activeWrites--
      this.notify()
      this.drainWrites()
    }
  }
  
  private async drainReads() {
    while (this.activeReads < READ_CONCURRENCY && this.readQueue.length > 0) {
      const item = this.readQueue.shift()!
      this.activeReads++
      this.executeWithRetry(item)
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.activeReads--
          this.notify()
          this.drainReads()
        })
    }
  }
  
  private async executeWithRetry(item: QueueItem): Promise<unknown> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await item.fn()
      } catch (err: unknown) {
        const isRetryable = err instanceof Error &&
          (err.message.includes('fetch') || err.message.includes('network'))
        if (!isRetryable || attempt === MAX_RETRIES) throw err
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
      }
    }
    throw new Error('Max retries exceeded')
  }
  
  subscribe(fn: (status: QueueStatus) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  
  private notify() {
    const status = this.getStatus()
    this.listeners.forEach(fn => fn(status))
  }
  
  getStatus(): QueueStatus {
    return {
      pendingWrites: this.writeQueue.length + this.activeWrites,
      pendingReads:  this.readQueue.length  + this.activeReads,
      isIdle: this.writeQueue.length === 0 && this.activeWrites === 0,
    }
  }
}

export type QueueStatus = {
  pendingWrites: number
  pendingReads: number
  isIdle: boolean
}

export const apiQueue = new ApiQueue()
