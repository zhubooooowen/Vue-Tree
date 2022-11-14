<template>
  <div
    class="tree"
    ref="scroller"
    :style="{ height: option.height }"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${allVisibleHeight}px` }">
      <div :style="{ transform: `translateY(${offset}px)` }" ref="tree">
        <tree-node
          v-for="item in visibleData"
          :key="item[_props_.id]"
          :item="item"
          :props="_props_"
          :option="option"
          :checkable="checkable"
          :load-data="loadData"
          :node-class="nodeClass"
          :treeDisabled="treeDisabled"
          @toggle-expand="toggleExpand"
          @toggle-checked="toggleChecked"
        >
          <template #treeNodeLeft="slotProps">
            <slot
              name="treeNodeLeft"
              v-bind:treeNode="slotProps.treeNode"
            ></slot>
          </template>
          <template #treeNodeRight="slotProps">
            <slot
              name="treeNodeRight"
              v-bind:treeNode="slotProps.treeNode"
            ></slot>
          </template>
        </tree-node>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import TreeNode from "./TreeNode.vue";
import Tree from "@/components/Tree/Tree.vue";

@Component({
  components: {
    TreeNode,
  },
})
export default class TableBaseTree extends Tree {}
</script>

<style scoped lang="scss">
.tree {
  width: 100%;
  overflow: auto;
  border-bottom: 1px solid rgba($color: #000000, $alpha: 0.1);
}
</style>
