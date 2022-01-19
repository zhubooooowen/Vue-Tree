<template>
  <div class="main">
    <div class="treeWrap">
      <Tree
        v-if="tree.length"
        ref="tree"
        :tree="tree"
        :props="props"
        :option="option"
        draggable
        :expand-keys.sync="expandKeys"
        :default-expand-all="true"
        :default-active-key="defaultActiveKey"
        :nodeClass="setNodeClass"
        @node-click="handleNodeClick"
        @toggle-checked="handleToggleChecked"
      >
        <template #default="{ treeNode }">
          <div class="tree-content" :class="treeNode.dropPosition">
            <span class="tree-name">{{ treeNode.name }}</span>
          </div>
          <i
            class="el-icon-circle-plus-outline"
            @click.stop="handleAddTreeNode(treeNode)"
          ></i>
        </template>
      </Tree>
    </div>
    <div>
      <el-button @click="handleExpandTreeNode">展开节点</el-button>
      <el-button @click="handleDeleteTreeNode">删除</el-button>
      <el-button @click="handleUpdateTreeNode">更新</el-button>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Tree from "@/components/Tree/Tree.vue";
import { mockData } from "@/utils/mock";
import { createUUID } from "@/components/Tree/utils";

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
  private props = {
    title: "name",
    children: "items",
  };
  private tree: any[] = [];
  private arr = [
    {
      id: null,
      code: createUUID(),
      name: "child_1",
      ext: { OP: "1", RT: "child", IB: "1" },
      items: [],
    },
    {
      id: null,
      code: createUUID(),
      name: "child_2",
      ext: { OP: "1", RT: "child", IB: "1" },
      items: [],
    },
  ];
  private defaultActiveKey = "";
  private expandKeys: string[] = [];

  private created() {
    for (let i = 0; i < 100; i++) {
      const uuid = createUUID();
      mockData.items.push({
        id: uuid,
        code: uuid,
        name: uuid,
        items: [],
      });
    }
    const treeData = [mockData];
    this.tree = treeData;
    this.defaultActiveKey = treeData[0].id;
    this.expandKeys = [treeData[0].id];
  }

  private setNodeClass(node: any) {
    if (node.dropPosition) {
      return node.dropPosition;
    }
    return "";
  }

  private handleNodeClick(node: ITreeNode) {
    console.log(node);
  }
  private handleExpandTreeNode() {
    this.expandKeys.push("zbwtest_api_test_2");
  }
  private handleDeleteTreeNode() {
    (this.$refs.tree as Tree).deleteTreeNode();
  }
  private handleUpdateTreeNode() {
    (this.$refs.tree as Tree).updateActiveTreeNode({ name: "朱博文" });
  }
  private handleAddTreeNode(parentNode: ITreeNode) {
    const uuid = createUUID();
    const node = {
      uuid,
      name: "未命名",
    };
    (this.$refs.tree as Tree).addTreeNode(parentNode, node);
  }
  private handleLoadData(node: ITreeNode, callback: Function) {
    setTimeout(() => {
      const arr = [];
      for (let i = 0; i < 2; i++) {
        const uuid = createUUID();
        arr.push({
          id: uuid,
          code: uuid,
          name: uuid,
          ext: { ...node.$origin_data.ext },
          items: [],
        });
      }
      callback(arr);
    }, 200);
  }
  private handleToggleChecked(item: ITreeNode) {
    console.log(item);
  }
}
</script>
<style lang="scss">
.main {
  display: flex;
  justify-content: space-between;
  padding: 10px;
}
.treeWrap {
  width: 300px;
  .tree-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tree-content.prev {
    border-top: 2px dashed #1b77ec;
  }
  .tree-content.next {
    border-bottom: 2px dashed #1b77ec;
  }
  .tree-name {
    margin-left: 5px;
    max-width: 80%;
    line-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tree-tag {
    margin-left: 5px;
    border: 1px solid;
    padding: 0 2px;
    font-size: 12px;
    flex-shrink: 0;
  }
  .el-icon-circle-plus-outline {
    font-size: 16px;
    font-weight: bold;
    color: #1b77ec;
    margin-left: 5px;
    position: absolute;
    right: 5px;
    display: none;
  }
  .tree-list-view:hover .el-icon-circle-plus-outline {
    display: block;
  }
  .tree-list-view.inner {
    border: 2px dashed #1b77ec;
  }
}
</style>
