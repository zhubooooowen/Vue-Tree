<template>
  <div class="treeWrap">
    <Tree
      ref="tree"
      :tree="tree"
      :props="props"
      :option="option"
      :expand-keys.sync="expandKeys"
      :default-active-key="defaultActiveKey"
    />
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Tree from "@/components/Tree/Tree.vue";
import { mockData2 } from "@/utils/mock";
import { createUUID } from "@/components/Tree/utils";

@Component({
  components: {
    Tree,
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
    id: "uuid",
  };
  private tree: any[] = [];
  private defaultActiveKey = "";
  private expandKeys: string[] = [];

  private created() {
    this.tree = this.initTreeData(mockData2);
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
    this.formatTreeData(treeData);
    this.defaultActiveKey = treeData[0].uuid;
    this.expandKeys = [treeData[0].uuid];
    return treeData;
  }

  private formatTreeData(treeData: any[]) {
    treeData.forEach((node: any) => {
      node.uuid = createUUID();
      if (node.items && node.items.length) {
        this.formatTreeData(node.items);
      }
    });
  }
}
</script>
<style lang="scss" scoped></style>
