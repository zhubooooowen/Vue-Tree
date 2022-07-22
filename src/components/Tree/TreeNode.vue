<template>
  <div
    :title="item[props.title]"
    :class="getNodeClass(item)"
    :style="{
      paddingLeft: item.level - 1 ? 20 * (item.level - 1) + 'px' : 0,
      minHeight: option.itemHeight + 'px',
    }"
    @click.stop="(e) => $emit('node-click', item, e)"
    :draggable="draggable"
    @dragstart="(e) => handleDragStart(item, e)"
    @dragover="(e) => handleDragOver(item, e)"
    @drop="(e) => handleDrop(item, e)"
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
        checkable &&
        item[props.checkable] &&
        !item[props.disableCheckbox] &&
        !item[props.disableCheckboxHoverText]
      "
      v-model="item[props.checked]"
      :indeterminate="item[props.indeterminate]"
      :disabled="item[props.disableCheckbox]"
      @click.native="stopDefault($event)"
      @change="$emit('toggle-checked', item)"
    ></el-checkbox>
    <!-- 默认插槽 -->
    <slot v-bind:treeNode="item">
      <div class="tree-list-content">
        {{ item[props.title] }}
      </div>
      <span
        v-if="item.dropPosition === 'prev'"
        class="tree-list-view-line tree-list-view-line-prev"
      ></span>
      <span
        v-if="item.dropPosition === 'next'"
        class="tree-list-view-line tree-list-view-line-next"
      ></span>
    </slot>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class TreeNode extends Vue {
  @Prop(Object)
  public item!: ITreeNode;
  @Prop(Object)
  public props!: IProps;
  @Prop(Object)
  public option!: IOption;
  @Prop(Boolean)
  public draggable!: boolean;
  @Prop(Boolean)
  public checkable!: boolean;
  @Prop([Function, Boolean])
  public loadData!: (
    item: ITreeNode,
    getAsyncData: Function,
    flatData: ITreeNode[]
  ) => void | boolean; // 异步加载
  @Prop([String, Function])
  public nodeClass!: (item: ITreeNode) => string | string; // 节点的 class

  public stopDefault(e: Event) {
    // 阻止 checkout 冒泡
    e.stopPropagation();
  }

  public getNodeClass(item: ITreeNode) {
    let className = "tree-list-view ";
    if (item.active) {
      className += "active ";
    }
    const isFun = typeof this.nodeClass === "function";
    if (isFun) {
      className += this.nodeClass(item);
    } else {
      className += this.nodeClass || "";
    }
    return className;
  }

  public handleDragStart(item: ITreeNode, e: DragEvent) {
    if (!this.draggable) return;
    e.stopPropagation();
    this.$emit("drag-start", item);
  }

  public handleDragOver(item: ITreeNode, e: DragEvent) {
    if (!this.draggable) return;
    e.stopPropagation();
    this.$emit("drag-over", item, e);
  }

  public handleDrop(item: ITreeNode, e: DragEvent) {
    if (!this.draggable) return;
    e.stopPropagation();
    this.$emit("drop", item);
  }
}
</script>

<style scoped lang="scss">
.tree-list-view {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: flex-start;
  font-size: 14px;
  color: #111;
  padding-right: 10px;
  .tree-list-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    margin-left: 5px;
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
  .tree-list-view-line {
    position: absolute;
    width: 100%;
    height: 2px;
    background: #1b77ec;
    left: 0;
    /* 隐藏在下面，防止拖拽时获取位置不准确 */
    z-index: -1;
  }
  .tree-list-view-line-prev {
    top: -1px;
  }
  .tree-list-view-line-next {
    bottom: -1px;
  }
}
.tree-list-view.active {
  background-color: rgb(232, 241, 252);
  color: #1b77ec;
  .tree_close {
    border-color: transparent transparent transparent #1b77ec;
  }
  .tree_expand {
    border-color: #1b77ec transparent transparent transparent;
  }
}
.tree-list-view.active:hover {
  background-color: rgb(232, 241, 252);
  color: #1b77ec;
}
.tree-list-view:hover {
  color: #000000;
  background: #e0e0e0;
}
</style>
