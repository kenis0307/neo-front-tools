import TaskQueue from "./TaskQueue";

export type PriorityCalculator = (url: string) => number;

export interface ImageCacheConfig {
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  priorityCalculator?: PriorityCalculator;
}

const defaultPriorityCalculator: PriorityCalculator = (url: string): number => {
  if (!url.includes("getThumbnail") && !url.includes("getVideoCover")) {
    return 2;
  } else if (url.includes("getThumbnail")) {
    return 1;
  }
  return 0;
};

export default class ImageCache {
  private cache: Map<string, HTMLImageElement>;
  private loadingPromises: Map<string, Promise<HTMLImageElement>>;
  private taskQueue: TaskQueue;
  private priorityCalculator: PriorityCalculator;

  constructor(config: ImageCacheConfig = {}) {
    const {
      concurrency = 30,
      maxRetries = 3,
      retryDelay = 1000,
      priorityCalculator = defaultPriorityCalculator,
    } = config;

    this.cache = new Map();
    this.loadingPromises = new Map();
    this.priorityCalculator = priorityCalculator;
    
    this.taskQueue = new TaskQueue({
      concurrency,
      defaultTaskOptions: {
        maxRetries,
        retryDelay,
      },
    });
  }

  public async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url)!);
    }
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadTask = (): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = (): void => {
          if (!this.cache.has(url)) {
            this.cache.set(url, img);
          }
          this.loadingPromises.delete(url);
          resolve(this.cache.get(url)!);
        };

        img.onerror = (): void => {
          this.loadingPromises.delete(url);
          reject(new Error(`图片加载失败: ${url}`));
        };

        img.src = url;
      });
    };

    const priority = this.priorityCalculator(url);

    const promise = this.taskQueue.add(loadTask, {
      priority,
      retryCondition: (error: Error) => error.message.includes("图片加载失败"),
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  public async preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(urls.map((url) => this.loadImage(url)));
  }

  public clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
      this.loadingPromises.delete(url);
    } else {
      this.cache.clear();
      this.loadingPromises.clear();
    }
  }

  public getCachedImage(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  public hasImage(url: string): boolean {
    return this.cache.has(url);
  }

  public setPriorityCalculator(calculator: PriorityCalculator): void {
    this.priorityCalculator = calculator;
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}