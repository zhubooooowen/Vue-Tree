<template>
  <div class="main">
    <div class="treeWrap">
      <Tree
        v-if="tree.length"
        ref="tree"
        children-key="items"
        id-key="code"
        :tree="tree"
        :option="option"
        draggable
        show-checkbox
        :add-node="handleAddNode"
        :load-data="handleLoadData"
        @node-click="handleNodeClick"
        @checked-change="handleCheckedChange"
        @get-tree-data="getTreeData"
      />
    </div>
    <ul>
      <li
        v-for="item in arr"
        :key="item.code"
        :draggable="true"
        @dragstart.stop="() => handleDrag(item)"
      >
        {{ item.name }}
      </li>
    </ul>
    <div>
      <el-button @click="handleDeleteTreeNode">删除</el-button>
      <el-button @click="handleUpdateTreeNode">更新</el-button>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Tree from "../components/Tree/Tree.vue";
import { mockData } from "../utils/mock";
import { createUUID } from "../utils/utils";

@Component({
  components: {
    Tree,
  },
})
export default class TreeView extends Vue {
  private option = {
    height: "calc(100vh - 20px)", // 滚动容器的高度
    itemHeight: 36, // 单个item的高度
  };
  private tree: ITreeData[] = [];
  private scrollTop = 0;
  private selectNode = {};
  private arr = [
    {
      id: null,
      code: createUUID(),
      name: "child_1",
      cn: 0,
      sn: 0,
      tn: 0,
      ext: { OP: "1", RT: "datasource", IB: "0" },
      items: [],
    },
    {
      id: null,
      code: createUUID(),
      name: "child_2",
      cn: 0,
      sn: 0,
      tn: 0,
      ext: { OP: "1", RT: "datasource", IB: "0" },
      items: [],
    },
  ];

  private created() {
    for (let i = 0; i < 20; i++) {
      mockData.items.push({
        id: null,
        code: createUUID(),
        name: `child_${i + 1}`,
        cn: 0,
        sn: 0,
        tn: 0,
        ext: { OP: "1", RT: "datasource", IB: "0" },
        items: [],
      });
    }
    this.tree = [mockData];
  }

  private handleNodeClick(node: ITreeNode) {
    this.selectNode = node;
    console.log(node);
  }
  private getTreeData(data: ITreeData) {
    console.log(data);
  }
  private handleDeleteTreeNode() {
    (this.$refs.tree as any).deleteTreeNode();
  }
  private handleUpdateTreeNode() {
    (this.$refs.tree as any).updateTreeNode({ name: "朱博文" });
  }
  private handleAddNode(node: ITreeNode, callback: Function) {
    const item = {
      ...node,
      code: createUUID(),
      name: "未命名",
    };
    callback(item);
  }
  private handleLoadData(node: ITreeNode, callback: Function) {
    const { code } = node;
    setTimeout(() => {
      const arr = [];
      for (let i = 0; i < 2; i++) {
        arr.push({
          id: null,
          code: `${code}_${i}`,
          name: `child_${i + 1}`,
          cn: 0,
          sn: 0,
          tn: 0,
          ext: { OP: "1", RT: "datasource", IB: "0" },
          items: [],
        });
      }
      callback(arr);
    }, 1000);
  }
  private handleDrag(item: ITreeNode) {
    (this.$refs.tree as any).dragStart(item, true);
  }
  private handleCheckedChange(
    data: ITreeNode,
    checked: boolean,
    indeterminate: boolean
  ) {
    // eslint-disable-next-line no-console
    console.log(data, checked, indeterminate);
  }
}
</script>
<style>
.main {
  display: flex;
  justify-content: space-between;
  padding: 10px;
}
.treeWrap {
  width: 280px;
}
</style>
