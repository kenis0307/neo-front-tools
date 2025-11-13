// DragSelectBox.ts
interface DragSelectBoxOptions {
  container: HTMLElement;
  style: Partial<CSSStyleDeclaration>;
  onSelectOne: (selected: Element, event: MouseEvent) => void;
  onDeselectOne: (selected: Element, event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  noDragSelectBoxClassNames?: string[];
  debug?: boolean;
}

class DragSelectBox {
  private options: DragSelectBoxOptions;
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private selectBox: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleScroll: () => void;
  private selectedData: any[] = [];
  private maxScrollLeft: number = 0;
  private maxScrollTop: number = 0;

  constructor(options: DragSelectBoxOptions) {
    this.options = { debug: false, ...options };
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.init();
  }



  private findScrollableContainer(): HTMLElement {
    const { container } = this.options;
    
    const containerStyle = window.getComputedStyle(container);
    const isContainerScrollable = 
      containerStyle.overflow === 'auto' || 
      containerStyle.overflow === 'scroll' ||
      containerStyle.overflowX === 'auto' || 
      containerStyle.overflowX === 'scroll' ||
      containerStyle.overflowY === 'auto' || 
      containerStyle.overflowY === 'scroll';

    if (isContainerScrollable) {
      return container;
    }

    const scrollableElements = Array.from(container.querySelectorAll('*'));
    for (const element of scrollableElements) {
      const style = window.getComputedStyle(element);
      const isScrollable = 
        style.overflow === 'auto' || 
        style.overflow === 'scroll' ||
        style.overflowX === 'auto' || 
        style.overflowX === 'scroll' ||
        style.overflowY === 'auto' || 
        style.overflowY === 'scroll';
      
      if (isScrollable) {
        return element as HTMLElement;
      }
    }

    return container;
  }

  private init(): void {
    this.scrollContainer = this.findScrollableContainer();
    
    this.calculateScrollBoundaries();
    
    this.scrollContainer.addEventListener('mousedown', this.boundHandleMouseDown);
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    this.scrollContainer.addEventListener('scroll', this.boundHandleScroll);
    
    this.scrollContainer.style.userSelect = 'none';
    (this.scrollContainer.style as any).webkitUserSelect = 'none';
    (this.scrollContainer.style as any).mozUserSelect = 'none';
    (this.scrollContainer.style as any).msUserSelect = 'none';
  }

  private createSelectBox(): void {
    this.selectBox = document.createElement('div');
    this.selectBox.style.position = 'absolute';
    this.selectBox.style.border = '1px solid #007bff';
    this.selectBox.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
    this.selectBox.style.pointerEvents = 'none';
    this.selectBox.style.zIndex = '9999';
    
    Object.assign(this.selectBox.style, this.options.style);
    
    this.scrollContainer!.appendChild(this.selectBox);
  }

  private updateSelectBox(): void {
    if (!this.selectBox) return;

    const left = Math.min(this.startX, this.currentX);
    const top = Math.min(this.startY, this.currentY);
    const width = Math.abs(this.currentX - this.startX);
    const height = Math.abs(this.currentY - this.startY);

    this.selectBox.style.left = `${left}px`;
    this.selectBox.style.top = `${top}px`;
    this.selectBox.style.width = `${width}px`;
    this.selectBox.style.height = `${height}px`;
  }

  private isElementInSelectBox(element: Element): boolean {
    if (!this.selectBox) return false;

    const elementStyle = window.getComputedStyle(element);
    if (elementStyle.display === 'none' || elementStyle.visibility === 'hidden') {
      return false;
    }
    const elementOffset = this.getElementOffset(element);

    const selectBoxLeft = Math.min(this.startX, this.currentX);
    const selectBoxTop = Math.min(this.startY, this.currentY);
    const selectBoxRight = Math.max(this.startX, this.currentX);
    const selectBoxBottom = Math.max(this.startY, this.currentY);
    return !(
      elementOffset.left > selectBoxRight ||
      elementOffset.right < selectBoxLeft ||
      elementOffset.top > selectBoxBottom ||
      elementOffset.bottom < selectBoxTop
    );
  }

  private getElementOffset(element: Element): { left: number; top: number; right: number; bottom: number } {
    let currentElement = element as HTMLElement;
    let left = 0;
    let top = 0;

    while (currentElement && currentElement !== this.scrollContainer) {
      left += currentElement.offsetLeft;
      top += currentElement.offsetTop;
      currentElement = currentElement.offsetParent as HTMLElement;
    }

    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    return {
      left,
      top,
      right: left + width,
      bottom: top + height
    };
  }

