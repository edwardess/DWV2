// ImageLoadingQueue.ts
class ImageLoadingQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing: boolean = false;
  private maxConcurrent: number = 3;
  private currentlyLoading: number = 0;

  async add(loadFn: () => Promise<void>): Promise<void> {
    this.queue.push(loadFn);
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.currentlyLoading >= this.maxConcurrent) return;
    this.processing = true;

    while (this.queue.length > 0 && this.currentlyLoading < this.maxConcurrent) {
      const loadFn = this.queue.shift();
      if (loadFn) {
        this.currentlyLoading++;
        try {
          await loadFn();
        } catch (error) {
          console.error('Error loading image:', error);
        }
        this.currentlyLoading--;
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Create a singleton instance
export const imageLoadingQueue = new ImageLoadingQueue(); 