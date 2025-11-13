# WindowLikeDragMove

## 简介

`WindowLikeDragMove` 是一个用于实现类 Windows 文件管理器拖拽交互的前端工具类。

---

## 基本用法
```js
    const dragMove = new WindowLikeDragMove({
      element: document.querySelector(".canDragItem"),
      dataSetString: "data-id",
      onDragStart: ({ draggedData }) => {
        if(vm.$store.state.fileListsModule.selectedFileLists.length > 0 && !vm.$store.state.fileListsModule.selectedFileLists.includes(draggedData)){
          vm.$store.dispatch("fileListsModule/updateSelectedFileLists", {
            selectedFileLists: [],
            lastSelectedIndex: -1
          });
        }
      },
      onDrop: ({ draggedData, targetData,isCtrlKey }) => {
        const isCanDrop = targetData && targetData !== draggedData && vm.$store.state.fileListsModule.fileLists.find(item => item.path === targetData)?.f_type === "folder" && !vm.$store.state.fileListsModule.selectedFileLists.includes(targetData)
        if(isCanDrop){
          if(vm.$store.state.fileListsModule.selectedFileLists.length > 0){
            vm.$store.dispatch("fileListsModule/dragMoveFileOrFolder", {
              draggedPaths: vm.$store.state.fileListsModule.selectedFileLists,
              targetPath: targetData,
              isCtrlKey: isCtrlKey,
            })
          }else{
            vm.$store.dispatch("fileListsModule/dragMoveFileOrFolder", {
              draggedPaths: [draggedData],
              targetPath: targetData,
              isCtrlKey: isCtrlKey,
            })
          }
        }
      },
      customDragPreview: () => {
        const preview = document.createElement('div');
        preview.style.position = 'fixed';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '99999';
        preview.style.top = '-100px'; // 初始位置在屏幕外
        preview.style.left = '-100px';
        preview.style.display = 'flex';
        preview.style.flexDirection = 'column';
        preview.style.alignItems = 'center';

        const img = document.createElement('img');
        img.src = el.querySelector('img')?.src || '';
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.marginBottom = '4px';
        img.style.position = 'relative';
        preview.appendChild(img);

        let imgWrapper = img;
        const badge = document.createElement('div');
        if (vm.$store.state.fileListsModule.selectedFileLists.length > 1) {
          badge.innerText = vm.$store.state.fileListsModule.selectedFileLists.length;
          badge.style.position = 'absolute';
          badge.style.left = '22px';
          badge.style.bottom = '2px';
          badge.style.minWidth = '18px';
          badge.style.height = '18px';
          badge.style.background = '#f44336';
          badge.style.color = '#fff';
          badge.style.fontSize = '12px';
          badge.style.fontWeight = 'bold';
          badge.style.borderRadius = '50%';
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.boxShadow = '0 0 2px #fff';
          badge.style.zIndex = '1';
          badge.style.pointerEvents = 'none';
          badge.style.border = '2px solid #fff';
          badge.style.boxSizing = 'border-box';

          imgWrapper = document.createElement('div');
          imgWrapper.style.position = 'relative';
          imgWrapper.style.display = 'inline-block';
          imgWrapper.appendChild(img);
          imgWrapper.appendChild(badge);
        }

        preview.appendChild(imgWrapper);

        const label = document.createElement('div');
        label.style.background = 'rgba(0,0,0,0.8)';
        label.style.color = '#fff';
        label.style.fontSize = '14px';
        label.style.padding = '2px 8px';
        label.style.borderRadius = '4px';
        label.style.visibility = "hidden";
        preview.appendChild(label);

        document.body.appendChild(preview);
        return { 
          preview,
          updateDom: (data) => {
            const isCanDrop = data.targetData && data.targetData !== data.draggedData && vm.$store.state.fileListsModule.fileLists.find(item => item.path === data.targetData)?.f_type === "folder" && !vm.$store.state.fileListsModule.selectedFileLists.includes(data.targetData)
            if(isCanDrop){
              const _targetName = getNameWithPath(data.targetData)
              label.innerHTML = (data.isCtrlKey ? `+ ${YUYANKU.复制到()}` : `→ ${YUYANKU.移动到()}`) + ` ${_targetName}`;
              label.style.visibility = "visible";
            }else{
              label.style.visibility = "hidden";
            }
            if(vm.$store.state.fileListsModule.selectedFileLists.length > 0){
              badge.style.visibility = "visible";
            }else{
              badge.style.visibility = "hidden";
            }
          }
        };
      },
    });
```
---

## 参数说明

### DragMoveConfig
| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| element | HTMLElement | 需要绑定拖拽的元素 |
| dataSetString | string | 获取被拖拽和目标元素的自定义属性名（如 'data-id'） |
| onDragStart | (data: DragMoveData) => void | 拖拽开始回调 |
| onDragEnter | (data: DragMoveData) => void | 拖拽进入目标回调 |
| onDragLeave | (data: DragMoveData) => void | 拖拽离开目标回调 |
| onDrop | (data: DragMoveData) => void | 拖拽放下回调 |
| onDragEnd | (data: DragMoveData) => void | 拖拽结束回调 |
| onDocumentDragOver | (data: DragMoveData) => void | 全局拖拽移动时回调 |
| customDragPreview | (data: DragMoveData) => { preview, updateDom } | 自定义预览层生成方法 |
| debug | boolean | 是否开启调试日志 |

### DragMoveData
| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| draggedData | any | 当前拖拽的数据（由 dataSetString 决定） |
| targetData | any | 当前目标的数据（由 dataSetString 决定） |
| isCtrlKey | boolean | 是否按下 Ctrl 键（用于区分复制/移动） |
| updateDom | (data: DragMoveData, e?: DragEvent) => void | 用于动态更新预览层内容的方法 |

---

## 自定义拖拽预览层

你可以通过 `customDragPreview` 返回自定义的预览层 DOM，并通过 `updateDom` 方法动态更新内容。例如：

```js
customDragPreview: (data) => {
  const preview = document.createElement('div');
  preview.innerHTML = '拖拽中...';
  return {
    preview,
    updateDom: (data) => {
      preview.innerHTML = data.isCtrlKey ? '复制到...' : '移动到...';
    }
  };
}
```

---

## 在回调中动态更新预览层内容

所有回调（如 onDragEnter、onDragLeave、onDrop、onDocumentDragOver 等）都会收到 `data.updateDom` 方法，你可以在这些回调中调用它来动态更新预览层内容：

```js
onDragEnter: (data) => {
  if (data.updateDom) {
    data.updateDom({ ...data, targetData: '新目标' });
  }
}

onDocumentDragOver: (data) => {
  if (data.updateDom) {
    data.updateDom(data);
  }
}
```

---

## 解绑与销毁

如需解绑拖拽事件和清理预览层，可调用：

```js
dragInstance.unbind();
```

---

## 其它说明
- 支持多实例并发拖拽。
- 支持自定义预览层、角标、图标等复杂内容。
- 支持全局拖拽跟随和动态内容更新。
- 支持调试日志输出。

如需更复杂的用法或有特殊需求，欢迎提 issue 或联系维护者。