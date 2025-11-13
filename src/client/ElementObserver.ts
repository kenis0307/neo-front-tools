export interface ElementObserverOptions {
  container?: Element;
  selector: string;
  callback: (element: Element) => void;
  disappearCallback?: (element: Element) => void;
  watchDisappear?: boolean;
  watchVisibility?: boolean;
  visibilityCallback?: (element: Element) => void;
  hiddenCallback?: (element: Element) => void;
  visibilityThreshold?: number;
  visibilityRoot?: Element | null;
  visibilityRootMargin?: string;
  watchDisplay?: boolean;
  displayCallback?: (element: Element) => void;
  hideCallback?: (element: Element) => void;
  debug?: boolean;
}

export interface IntersectionObserverOptions {
  threshold: number;
  root: Element | null;
  rootMargin: string;
}

export class ElementObserver {
  private container: Element;
  private selector: string;
  private callback: (element: Element) => void;
  private disappearCallback?: (element: Element) => void;
  private watchDisappear: boolean;
  private watchVisibility: boolean;
  private visibilityCallback?: (element: Element) => void;
  private hiddenCallback?: (element: Element) => void;
  private visibilityThreshold: number;
  private visibilityRoot: Element | null;
  private visibilityRootMargin: string;
  private watchDisplay: boolean;
  private displayCallback?: (element: Element) => void;
  private hideCallback?: (element: Element) => void;
  private isObserving: boolean;
  private observer: MutationObserver | null;
  private lastFoundElement: Element | null;
  private intersectionObserver: IntersectionObserver | null;
  private isElementVisible: boolean;
  private isElementDisplayed: boolean;
  private displayObserver: MutationObserver | null;
  private debug: boolean;

  constructor(options: ElementObserverOptions) {
    this.container = options.container || document.body;
    this.selector = options.selector;
    this.callback = options.callback;
    this.disappearCallback = options.disappearCallback;
    this.watchDisappear = options.watchDisappear || false;
    this.watchVisibility = options.watchVisibility || false;
    this.visibilityCallback = options.visibilityCallback;
    this.hiddenCallback = options.hiddenCallback;
    this.visibilityThreshold = options.visibilityThreshold || 0.1;
    this.visibilityRoot = options.visibilityRoot || null;
    this.visibilityRootMargin = options.visibilityRootMargin || "0px";
    this.watchDisplay = options.watchDisplay || false;
    this.displayCallback = options.displayCallback;
    this.hideCallback = options.hideCallback;
    this.isObserving = false;
    this.observer = null;
    this.lastFoundElement = null;
    this.intersectionObserver = null;
    this.isElementVisible = false;
    this.isElementDisplayed = false;
    this.displayObserver = null;
    this.debug = options.debug || false;
  }

