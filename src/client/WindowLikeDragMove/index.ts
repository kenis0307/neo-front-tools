interface DragMoveData {
  e?: DragEvent;
  draggedData?: any;
  draggedElement?: HTMLElement;
  targetData?: any;
  targetElement?: HTMLElement;
  isCtrlKey?: boolean;
  updateDom?: (data: DragMoveData, e?: DragEvent) => void;
}

interface DragMoveConfig {
  element: HTMLElement;
  dataSetString: string;
  onDragStart?: (data: DragMoveData) => void;
  onDragEnter?: (data: DragMoveData) => void;
  onDragLeave?: (data: DragMoveData) => void;
  onDocumentDragOver?: (data: DragMoveData) => void;
  onDrop?: (data: DragMoveData) => void;
  onDragEnd?: (data: DragMoveData) => void;
  customDragPreview?: (data: DragMoveData) => { preview: HTMLElement; label?: HTMLElement; img?: HTMLElement; updateDom?: (data: DragMoveData, e?: DragEvent) => void } | void;
  debug?: boolean;
}

class WindowLikeDragMove {
  private config: DragMoveConfig;
  private handlers: any = {};
  private isDragging = false;
  private static currentDraggedInstance: WindowLikeDragMove | null = null;
  private static lastDropTarget: { element: HTMLElement; data: any } | null = null;
  private dragPreview: HTMLElement | null = null;
  private dragPreviewLabel: HTMLElement | null = null;
  private dragPreviewImg: HTMLElement | null = null;
  public static dragPreviewUpdateDom?: (data: DragMoveData, e?: DragEvent) => void;

  constructor(config: DragMoveConfig) {
    this.config = config;
    this.bind();
  }

  bind(): void {
    const element = this.config.element;
    element.setAttribute('draggable', 'true');
    
    this.handlers = {
      handleDragStart: this.handleDragStart.bind(this),
      handleDragEnter: this.handleDragEnter.bind(this),
      handleDragLeave: this.handleDragLeave.bind(this),
      handleDragOver: this.handleDragOver.bind(this),
      handleDocumentDragOver: this.handleDocumentDragOver.bind(this),
      handleDrop: this.handleDrop.bind(this),
      handleDragEnd: this.handleDragEnd.bind(this),
    };

    element.addEventListener('dragstart', this.handlers.handleDragStart);
    element.addEventListener('dragenter', this.handlers.handleDragEnter);
    element.addEventListener('dragleave', this.handlers.handleDragLeave);
    element.addEventListener('dragover', this.handlers.handleDragOver);
    element.addEventListener('drop', this.handlers.handleDrop);
    element.addEventListener('dragend', this.handlers.handleDragEnd);
    
    document.addEventListener('dragover', this.handlers.handleDocumentDragOver);

  }

  unbind(): void {
    const element = this.config.element;
    if (this.handlers) {
      element.removeEventListener('dragstart', this.handlers.handleDragStart);
      element.removeEventListener('dragenter', this.handlers.handleDragEnter);
      element.removeEventListener('dragleave', this.handlers.handleDragLeave);
      element.removeEventListener('dragover', this.handlers.handleDragOver);
      element.removeEventListener('drop', this.handlers.handleDrop);
      element.removeEventListener('dragend', this.handlers.handleDragEnd);
      document.removeEventListener('dragover', this.handlers.handleDocumentDragOver);
    }
    
    this.cleanupPreview();
  }

  static getCurrentDraggedElement(): HTMLElement | null {
    return WindowLikeDragMove.currentDraggedInstance?.config.element || null;
  }

  static getCurrentDraggedData(): any {
    const element = WindowLikeDragMove.getCurrentDraggedElement();
    if (!element) return null;
    
    const instance = WindowLikeDragMove.currentDraggedInstance;
    if (!instance) return null;
    
    return element.getAttribute(instance.config.dataSetString);
  }

