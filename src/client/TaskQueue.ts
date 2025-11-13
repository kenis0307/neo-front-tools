/// <reference lib="es2015" />
/// <reference lib="es2018" />

/**
 * @ts-nocheck
 * @ts-ignore
 * @ts-expect-error
 */

interface TaskOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
  timeout?: number;
  priority?: number;
}

interface TaskResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

interface QueueStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  activeTasks: number;
  queuedTasks: number;
}

interface TaskItem<T> {
  task: () => Promise<T>;
  options: Required<TaskOptions>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  attempts: number;
  cancelled: boolean;
}

class TaskQueue {
  private concurrency: number;
  private defaultTaskOptions: Required<TaskOptions>;
  private queue: TaskItem<any>[];
  private activeTasks: Set<TaskItem<any>>;
  private stats: QueueStats;
  private _isProcessing: boolean;
  private _errorListeners: Array<(error: Error, taskItem: TaskItem<any>) => void>;

  constructor({ 
    concurrency = 1,
    defaultTaskOptions = {}
  }: {
    concurrency?: number;
    defaultTaskOptions?: TaskOptions;
  } = {}) {
    this.concurrency = concurrency;
    
    this.defaultTaskOptions = {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: () => true,
      priority: 0,
      timeout: 0,
      ...defaultTaskOptions
    };
    
    this.queue = [];
    this.activeTasks = new Set();
    
    this.stats = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      queuedTasks: 0
    };
    
    this._isProcessing = false;
    this._errorListeners = [];
  }

  onError(listener: (error: Error, taskItem: TaskItem<any>) => void): void {
    this._errorListeners.push(listener);
  }

  offError(listener: (error: Error, taskItem: TaskItem<any>) => void): void {
    this._errorListeners = this._errorListeners.filter(l => l !== listener);
  }

  private _emitError(error: Error, taskItem: TaskItem<any>): void {
    this._errorListeners.forEach(listener => {
      try {
        listener(error, taskItem);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  add<T>(task: () => Promise<T>, options: TaskOptions = {}): Promise<T> & { cancel: () => void } {
    const taskOptions: Required<TaskOptions> = { ...this.defaultTaskOptions, ...options };
    
    let taskItem: TaskItem<T> | null = null;
    
    const promise = new Promise<T>((resolve, reject) => {
      taskItem = {
        task,
        options: taskOptions,
        resolve,
        reject,
        attempts: 0,
        cancelled: false
      };

      const insertIndex = this.queue.findIndex(item => 
        item.options.priority < taskOptions.priority
      );
      
      if (insertIndex === -1) {
        this.queue.push(taskItem);
      } else {
        this.queue.splice(insertIndex, 0, taskItem);
      }
      
      this.stats.queuedTasks++;
      this.stats.totalTasks++;
      
      this._processQueue();
    });

    const cancel = () => {
      if (taskItem && !taskItem.cancelled) {
        taskItem.cancelled = true;
        this.stats.queuedTasks--;
        this.queue = this.queue.filter(item => item !== taskItem);
        taskItem.reject(new Error('任务已取消'));
      }
    };

    return Object.assign(promise, { cancel });
  }

  private async _processQueue(): Promise<void> {
    if (this._isProcessing || this.activeTasks.size >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this._isProcessing = true;

    while (this.activeTasks.size < this.concurrency && this.queue.length > 0) {
      const taskItem = this.queue.shift()!;
      
      if (taskItem.cancelled) {
        continue;
      }

      this.stats.queuedTasks--;
      this.activeTasks.add(taskItem);
      this.stats.activeTasks = this.activeTasks.size;

      this._executeTask(taskItem).finally(() => {
        this.activeTasks.delete(taskItem);
        this.stats.activeTasks = this.activeTasks.size;
        this._processQueue();
      });
    }

    this._isProcessing = false;
  }

  private async _executeTask<T>(taskItem: TaskItem<T>): Promise<void> {
    const { task, options, resolve, reject } = taskItem;
    
    try {
      let result: T;
      
      if (options.timeout) {
        result = await Promise.race([
          task().catch(error => {
            throw error;
          }),
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('任务超时')), options.timeout)
          )
        ]);
      } else {
        result = await task().catch(error => {
          throw error;
        });
      }
      
      this.stats.successfulTasks++;
      resolve(result);
    } catch (error) {
      this._emitError(error as Error, taskItem);
      
      taskItem.attempts++;
      
      const shouldRetry = !taskItem.cancelled && 
        taskItem.attempts <= options.maxRetries && 
        (!options.retryCondition || options.retryCondition(error as Error));
      
      if (shouldRetry) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay));
        this.queue.unshift(taskItem);
        this.stats.queuedTasks++;
      } else {
        this.stats.failedTasks++;
        reject(error);
      }
    }
  }

  getStats(): QueueStats {
    return { ...this.stats };
  }

  clear(): void {
    this.queue = [];
    this.stats.queuedTasks = 0;
  }

  async waitForCompletion(): Promise<void> {
    while (this.activeTasks.size > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export default TaskQueue; 