  private log(...args: any[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementObserver]', ...args);
    }
  }
  private warn(...args: any[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.warn('[ElementObserver]', ...args);
    }
  }
  private error(...args: any[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.error('[ElementObserver]', ...args);
    }
  }

  public start(): void {
    if (this.isObserving) {
      this.warn("监听器已在运行中");
      return;
    }

    const existingElement = this.findElement();
    if (existingElement) {
      this.lastFoundElement = existingElement;
      this.executeCallback(existingElement);

      if (this.watchDisappear || this.watchVisibility || this.watchDisplay) {
        this.startWatching();
        this.startDisplayObserver(existingElement);
      }
      return;
    }

    this.startWatching();
  }

  private startWatching(): void {
    if (window.MutationObserver) {
      this.startMutationObserver();
    } else {
      this.warn("MutationObserver 不可用，无法开始监听");
    }
  }

  private startMutationObserver(): void {
    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      let elementFound = false;
      let elementRemoved = false;

      mutations.forEach((mutation: MutationRecord) => {
        mutation.addedNodes.forEach((node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.matchesSelector(element)) {
              this.lastFoundElement = element;
              this.executeCallback(element);
              this.startVisibilityObserver(element);
              this.startDisplayObserver(element);
              elementFound = true;
              if (!this.watchDisappear && !this.watchVisibility && !this.watchDisplay) {
                this.stop();
                return;
              }
            }
            const foundElement = element.querySelector(this.selector);
            if (foundElement) {
              this.lastFoundElement = foundElement;
              this.executeCallback(foundElement);
              this.startVisibilityObserver(foundElement);
              this.startDisplayObserver(foundElement);
              elementFound = true;
              if (!this.watchDisappear && !this.watchVisibility && !this.watchDisplay) {
                this.stop();
                return;
              }
            }
          }
        });

        mutation.removedNodes.forEach((node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.matchesSelector(element)) {
              this.stopVisibilityObserver();
              this.stopDisplayObserver();
              this.executeDisappearCallback(element);
              elementRemoved = true;
            }
            const removedElement = element.querySelector(this.selector);
            if (removedElement) {
              this.stopVisibilityObserver();
              this.stopDisplayObserver();
              this.executeDisappearCallback(removedElement);
              elementRemoved = true;
            }
          }
        });
      });

      if (
        this.watchDisappear &&
        this.lastFoundElement &&
        !elementFound &&
        !elementRemoved
      ) {
        const currentElement = this.findElement();
        if (!currentElement) {
          this.stopVisibilityObserver();
          this.stopDisplayObserver();
          this.executeDisappearCallback(this.lastFoundElement);
          this.lastFoundElement = null;
        }
      }
    });

    this.observer.observe(this.container, {
      childList: true,
      subtree: true,
    });

    this.isObserving = true;
    this.log(
      `开始监听元素: ${this.selector}${
        this.watchDisappear ? " (包含消失监听)" : ""
      }${this.watchVisibility ? " (包含可见性监听)" : ""}${
        this.watchDisplay ? " (包含display监听)" : ""
      }`
    );
  }

  private startVisibilityObserver(element: Element): void {
    if (!this.watchVisibility || !window.IntersectionObserver) {
      return;
    }

    this.stopVisibilityObserver();

    this.intersectionObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            if (!this.isElementVisible) {
              this.isElementVisible = true;
              this.executeVisibilityCallback(entry.target);
            }
          } else {
            if (this.isElementVisible) {
              this.isElementVisible = false;
              this.executeHiddenCallback(entry.target);
            }
          }
        });
      },
      {
        threshold: this.visibilityThreshold,
        root: this.visibilityRoot,
        rootMargin: this.visibilityRootMargin,
      }
    );

    this.intersectionObserver.observe(element);
  }

  private stopVisibilityObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    this.isElementVisible = false;
  }

  private findElement(): Element | null {
    return this.container.querySelector(this.selector);
  }

  private matchesSelector(element: Element): boolean {
    return element.matches && element.matches(this.selector);
  }

  private executeCallback(element: Element): void {
    if (typeof this.callback === "function") {
      try {
        this.callback(element);
      } catch (error) {
        this.error("执行回调函数时出错:", error);
      }
    }
  }

  private executeDisappearCallback(element: Element): void {
    if (typeof this.disappearCallback === "function") {
      try {
        this.disappearCallback(element);
      } catch (error) {
        this.error("执行消失回调函数时出错:", error);
      }
    }
  }

  private executeVisibilityCallback(element: Element): void {
    if (typeof this.visibilityCallback === "function") {
      try {
        this.visibilityCallback(element);
      } catch (error) {
        this.error("执行可见性回调函数时出错:", error);
      }
    }
  }

  private executeHiddenCallback(element: Element): void {
    if (typeof this.hiddenCallback === "function") {
      try {
        this.hiddenCallback(element);
      } catch (error) {
        this.error("执行隐藏回调函数时出错:", error);
      }
    }
  }

  private startDisplayObserver(element: Element): void {
    if (!this.watchDisplay || !window.MutationObserver) {
      return;
    }

    this.stopDisplayObserver();

    this.checkDisplayState(element);

    this.displayObserver = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((mutation: MutationRecord) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          this.checkDisplayState(element);
        }
      });
    });

    this.displayObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  private checkDisplayState(element: Element): void {
    const computedStyle = window.getComputedStyle(element);
    const isDisplayed = computedStyle.display !== 'none';

    if (isDisplayed && !this.isElementDisplayed) {
      this.isElementDisplayed = true;
      this.executeDisplayCallback(element);
    } else if (!isDisplayed && this.isElementDisplayed) {
      this.isElementDisplayed = false;
      this.executeHideCallback(element);
    }
  }

  private stopDisplayObserver(): void {
    if (this.displayObserver) {
      this.displayObserver.disconnect();
      this.displayObserver = null;
    }
    this.isElementDisplayed = false;
  }

  private executeDisplayCallback(element: Element): void {
    if (typeof this.displayCallback === "function") {
      try {
        this.displayCallback(element);
      } catch (error) {
        this.error("执行显示回调函数时出错:", error);
      }
    }
  }

  private executeHideCallback(element: Element): void {
    if (typeof this.hideCallback === "function") {
      try {
        this.hideCallback(element);
      } catch (error) {
        this.error("执行隐藏回调函数时出错:", error);
      }
    }
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.stopVisibilityObserver();
    this.stopDisplayObserver();

    this.isObserving = false;
    this.lastFoundElement = null;
    this.log(`停止监听元素: ${this.selector}`);
  }

  public isActive(): boolean {
    return this.isObserving;
  }

  public getLastFoundElement(): Element | null {
    return this.lastFoundElement;
  }

  public isVisible(): boolean {
    return this.isElementVisible;
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  public triggerDisappear(): void {
    if (this.lastFoundElement && this.disappearCallback) {
      this.executeDisappearCallback(this.lastFoundElement);
      this.lastFoundElement = null;
    }
  }

  public triggerVisibility(): void {
    if (this.lastFoundElement && this.visibilityCallback) {
      this.executeVisibilityCallback(this.lastFoundElement);
    }
  }

  public triggerHidden(): void {
    if (this.lastFoundElement && this.hiddenCallback) {
      this.executeHiddenCallback(this.lastFoundElement);
    }
  }

  public isDisplayed(): boolean {
    return this.isElementDisplayed;
  }

  public triggerDisplay(): void {
    if (this.lastFoundElement && this.displayCallback) {
      this.executeDisplayCallback(this.lastFoundElement);
    }
  }

  public triggerHide(): void {
    if (this.lastFoundElement && this.hideCallback) {
      this.executeHideCallback(this.lastFoundElement);
    }
  }
}

