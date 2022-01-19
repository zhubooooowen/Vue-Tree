<template>
  <div
    :title="item[props.title]"
    class="tree-list-view"
    :class="{ border: item.level === 1 }"
  >
    <div
      class="tree-list-view-left"
      :style="{
        paddingLeft:
          item.level - 1 ? 20 * (item.level - 1) + 10 + 'px' : '10px',
        height: option.itemHeight + 'px',
        width: option.treeLeftWidth || '50%',
      }"
    >
      <div class="tree-expand-icon-wrap">
        <!-- 非异步加载 -->
        <i
          class="el-icon-caret-right"
          :class="{
            expandTransform: item.expand,
            expandTransformReturn: !item.expand,
          }"
          @click.stop="$emit('toggle-expand', item)"
          v-if="!loadData && item.childLen"
        />
        <!-- 异步加载时，未点击，或者点击加载完毕并且有数据 -->
        <i
          class="el-icon-caret-right"
          :class="{
            expandTransform: item.expand,
            expandTransformReturn: !item.expand,
          }"
          @click.stop="$emit('toggle-expand', item)"
          v-if="
            loadData &&
            !item.loading &&
            (item.hasAsyncChildren === undefined || item.hasAsyncChildren === 1)
          "
        />
        <i v-if="item.loading" class="el-icon-loading"></i>
      </div>

      <el-tooltip
        v-if="
          checkable &&
          item[props.checkable] &&
          item[props.disableCheckbox] &&
          item[props.disableCheckboxHoverText]
        "
        effect="dark"
        :content="item[props.disableCheckboxHoverText]"
        placement="top"
      >
        <el-checkbox
          v-model="item[props.checked]"
          :indeterminate="item[props.indeterminate]"
          :disabled="item[props.disableCheckbox]"
          @click.native="stopDefault($event)"
          @change="$emit('toggle-checked', item)"
        ></el-checkbox>
      </el-tooltip>
      <el-checkbox
        v-if="
          checkable &&
          item[props.checkable] &&
          item[props.disableCheckbox] &&
          !item[props.disableCheckboxHoverText]
        "
        v-model="item[props.checked]"
        :indeterminate="item[props.indeterminate]"
        :disabled="item[props.disableCheckbox]"
      ></el-checkbox>
      <el-checkbox
        v-if="
          checkable && item[props.checkable] && !item[props.disableCheckbox]
        "
        v-model="item[props.checked]"
        :indeterminate="item[props.indeterminate]"
        :disabled="treeDisabled"
        @click.native="stopDefault($event)"
        @change="$emit('toggle-checked', item)"
      ></el-checkbox>

      <div class="tree-list-content">
        {{ item[props.title] }}
      </div>
      <div class="tree-list-ext">
        <slot name="treeNodeLeft" v-bind:treeNode="item"></slot>
      </div>
    </div>
    <div class="tree-list-view-right">
      <slot name="treeNodeRight" v-bind:treeNode="item"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import TreeNode from "@/components/Tree/TreeNode.vue";

@Component
export default class TableTreeNode extends TreeNode {}
</script>

<style scoped lang="scss">
.tree-list-view {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  color: rgba(0, 0, 0, 0.6);
  .tree-list-view-left {
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
    justify-content: flex-start;
    font-size: 14px;
    .tree-list-content {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-left: 5px;
    }
    .tree-list-ext {
      margin-left: 10px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .tree-expand-icon-wrap {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      .el-icon-caret-right,
      .el-icon-loading {
        color: #c0c4cc;
        font-size: 16px;
      }
      .expandTransform {
        transition: 0.2s;
        transform-origin: center;
        transform: rotateZ(90deg);
      }
      .expandTransformReturn {
        transition: 0.2s;
        transform-origin: center;
        transform: rotateZ(0deg);
      }
    }
  }
  .tree-list-view-right {
    flex: 1;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    > * {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
    }
  }
}

.tree-list-view.active:hover {
  background-color: rgb(232, 241, 252);
  color: #1b77ec;
}
.tree-list-view:hover {
  color: rgba(0, 0, 0, 0.6);
  background: #e0e0e0;
}
.border {
  border-top: 1px solid rgba($color: #000000, $alpha: 0.1);
}
</style>
