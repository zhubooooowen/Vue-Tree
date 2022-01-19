<template>
  <div class="main">
    <TableTree
      ref="tableTree"
      :tree="tree"
      :props="props"
      :option="option"
      checkable
      :default-checked-keys="defaultCheckedKeys"
      :expand-keys.sync="expandKeys"
      :checked-keys.sync="checkedKeys"
      :load-data="handleLoadData"
      :loading="loading"
      @page-change="handlePageChange"
    >
      <template #header>
        <div>所属系统</div>
        <div>资源类型</div>
      </template>
      <template #treeNodeLeft="{ treeNode }">
        <i
          v-if="treeNode.expand && treeNode.childLen"
          class="el-icon-search"
          @click="handleShowSearchModal(treeNode)"
        ></i>
      </template>
      <template #treeNodeRight="{ treeNode: { $origin_data } }">
        <div>
          <el-tag size="mini" effect="plain" type="info">{{
            $origin_data.ext.systemName || "--"
          }}</el-tag>
        </div>
        <div>
          <el-tag size="mini" effect="plain" type="info">{{
            $origin_data.ext.RT || "--"
          }}</el-tag>
        </div>
      </template>
    </TableTree>
    <el-dialog title="搜索资源" :visible.sync="searchModalVisible" width="60%">
      <el-input
        placeholder="请搜索资源名称"
        v-model="searchTreeNodeName"
        @input="handleSearchTreeNode"
      />
      <el-table
        :data="searchTableData"
        tooltip-effect="dark"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="资源名称" show-overflow-tooltip />
        <el-table-column
          prop="$origin_data.ext.RT"
          label="资源类型"
          width="150"
        />
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="this.closeSearchModal">取 消</el-button>
        <el-button type="primary" @click="handleCheckSearchTreeNode"
          >确 定</el-button
        >
      </span>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import TableTree from "@/components/TableTree/Index.vue";
import { mockData, mockData2, mockData3 } from "@/utils/mock";
import { createUUID } from "@/components/Tree/utils";

@Component({
  components: {
    TableTree,
  },
})
export default class TableTreeView extends Vue {
  private option = {
    height: "calc(100vh - 90px)", // 滚动容器的高度
    itemHeight: 36, // 单个item的高度
    treeLeftWidth: "50%",
  };
  private props = {
    title: "name",
    children: "items",
  };
  private tree: any[] = [];
  private defaultCheckedKeys: string[] = [];
  private expandKeys: string[] = [];
  private checkedKeys: string[] = [];
  private searchModalVisible = false;
  private searchTreeIndex = 0;
  private searchTreeNodeName = "";
  private searchTreeNodeData: any[] = [];
  private searchTableData: any[] = [];
  private selectionTableData: any[] = [];
  private loading = false;

  private async created() {
    this.loading = true;
    this.setTreeData([[mockData], [mockData2], [mockData3]]);
    this.loading = false;
  }
  private setTreeData(treeData: any[][]) {
    this.tree = treeData.map((data) => this.formatTreeData(data));
  }
  private getParentStatus(children: any) {
    let statusLen = 0;
    for (let i = 0; i < children.length; i++) {
      const item = children[i];
      if (item.status === 1) statusLen++;
    }
    const everyChecked = statusLen === children.length;
    const someChecked = statusLen <= children.length && statusLen > 0;
    const status = everyChecked ? 1 : 0;
    // 没有全部选择，或者全部是半选，父节点为半选
    const indeterminate = someChecked && !everyChecked;
    return { status, indeterminate };
  }
  private formatTreeData(treeData: any[]) {
    return treeData.map((node: any) => {
      node.checkable = true;
      node.disableCheckbox = false;
      node.disableCheckboxHoverText = "";
      // 禁用逻辑
      if (node.ext.OP === "0") {
        node.disableCheckbox = true;
        node.disableCheckboxHoverText = "禁用";
      }
      let items: any = [];
      if (node.items && node.items.length) {
        items = this.formatTreeData(node.items);
        // 回溯，根据子节点的状态渲染父节点的状态
        const statusObj = this.getParentStatus(items);
        if (statusObj.status) {
          this.checkedKeys.push(node.id);
          this.expandKeys.push(node.id);
        }
        if (statusObj.indeterminate) {
          this.expandKeys.push(node.id);
        }
      } else {
        if (node.status) {
          this.checkedKeys.push(node.id);
          this.expandKeys.push(node.id);
        }
      }
      return {
        ...node,
        items,
      };
    });
  }
  private handleLoadData(node: ITreeNode, callback: Function) {
    setTimeout(() => {
      const arr = [];
      for (let i = 0; i < 2; i++) {
        const uuid = createUUID();
        arr.push({
          id: uuid,
          code: uuid,
          name: `child_${i + 1}`,
          checkable: true,
          checked: true,
          indeterminate: false,
          disableCheckbox: false,
          disableCheckboxHoverText: "",
          ext: { ...node.$origin_data.ext },
          items: [],
        });
      }
      callback(arr);
    }, 200);
  }
  private handleShowSearchModal(item: ITreeNode) {
    this.searchModalVisible = true;
    const tree = (this.$refs.tableTree as TableTree).getTreeRef();
    this.searchTreeNodeData = tree
      .getDescendants(item)
      .filter((item: ITreeNode) => item.visible);
  }
  private handleSearchTreeNode(e: string) {
    this.searchTableData = this.searchTreeNodeData.filter(
      (item: ITreeNode) => item.name === e
    );
  }
  private handleSelectionChange(val: ITreeNode[]) {
    this.selectionTableData = val;
  }
  private handleCheckSearchTreeNode() {
    const tree = (this.$refs.tableTree as TableTree).getTreeRef();
    this.selectionTableData.forEach((item) => {
      item.checked = true;
      tree.toggleChecked(item);
    });
    this.closeSearchModal();
  }
  private closeSearchModal() {
    this.searchModalVisible = false;
    this.searchTreeNodeName = "";
    this.searchTreeNodeData = [];
    this.searchTableData = [];
    this.selectionTableData = [];
  }
  private async handlePageChange(page: number) {
    this.loading = true;
    if (page === 1) {
      this.setTreeData([[mockData], [mockData2], [mockData3]]);
    } else {
      this.setTreeData([[mockData]]);
    }
    this.$nextTick(() => {
      this.loading = false;
    });
  }
}
</script>
<style lang="scss" scoped>
.main {
  padding: 0;
}
</style>
