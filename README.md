# vue-tree
基于虚拟列表的高性能树组件
```javascript
<Tree
  :tree="tree"
  :option="option"
  draggable
  checkable
  :add-node="handleAddNode"
  :load-data="handleLoadData"
  @node-click="handleNodeClick"
  @checked-change="handleCheckedChange"
  @get-tree-data="getTreeData"
/>
```
