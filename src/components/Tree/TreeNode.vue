<template>
  <div class="tree_list_view_wrap">
    <div
      :title="item[nameKey]"
      class="tree_list_view"
      :class="item.active ? 'active' : ''"
      :style="{
        paddingLeft: item.level - 1 ? 20 * (item.level - 1) + 'px' : 0,
        height: itemHeight + 'px',
      }"
      @click.stop="$emit('node-click', item)"
      :draggable="draggable"
      @dragstart.stop="$emit('drag-start', item)"
      @dragover.stop="(e) => $emit('drag-over', e, item)"
      @drop.stop="$emit('drop', item)"
    >
      <el-checkbox
        v-if="showCheckbox"
        v-model="item.checked"
        :indeterminate="item.indeterminate"
        @click.native="stopDefault($event)"
        @change="$emit('toggle-checked', item)"
      ></el-checkbox>
      <!-- 非异步加载 -->
      <i
        :class="item.expand ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
        @click.stop="$emit('toggle-expand', item)"
        v-if="!loadData && item.childLen"
      />
      <!-- 异步加载时，未点击，或者点击加载完毕并且有数据 -->
      <i
        :class="item.expand ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
        @click.stop="$emit('toggle-expand', item)"
        v-if="
          loadData &&
          !item.loading &&
          (item.hasAsyncChildren === undefined || item.hasAsyncChildren === 1)
        "
      />
      <i v-if="item.loading" class="el-icon-loading"></i>
      <!-- 非异步加载，没有孩子的时候 -->
      <i v-if="!loadData && !item.childLen" class="tree_list_circle_icon"></i>
      <!-- 异步加载，且没有数据的时候 -->
      <i
        v-if="loadData && item.hasAsyncChildren === 0"
        class="tree_list_circle_icon"
      ></i>
      <div class="tree_list_content">
        {{ item[nameKey] }}
      </div>
      <i
        class="el-icon-circle-plus-outline"
        @click.stop="$emit('add-tree-node', item)"
        v-if="addNode"
      ></i>
      <span
        v-if="item.dropPosition === 'prev'"
        class="tree_list_view_line tree_list_view_line_prev"
      ></span>
      <span
        v-if="item.dropPosition === 'next'"
        class="tree_list_view_line tree_list_view_line_next"
      ></span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class TreeNode extends Vue {
  @Prop({
    type: Object,
    required: true,
  })
  private item!: {};
  @Prop({
    type: String,
  })
  private nameKey!: string;
  @Prop({
    type: Number,
  })
  private itemHeight!: number;
  @Prop({
    type: Boolean,
  })
  private draggable!: boolean;
  @Prop({
    type: Boolean,
  })
  private showCheckbox!: boolean;
  @Prop([Function, Boolean])
  private addNode!: any; // 动态添加节点
  @Prop([Function, Boolean])
  private loadData!: any; // 异步加载

  private stopDefault(e: any) {
    // 阻止 checkout 冒泡
    e.stopPropagation();
  }
}
</script>

<style scoped lang="scss">
.tree_list_view_wrap {
  width: 100%;
  position: relative;
  .tree_list_view {
    display: flex;
    align-items: center;
    cursor: pointer;
    justify-content: flex-start;
    font-size: 14px;
    color: #111;
    min-width: 50%;
    .tree_list_content {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .el-icon-caret-bottom,
    .el-icon-caret-right,
    .el-icon-loading {
      color: #c0c4cc;
      font-size: 16px;
    }
    .el-icon-circle-plus-outline {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      right: 15px;
      font-weight: 700;
      color: #1b77ec;
      font-size: 16px;
      display: none;
    }
    .tree_list_circle_icon {
      margin: 0 6px;
      width: 4px;
      height: 4px;
      border-radius: 10px;
      background: #111;
      flex-shrink: 0; /* 防止被挤压 */
    }
    .tree_list_view_line {
      position: absolute;
      width: 100%;
      height: 2px;
      background: #1b77ec;
      left: 0;
      /* 隐藏在下面，防止拖拽时获取位置不准确 */
      z-index: -1;
    }
    .tree_list_view_line_prev {
      top: -1px;
    }
    .tree_list_view_line_next {
      bottom: -1px;
    }
  }
  .tree_list_view.active {
    background-color: rgb(232, 241, 252);
    color: #1b77ec;
    .tree_close {
      border-color: transparent transparent transparent #1b77ec;
    }
    .tree_expand {
      border-color: #1b77ec transparent transparent transparent;
    }
    .tree_list_circle_icon {
      background: #1b77ec;
    }
  }
  .tree_list_view.active:hover {
    background-color: rgb(232, 241, 252);
    color: #1b77ec;
  }
  .tree_list_view:hover {
    color: #000000;
    background: #e0e0e0;
    .el-icon-circle-plus-outline {
      display: block;
    }
  }
}
</style>
