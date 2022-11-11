<template>
  <div class="main">
    <div class="treeWrap">
      <keep-alive>
        <Tree
          v-if="activeName === '1'"
          v-show="isShowTree"
          ref="tree"
          :tree="tree"
          :props="props"
          :option="option"
          draggable
          :expand-keys.sync="expandKeys"
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
        <BaseTree v-if="activeName === '2'" v-show="isShowTree" />
      </keep-alive>
    </div>
    <div>
      <el-button @click="handleDeleteTreeNode">删除</el-button>
      <el-button @click="handleUpdateTreeNode">更新</el-button>
      <el-button @click="handleBackTop">回到顶部</el-button>
      <el-button @click="handleToggleTreeShow">切换显示/隐藏</el-button>
      <el-button @click="handleToggleTreeData">更换整树数据</el-button>
      <el-button @click="handleToggleTree('1')">切换树1</el-button>
      <el-button @click="handleToggleTree('2')">切换树2</el-button>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Tree from "@/components/Tree/Tree.vue";
import BaseTree from "./BaseTree.vue";
import { mockData, mockData2, mockData3 } from "@/utils/mock";
import { createUUID } from "@/components/Tree/utils";

@Component({
  components: {
    Tree,
    BaseTree,
  },
})
export default class TreeView extends Vue {
  private option = {
    height: "100%", // 滚动容器的高度
    itemHeight: 36, // 单个item的高度
  };
  private props = {
    title: "name",
    children: "items",
  };
  private tree: any[] = [];
  private tree2: any[] = [];
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
  private isShowTree = true;
  private activeName = "1";

  private created() {
    this.tree = this.initTreeData(mockData);
  }
  private initTreeData(mockData: any) {
    for (let i = 0; i < 300; i++) {
      const uuid = createUUID();
      mockData.items.push({
        uuid,
        id: uuid,
        code: uuid,
        name:
          i % 2
            ? `测试长度测试长度测试长度测试长度 ${i}`
            : i % 3
            ? `测试长度测试长度测试长度测试长度测试长度测试长度测试长度测试长度 ${i}`
            : i,
        items: [],
      });
    }
    const treeData = [mockData];
    this.defaultActiveKey = treeData[0].id;
    this.expandKeys = [treeData[0].id];
    return treeData;
  }

  private setNodeClass(node: any) {
    if (node.dropPosition) {
      return node.dropPosition;
    }
    return "";
  }

  private handleToggleTree(tab: string) {
    this.activeName = tab;
    if (tab === "1") {
      this.tree = this.initTreeData(mockData);
    } else {
      this.tree2 = this.initTreeData(mockData2);
    }
  }

  private handleNodeClick(node: ITreeNode) {
    console.log(node);
  }
  private handleDeleteTreeNode() {
    (this.$refs.tree as Tree).deleteTreeNode();
  }
  private handleUpdateTreeNode() {
    (this.$refs.tree as Tree).updateActiveTreeNode({ name: "朱博文" });
  }
  private handleBackTop() {
    (this.$refs.tree as Tree).updateVisibleData(0);
  }
  private handleToggleTreeShow() {
    this.isShowTree = !this.isShowTree;
  }
  private handleToggleTreeData() {
    this.tree = this.initTreeData(mockData3);
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
  height: calc(100vh - 20px);
  .tree-content {
    margin-left: 5px;
    flex: 1;
  }
  .tree-content.prev {
    border-top: 2px dashed #1b77ec;
  }
  .tree-content.next {
    border-bottom: 2px dashed #1b77ec;
  }
  .tree-name {
    max-width: 80%;
    line-height: 36px;
    /* overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap; */
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
