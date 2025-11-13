# DragSelectBox

一个功能强大的拖拽选择框组件，支持自定义样式、滚动容器、自动滚动和任意方向拖拽。

## 特性

- ✅ 自定义选框样式
- ✅ 支持滚动容器
- ✅ 边界自动滚动（带边界限制）
- ✅ 任意方向拖拽
- ✅ 鼠标和选框完美同步
- ✅ 实时元素选择/取消选择
- ✅ 事件回调机制
- ✅ 调试模式

## API

### DragSelectBoxOptions

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| container | HTMLElement | ✅ | - | 需要绘制选框的容器 |
| style | Partial<CSSStyleDeclaration> | ❌ | - | 选框的样式 |
| onSelectOne | (selected: Element, event: MouseEvent) => void | ✅ | - | 选中一个元素触发 |
| onDeselectOne | (selected: Element, event: MouseEvent) => void | ✅ | - | 取消选中一个元素触发 |
| debug | boolean | ❌ | false | 调试模式 |

### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| destroy | - | void | 销毁实例，清理资源 |
| getSelectedElements | - | Element[] | 获取当前选中的元素 |
| clearSelection | - | void | 清空选中数据 |

## 使用示例

### JavaScript

```javascript
import { DragSelectBox } from '@kront/neo-front-tools';

// 用户的数据管理
const selectedElements = [];

const dragSelectBox = new DragSelectBox({
  container: document.getElementById('my-container'),
  style: {
    border: '2px solid #007bff',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: '4px'
  },
  onSelectOne: (element, event) => {
    if (!selectedElements.includes(element)) {
      selectedElements.push(element);
    }
    console.log('选中元素:', element);
  },
  onDeselectOne: (element, event) => {
    const index = selectedElements.indexOf(element);
    if (index > -1) {
      selectedElements.splice(index, 1);
    }
    console.log('取消选中:', element);
  },
});

// 获取选中的元素
const elements = dragSelectBox.getSelectedElements();

// 清空选择
dragSelectBox.clearSelection();

// 销毁实例
dragSelectBox.destroy();
```

### TypeScript

```typescript
import { DragSelectBox } from '@kront/neo-front-tools';

interface MyElement extends Element {
  id: string;
  data?: any;
}

// 用户的数据管理
const selectedElements: MyElement[] = [];

const dragSelectBox = new DragSelectBox({
  container: document.getElementById('my-container') as HTMLElement,
  style: {
    border: '2px solid #ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  onSelectOne: (element: Element, event: MouseEvent) => {
    const myElement = element as MyElement;
    if (!selectedElements.includes(myElement)) {
      selectedElements.push(myElement);
    }
    console.log('选中元素:', myElement.id);
  },
  onDeselectOne: (element: Element, event: MouseEvent) => {
    const myElement = element as MyElement;
    const index = selectedElements.indexOf(myElement);
    if (index > -1) {
      selectedElements.splice(index, 1);
    }
    console.log('取消选中:', myElement.id);
  },
});

// 类型安全的获取选中元素
const elements: MyElement[] = dragSelectBox.getSelectedElements() as MyElement[];
```

### Vue 2

```javascript
// script 部分
import { DragSelectBox } from '@kront/neo-front-tools';

export default {
  data() {
    return {
      selectedElements: [],
      dragSelectBox: null
    };
  },
  mounted() {
    this.initDragSelectBox();
  },
  beforeDestroy() {
    if (this.dragSelectBox) {
      this.dragSelectBox.destroy();
    }
  },
  methods: {
    initDragSelectBox() {
      this.dragSelectBox = new DragSelectBox({
        container: this.$refs.container,
        style: {
          border: '2px solid #28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderRadius: '6px'
        },
        onSelectOne: (element, event) => {
          if (!this.selectedElements.includes(element)) {
            this.selectedElements.push(element);
          }
          this.$emit('selection-change', this.selectedElements);
        },
        onDeselectOne: (element, event) => {
          const index = this.selectedElements.indexOf(element);
          if (index > -1) {
            this.selectedElements.splice(index, 1);
          }
          this.$emit('selection-change', this.selectedElements);
        },
      });
    },
    clearSelection() {
      this.selectedElements = [];
      if (this.dragSelectBox) {
        this.dragSelectBox.clearSelection();
      }
    }
  }
};
```

### Vue 3

```javascript
// script setup 部分
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { DragSelectBox } from '@kront/neo-front-tools';

const selectedElements = ref([]);
const containerRef = ref(null);
let dragSelectBox = null;

const initDragSelectBox = () => {
  dragSelectBox = new DragSelectBox({
    container: containerRef.value,
    style: {
      border: '2px solid #6f42c1',
      backgroundColor: 'rgba(111, 66, 193, 0.1)',
      borderRadius: '8px',
      backdropFilter: 'blur(2px)'
    },
    onSelectOne: (element, event) => {
      if (!selectedElements.value.includes(element)) {
        selectedElements.value.push(element);
      }
      console.log('选中元素:', element);
    },
    onDeselectOne: (element, event) => {
      const index = selectedElements.value.indexOf(element);
      if (index > -1) {
        selectedElements.value.splice(index, 1);
      }
      console.log('取消选中:', element);
    },
    debug: false
  });
};

const clearSelection = () => {
  selectedElements.value = [];
  if (dragSelectBox) {
    dragSelectBox.clearSelection();
  }
};

onMounted(() => {
  initDragSelectBox();
});

onBeforeUnmount(() => {
  if (dragSelectBox) {
    dragSelectBox.destroy();
  }
});
```

### React

```javascript
import { useEffect, useRef, useState } from 'react';
import { DragSelectBox } from '@kront/neo-front-tools';

function DragSelectComponent() {
  const [selectedElements, setSelectedElements] = useState([]);
  const containerRef = useRef(null);
  const dragSelectBoxRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      dragSelectBoxRef.current = new DragSelectBox({
        container: containerRef.current,
        style: {
          border: '2px solid #fd7e14',
          backgroundColor: 'rgba(253, 126, 20, 0.1)',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        },
        onSelectOne: (element, event) => {
          setSelectedElements(prev => {
            if (!prev.includes(element)) {
              return [...prev, element];
            }
            return prev;
          });
        },
        onDeselectOne: (element, event) => {
          setSelectedElements(prev => 
            prev.filter(el => el !== element)
          );
        },
        debug: false
      });
    }

    return () => {
      if (dragSelectBoxRef.current) {
        dragSelectBoxRef.current.destroy();
      }
    };
  }, []);

  const clearSelection = () => {
    setSelectedElements([]);
    if (dragSelectBoxRef.current) {
      dragSelectBoxRef.current.clearSelection();
    }
  };

  return (
    <div>
      <div ref={containerRef} className="selectable-container">
        {/* 你的可选择元素 */}
      </div>
      <div>
        <p>已选择 {selectedElements.length} 个元素</p>
        <button onClick={clearSelection}>清空选择</button>
      </div>
    </div>
  );
}
```

## 注意事项

1. **容器要求**：容器需要自行设置`position: relative;`，否则选框和鼠标可能会不同步
2. **元素可见性**：隐藏的元素（`display: none` 或 `visibility: hidden`）不会被选中
3. **性能考虑**：大量元素时建议开启 debug 模式监控性能
4. **内存管理**：使用完毕后记得调用 `destroy()` 方法清理资源
5. **事件冲突**：避免在容器上绑定其他鼠标事件，可能产生冲突