  private createDefaultDragPreview(text: string, iconUrl: string): { preview: HTMLElement; label: HTMLElement; img: HTMLElement } {
    const preview = document.createElement('div');
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '99999';
    preview.style.top = '-100px';
    preview.style.left = '-100px';
    preview.style.display = 'flex';
    preview.style.flexDirection = 'column';
    preview.style.alignItems = 'center';

    const img = document.createElement('img');
    img.src = iconUrl;
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.marginBottom = '4px';
    img.style.position = 'relative';
    preview.appendChild(img);

    const label = document.createElement('div');
    label.style.background = 'rgba(0,0,0,0.8)';
    label.style.color = '#fff';
    label.style.fontSize = '14px';
    label.style.padding = '2px 8px';
    label.style.borderRadius = '4px';
    label.innerHTML = text;
    preview.appendChild(label);

    document.body.appendChild(preview);
    return { preview, label, img };
  }

  private cleanupPreview(): void {
    if (this.dragPreview) {
      try {
        document.body.removeChild(this.dragPreview);
      } catch (error) {
      }
      this.dragPreview = null;
      this.dragPreviewLabel = null;
      this.dragPreviewImg = null;
      WindowLikeDragMove.dragPreviewUpdateDom = undefined;
    }
  }

  private handleDragStart(e: DragEvent): void {
    const draggedElement = this.config.element;
    const draggedData = draggedElement.getAttribute(this.config.dataSetString);
    
    if (!e.dataTransfer) {
      console.warn('dataTransfer is null, drag operation may fail in Safari');
      return;
    }
    
    e.dataTransfer.setData('text/plain', draggedData || '');
    e.dataTransfer.effectAllowed = 'copyMove';
    
    this.isDragging = true;
    WindowLikeDragMove.currentDraggedInstance = this;
    
    const img = draggedElement.querySelector('img');
    const iconUrl = img?.src || '';
    const text = '拖拽中...';
    
    if (this.config.customDragPreview) {
      const previewData = this.config.customDragPreview({ draggedData });
      if (previewData && previewData.preview) {
        this.dragPreview = previewData.preview;
        this.dragPreviewLabel = previewData.label || null;
        this.dragPreviewImg = previewData.img || null;
        WindowLikeDragMove.dragPreviewUpdateDom = typeof previewData.updateDom === 'function' ? previewData.updateDom : undefined;
      } else {
        const defaultPreviewData = this.createDefaultDragPreview(text, iconUrl);
        this.dragPreview = defaultPreviewData.preview;
        this.dragPreviewLabel = defaultPreviewData.label;
        this.dragPreviewImg = defaultPreviewData.img;
        WindowLikeDragMove.dragPreviewUpdateDom = undefined;
      }
    } else {
      const previewData = this.createDefaultDragPreview(text, iconUrl);
      this.dragPreview = previewData.preview;
      this.dragPreviewLabel = previewData.label;
      this.dragPreviewImg = previewData.img;
      WindowLikeDragMove.dragPreviewUpdateDom = undefined;
    }
    
    if (this.dragPreview) {
      this.dragPreview.style.left = (e.clientX - 20) + 'px';
      this.dragPreview.style.top = (e.clientY - 60) + 'px';
    }
    
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    
    this.config.onDragStart?.({ e, draggedElement, draggedData, updateDom: WindowLikeDragMove.dragPreviewUpdateDom });
  }

  private handleDragEnter(e: DragEvent): void {
    const draggedElement = WindowLikeDragMove.getCurrentDraggedElement();
    const draggedData = WindowLikeDragMove.getCurrentDraggedData();

    if (!draggedElement || !draggedData) {
      return;
    }

    let targetElement = e.target as HTMLElement;
    let targetData = targetElement.getAttribute(this.config.dataSetString);
    while (!targetData && targetElement.parentElement) {
      targetElement = targetElement.parentElement;
      targetData = targetElement.getAttribute(this.config.dataSetString);
    }

    this.config.onDragEnter?.({ e, draggedData, targetData, isCtrlKey: e.ctrlKey, draggedElement, targetElement, updateDom: WindowLikeDragMove.dragPreviewUpdateDom });
  }

