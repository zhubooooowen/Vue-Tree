<template>
  <div class="table-tree">
    <i class="el-icon-loading" v-if="loading"></i>
    <div class="table-tree-header">
      <div
        class="table-tree-header-left"
        :style="{ width: option.treeLeftWidth || '50%' }"
      >
        资源名称
      </div>
      <div class="table-tree-header-right">
        <slot name="header"></slot>
      </div>
    </div>
    <Tree
      ref="tree"
      :tree="tree"
      :option="option"
      v-bind="$attrs"
      v-on="$listeners"
    >
      <template #treeNodeLeft="slotProps">
        <slot name="treeNodeLeft" v-bind:treeNode="slotProps.treeNode"></slot>
      </template>
      <template #treeNodeRight="slotProps">
        <slot name="treeNodeRight" v-bind:treeNode="slotProps.treeNode"></slot>
      </template>
    </Tree>
    <div class="table-tree-pagination">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="3"
        :page-size="2"
        @current-change="(currentPage) => $emit('page-change', currentPage)"
      >
      </el-pagination>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import Tree from "@/components/TableTree/Tree/Tree.vue";

@Component({
  components: {
    Tree,
  },
})
export default class TableTree extends Vue {
  @Prop({
    type: Array,
    required: true,
    default() {
      return [];
    },
  })
  private tree!: any[][];
  @Prop(Object)
  public option!: IOption;
  @Prop(Boolean)
  loading!: boolean;

  public getTreeRef() {
    return this.$refs.tree as Tree;
  }
}
</script>
<style lang="scss" scoped>
.table-tree {
  position: relative;
  width: 100%;
  .el-icon-loading {
    font-size: 30px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .table-tree-header {
    height: 36px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #9b9b9b;
    background: #edf0f7;
    .table-tree-header-left {
      padding-left: 10px;
    }
    .table-tree-header-right {
      width: 50%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      > * {
        flex: 1;
      }
    }
  }
  .table-tree-pagination {
    display: flex;
    justify-content: flex-end;
    margin: 10px 0;
  }
}
</style>