export default ElementObserver;

/**
 * @example
 * // 基础用法 - 监听元素出现
 * const observer = new ElementObserver({
 *   selector: '.my-element',
 *   callback: (element) => {
 *     console.log('元素已找到:', element);
 *     // 执行你的逻辑
 *   }
 * });
 * observer.start();
 * 
 * // 监听元素消失
 * const observer = new ElementObserver({
 *   selector: '.my-element',
 *   callback: (element) => console.log('元素出现:', element),
 *   disappearCallback: (element) => console.log('元素消失:', element),
 *   watchDisappear: true
 * });
 * observer.start();
 * 
 * // 监听元素可见性
 * const observer = new ElementObserver({
 *   selector: '.my-element',
 *   callback: (element) => console.log('元素出现:', element),
 *   watchVisibility: true,
 *   visibilityCallback: (element) => console.log('元素可见:', element),
 *   hiddenCallback: (element) => console.log('元素隐藏:', element),
 *   visibilityThreshold: 0.5
 * });
 * observer.start();
 * 
 * // 监听display属性变化
 * const displayObserver = new ElementObserver({
 *   selector: '.toggle-element',
 *   callback: (element) => console.log('元素出现:', element),
 *   watchDisplay: true,
 *   displayCallback: (element) => console.log('元素显示:', element),
 *   hideCallback: (element) => console.log('元素隐藏:', element)
 * });
 * displayObserver.start();
 * 
 * // React 组件中使用示例
 * // import React, { useEffect, useRef } from 'react';
 * // import { ElementObserver } from './ElementObserver';
 * // 
 * // const MyReactComponent = () => {
 * //   const observerRef = useRef<ElementObserver | null>(null);
 * // 
 * //   useEffect(() => {
 * //     // 监听动态加载的广告元素
 * //     observerRef.current = new ElementObserver({
 * //       selector: '.advertisement',
 * //       callback: (element) => {
 * //         console.log('广告元素已加载:', element);
 * //         // 可以在这里处理广告相关的逻辑
 * //         element.style.border = '2px solid red';
 * //       },
 * //       disappearCallback: (element) => {
 * //         console.log('广告元素已移除:', element);
 * //       },
 * //       watchDisappear: true
 * //     });
 * // 
 * //     observerRef.current.start();
 * // 
 * //     // 清理函数
 * //     return () => {
 * //       if (observerRef.current) {
 * //         observerRef.current.stop();
 * //       }
 * //     };
 * //   }, []);
 * // 
 * //   return (
 * //     <div>
 * //     </div>
 * //   );
 * // };
 * 
 * // React 组件中监听可见性变化
 * // const VisibilityAwareComponent = () => {
 * //   const observerRef = useRef<ElementObserver | null>(null);
 * //   const [isVisible, setIsVisible] = useState(false);
 * // 
 * //   useEffect(() => {
 * //     observerRef.current = new ElementObserver({
 * //       selector: '.tracked-element',
 * //       callback: (element) => {
 * //         console.log('开始跟踪元素可见性:', element);
 * //       },
 * //       watchVisibility: true,
 * //       visibilityCallback: (element) => {
 * //         console.log('元素进入视窗:', element);
 * //         setIsVisible(true);
 * //         // 可以在这里触发数据加载或动画
 * //       },
 * //       hiddenCallback: (element) => {
 * //         console.log('元素离开视窗:', element);
 * //         setIsVisible(false);
 * //       },
 * //       visibilityThreshold: 0.3,
 * //       visibilityRootMargin: '50px'
 * //     });
 * // 
 * //     observerRef.current.start();
 * // 
 * //     return () => {
 * //       if (observerRef.current) {
 * //         observerRef.current.stop();
 * //       }
 * //     };
 * //   }, []);
 * // 
 * //   return (
 * //     <div>
 * //       <div className="tracked-element">
 * //         这个元素会被跟踪可见性
 * //       </div>
 * //       <p>元素可见状态: {isVisible ? '可见' : '不可见'}</p>
 * //     </div>
 * //   );
 * // };
 * 
 * // Vue 2 组件中使用示例
 * // import { ElementObserver } from './ElementObserver';
 * // 
 * // export default {
 * //   name: 'MyVueComponent',
 * //   data() {
 * //     return {
 * //       observer: null,
 * //       elementFound: false
 * //     };
 * //   },
 * //   mounted() {
 * //     // 监听动态加载的模态框
 * //     this.observer = new ElementObserver({
 * //       selector: '.modal-overlay',
 * //       callback: (element) => {
 * //         console.log('模态框已加载:', element);
 * //         this.elementFound = true;
 * //         // 可以在这里添加模态框的初始化逻辑
 * //         this.initializeModal(element);
 * //       },
 * //       disappearCallback: (element) => {
 * //         console.log('模态框已关闭:', element);
 * //         this.elementFound = false;
 * //         // 清理模态框相关状态
 * //         this.cleanupModal();
 * //       },
 * //       watchDisappear: true,
 * //       useMutationObserver: true
 * //     });
 * // 
 * //     this.observer.start();
 * //   },
 * //   beforeUnmount() {
 * //     if (this.observer) {
 * //       this.observer.stop();
 * //     }
 * //   },
 * //   methods: {
 * //     initializeModal(element) {
 * //       // 模态框初始化逻辑
 * //       element.addEventListener('click', this.handleModalClick);
 * //     },
 * //     cleanupModal() {
 * //       // 清理模态框相关逻辑
 * //     },
 * //     handleModalClick(event) {
 * //       // 处理模态框点击事件
 * //     }
 * //   }
 * // };
 * 
 * // Vue 3 Composition API 中使用示例
 * // import { ref, onMounted, onUnmounted } from 'vue';
 * // import { ElementObserver } from './ElementObserver';
 * // 
 * // const contentLoaded = ref(false);
 * // let observer = null;
 * // 
 * // onMounted(() => {
 * //   observer = new ElementObserver({
 * //     selector: '.lazy-load-section',
 * //     callback: (element) => {
 * //       console.log('开始监听懒加载区域:', element);
 * //     },
 * //     watchVisibility: true,
 * //     visibilityCallback: (element) => {
 * //       console.log('懒加载区域进入视窗:', element);
 * //       // 触发数据加载
 * //       loadContent();
 * //     },
 * //     visibilityThreshold: 0.1,
 * //     visibilityRootMargin: '100px'
 * //   });
 * // 
 * //   observer.start();
 * // });
 * // 
 * // onUnmounted(() => {
 * //   if (observer) {
 * //     observer.stop();
 * //   }
 * // });
 * // 
 * // const loadContent = () => {
 * //   // 模拟异步数据加载
 * //   setTimeout(() => {
 * //     contentLoaded.value = true;
 * //     console.log('内容加载完成');
 * //   }, 1000);
 * // };
 * 
 * // 组合监听示例 - 同时监听元素出现、消失、可见和不可见
 * const comprehensiveObserver = new ElementObserver({
 *   selector: '.dynamic-content',
 *   callback: (element) => {
 *     console.log('元素出现:', element);
 *   },
 *   disappearCallback: (element) => {
 *     console.log('元素消失:', element);
 *   },
 *   watchDisappear: true,
 *   watchVisibility: true,
 *   visibilityCallback: (element) => {
 *     console.log('元素可见:', element);
 *   },
 *   hiddenCallback: (element) => {
 *     console.log('元素不可见:', element);
 *   },
 *   watchDisplay: true,
 *   displayCallback: (element) => {
 *     console.log('元素显示:', element);
 *   },
 *   hideCallback: (element) => {
 *     console.log('元素隐藏:', element);
 *   },
 *   visibilityThreshold: 0.3,
 *   visibilityRootMargin: '50px'
 * });
 * 
 * comprehensiveObserver.start();
 * 
 * // 监听多个元素的示例
 * const multiObserver = new ElementObserver({
 *   selector: '.notification-item',
 *   callback: (element) => {
 *     console.log('新通知出现:', element);
 *     // 为每个通知添加动画效果
 *     element.classList.add('fade-in');
 *   },
 *   disappearCallback: (element) => {
 *     console.log('通知被移除:', element);
 *   },
 *   watchDisappear: true
 * });
 * multiObserver.start();
 * 
 * // 带重试限制的监听
 * const limitedObserver = new ElementObserver({
 *   selector: '.slow-loading-element',
 *   callback: (element) => {
 *     console.log('慢加载元素已出现:', element);
 *   }
 * });
 * limitedObserver.start();
 */