  private handleElementSelection(): void {
    if (!this.selectBox) return;

    const selectableElements = this.scrollContainer!.querySelectorAll('*');
    const currentSelectedElements = new Set<Element>();

    selectableElements.forEach(element => {
      if (this.isElementInSelectBox(element)) {
        currentSelectedElements.add(element);
      }
    });

    currentSelectedElements.forEach(element => {
      if (!this.selectedData.includes(element)) {
        this.selectedData.push(element);
        this.options.onSelectOne(element, new MouseEvent('select'));
      }
    });

    this.selectedData = this.selectedData.filter((element: any) => {
      if (!currentSelectedElements.has(element)) {
        this.options.onDeselectOne(element, new MouseEvent('deselect'));
        return false;
      }
      return true;
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.options.noDragSelectBoxClassNames && this.options.noDragSelectBoxClassNames.length > 0) {
      let el = e.target as HTMLElement | null;
      while (el && el !== this.scrollContainer) {
        if (el.classList) {
          for (const className of this.options.noDragSelectBoxClassNames) {
            if (el.classList.contains(className)) {
              return;
            }
          }
        }
        el = el.parentElement;
      }
    }

    if (this.options.onMouseDown) {
      this.options.onMouseDown(e);
    }

    this.isActive = true;
    const rect = this.scrollContainer!.getBoundingClientRect();
    this.startX = e.clientX - rect.left + this.scrollContainer!.scrollLeft;
    this.startY = e.clientY - rect.top + this.scrollContainer!.scrollTop;
    this.currentX = this.startX;
    this.currentY = this.startY;

    this.createSelectBox();
    this.updateSelectBox();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isActive) return;
    const rect = this.scrollContainer!.getBoundingClientRect();
    this.currentX = e.clientX - rect.left + this.scrollContainer!.scrollLeft;
    this.currentY = e.clientY - rect.top + this.scrollContainer!.scrollTop;

    this.updateSelectBox();
    this.handleElementSelection();
    this.handleAutoScroll(e);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isActive) return;

    if (this.options.onMouseUp) {
      this.options.onMouseUp(e);
    }

    this.isActive = false;
    
    if (this.selectBox) {
      this.selectBox.remove();
      this.selectBox = null;
    }
  }

  private calculateScrollBoundaries(): void {
    if (!this.scrollContainer) return;

    this.maxScrollLeft = Math.max(0, this.scrollContainer.scrollWidth - this.scrollContainer.clientWidth);
    this.maxScrollTop = Math.max(0, this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight);
  }

  private handleAutoScroll(e: MouseEvent): void {
    if (!this.isActive || !this.scrollContainer) return;

    if (this.maxScrollLeft === 0 && this.maxScrollTop === 0) {
      return;
    }

    const rect = this.scrollContainer.getBoundingClientRect();
    const scrollSpeed = 15;
    const scrollThreshold = 50;

    if (e.clientX - rect.left < scrollThreshold && this.scrollContainer.scrollLeft > 0) {
      this.scrollContainer.scrollLeft -= scrollSpeed;
    } else if (rect.right - e.clientX < scrollThreshold && this.scrollContainer.scrollLeft < this.maxScrollLeft) {
      this.scrollContainer.scrollLeft += scrollSpeed;
    }

    if (e.clientY - rect.top < scrollThreshold && this.scrollContainer.scrollTop > 0) {
      this.scrollContainer.scrollTop -= scrollSpeed;
    } else if (rect.bottom - e.clientY < scrollThreshold && this.scrollContainer.scrollTop < this.maxScrollTop) {
      this.scrollContainer.scrollTop += scrollSpeed;
    }
  }

  private handleScroll(): void {
    if (this.isActive && this.selectBox) {
      this.updateSelectBox();
    }
  }

  public destroy(): void {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('mousedown', this.boundHandleMouseDown);
      this.scrollContainer.removeEventListener('scroll', this.boundHandleScroll);
    }
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);

    if (this.selectBox) {
      this.selectBox.remove();
      this.selectBox = null;
    }
    this.isActive = false;
    this.scrollContainer = null;
  }

  public getSelectedElements(): Element[] {
    return this.selectedData;
  }

  public clearSelection(): void {
    this.selectedData.length = 0;
  }
}

export default DragSelectBox;