  private handleDragLeave(e: DragEvent): void {
    const draggedElement = WindowLikeDragMove.getCurrentDraggedElement();
    const draggedData = WindowLikeDragMove.getCurrentDraggedData();

    if (!draggedElement || !draggedData) {
      return;
    }

    let targetElement = e.target as HTMLElement;
    let targetData = targetElement.getAttribute(this.config.dataSetString);
    while (!targetData && targetElement.parentElement) {
      targetElement = targetElement.parentElement;
      targetData = targetElement.getAttribute(this.config.dataSetString);
    }

    this.config.onDragLeave?.({ e, draggedData, targetData, isCtrlKey: e.ctrlKey, draggedElement, targetElement, updateDom: WindowLikeDragMove.dragPreviewUpdateDom });
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    }
  }

  private handleDocumentDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    }
    if (!this.dragPreview) return;

    this.dragPreview.style.left = (e.clientX - 20) + 'px';
    this.dragPreview.style.top = (e.clientY - 60) + 'px';

    const draggedData = WindowLikeDragMove.getCurrentDraggedData();

    let targetElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    let targetData: any = null;
    if (targetElement) {
      targetData = targetElement.getAttribute(this.config.dataSetString);
      while (!targetData && targetElement.parentElement) {
        targetElement = targetElement.parentElement;
        targetData = targetElement.getAttribute(this.config.dataSetString);
      }
    }

    const data: DragMoveData = {
      draggedData,
      targetData,
      isCtrlKey: e.ctrlKey,
      updateDom: WindowLikeDragMove.dragPreviewUpdateDom
    };

    if (WindowLikeDragMove.dragPreviewUpdateDom) {
      WindowLikeDragMove.dragPreviewUpdateDom(data, e);
    } else if (this.dragPreviewLabel) {
      const isCopy = e.ctrlKey;
      const text = isCopy ? '复制到' : '移动到';
      this.dragPreviewLabel.innerHTML = text;
    }

    this.config.onDocumentDragOver?.(data);
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    
    this.cleanupPreview();

    const draggedElement = WindowLikeDragMove.getCurrentDraggedElement();
    const draggedData = WindowLikeDragMove.getCurrentDraggedData();
    if (!draggedElement || !draggedData) {
      return;
    }

    let targetElement = e.target as HTMLElement;
    let targetData = targetElement.getAttribute(this.config.dataSetString);
    while (!targetData && targetElement.parentElement) {
      targetElement = targetElement.parentElement;
      targetData = targetElement.getAttribute(this.config.dataSetString);
    }

    if(draggedData === targetData){
      return;
    }

    WindowLikeDragMove.lastDropTarget = { element: targetElement, data: targetData };

    this.config.onDrop?.({ e, draggedData, targetData, isCtrlKey: e.ctrlKey, draggedElement, targetElement, updateDom: WindowLikeDragMove.dragPreviewUpdateDom });
  }

  private handleDragEnd(e: DragEvent): void {
    
    this.cleanupPreview();
    
    const draggedElement = WindowLikeDragMove.getCurrentDraggedElement();
    const draggedData = WindowLikeDragMove.getCurrentDraggedData();

    const targetElement = WindowLikeDragMove.lastDropTarget?.element || e.target as HTMLElement;
    const targetData = WindowLikeDragMove.lastDropTarget?.data || targetElement.getAttribute(this.config.dataSetString);

    this.isDragging = false;
    WindowLikeDragMove.currentDraggedInstance = null;
    WindowLikeDragMove.lastDropTarget = null;
    
    this.config.onDragEnd?.({ e, draggedData, targetData, isCtrlKey: e.ctrlKey, updateDom: WindowLikeDragMove.dragPreviewUpdateDom });
  }
}

export default WindowLikeDragMove;