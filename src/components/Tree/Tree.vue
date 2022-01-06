<template>
  <div
    class="tree"
    ref="scroller"
    :style="{ height: option.height }"
    @scroll="handleScroll"
  >
    <div class="tree_content" :style="{ transform: `translateY(${offset}px)` }">
      <tree-node
        v-for="item in visibleData"
        :key="item[idKey]"
        :item="item"
        :name-key="nameKey"
        :item-height="option.itemHeight"
        :draggable="!loadData && !showCheckbox && draggable"
        :show-checkbox="showCheckbox"
        :add-node="!loadData && !showCheckbox && addNode"
        :load-data="loadData"
        @node-click="handleClick"
        @drag-start="dragStart"
        @drag-over="dragOver"
        @drop="drop"
        @toggle-expand="toggleExpand"
        @add-tree-node="addTreeNode"
        @toggle-checked="toggleChecked"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";
import TreeNode from "./TreeNode.vue";
import { cloneDeep, throttle } from "lodash";
import { flatten, findDescendants, findElders, listToTree } from "./utils";

@Component({
  components: {
    TreeNode,
  },
})
export default class Tree extends Vue {
  @Prop({
    type: Array,
    required: true,
    default() {
      return [];
    },
  })
  private tree!: ITreeData[];
  @Prop({
    type: String,
    default() {
      return "children";
    },
  })
  private childrenKey!: string;
  @Prop({
    type: String,
    default() {
      return "id";
    },
  })
  private idKey!: string;
  @Prop({
    type: String,
    default() {
      return "name";
    },
  })
  private nameKey!: string;
  @Prop({
    type: Object,
    default() {
      return {
        height: 500, // 滚动容器的高度
        itemHeight: 25, // 单个item的高度
      };
    },
  })
  private option!: IOption;
  @Prop(Boolean)
  private draggable!: boolean; // 拖拽
  @Prop([Function, Boolean])
  private addNode!: any; // 动态添加节点
  @Prop([Function, Boolean])
  private loadData!: any; // 异步加载
  @Prop(Boolean)
  private expandAll!: boolean; // 初始化是否展开全部节点
  @Prop([Number, String])
  private activeNodeId!: string; // 初始化默认选中哪个节点
  @Prop(Boolean)
  showCheckbox!: boolean; // 是否展示选择框

  private offset = 0; // translateY偏移量
  private flattenTree: ITreeNode[] = [];
  private visibleData: ITreeNode[] = [];
  private dragItem: ITreeNode = {}; // 拖拽项
  private dragIndex = 0; // 拖拽项索引
  private dragLevel = 0; // 拖拽项 level
  private dragItemDescendants: ITreeNode[] = []; // 拖拽项子孙
  private dragItemPrevId = ""; // 拖拽项上一项（visibleData） id
  private dragItemNextId = ""; // 拖拽项下一项（visibleData） id
  private dropItemId = ""; // 接收项 id
  private dropPosition = ""; // 接收项标线位置
  private asyncItem: ITreeNode = []; // 异步加载项
  private fromOut = false;
  private handleScroll = throttle(() => {
    this.updateVisibleData((this.$refs.scroller as HTMLElement).scrollTop);
  }, 50);

  get visibleCount(): number {
    return Math.floor(
      (this.$refs.scroller as HTMLElement).offsetHeight / this.option.itemHeight
    );
  }

  @Watch("tree")
  private onTreeChange(val: ITreeData[]) {
    this.flattenTree = flatten(val, 1, 0, {
      childrenKey: this.childrenKey,
      idKey: this.idKey,
      expandAll: this.loadData ? false : this.expandAll, // 异步加载不支持默认全部展开
      activeNodeId: this.activeNodeId,
    });
  }
  @Watch("flattenTree")
  private onFlattenTreeChange(val: ITreeNode[]) {
    this.updateVisibleData((this.$refs.scroller as HTMLElement).scrollTop, val); // 重新渲染可视化数据
  }
  @Watch("dropPosition")
  private watchDropPosition(val: string) {
    const visibleData = cloneDeep(this.visibleData);
    visibleData.forEach((node) => {
      const id = node[this.idKey];
      if (id === this.dropItemId) {
        node.dropPosition = val;
      }
      // 拖拽项上一项不展示下标线，拖拽项下一项不展示上标线，拖拽到根节点不展示标线
      if (
        (id === this.dragItemPrevId && val === "next") ||
        (id === this.dragItemNextId && val === "prev") ||
        id === this.flattenTree[0][this.idKey]
      ) {
        node.dropPosition = "";
      }
    });
    this.visibleData = visibleData;
  }
  @Watch("dropItemId")
  private watchDropItemId(val: string) {
    const visibleData = cloneDeep(this.visibleData);
    visibleData.forEach((node) => {
      if (node[this.idKey] !== val) {
        node.dropPosition = "";
      }
    });
    this.visibleData = visibleData;
  }

  private created() {
    this.flattenTree = flatten(this.tree, 1, 0, {
      childrenKey: this.childrenKey,
      idKey: this.idKey,
      expandAll: this.loadData ? false : this.expandAll, // 异步加载不支持默认全部展开
      activeNodeId: this.activeNodeId,
    });
  }

  private mounted() {
    this.handleScroll();
    // 初始点击默认选中项
    const index = this.flattenTree.findIndex(
      (item) => item[this.idKey] === this.activeNodeId
    );
    this.$emit("node-click", this.flattenTree[index] || this.flattenTree[0]);
  }
  private updateVisibleData(scrollTop = 0, flattenTree = this.flattenTree) {
    let start =
      Math.floor(scrollTop / this.option.itemHeight) -
      Math.floor(this.visibleCount / 2);
    start = start < 0 ? 0 : start;
    const end = start + this.visibleCount * 2;
    const allVisibleData = flattenTree.filter((item) => item.visible);
    this.visibleData = allVisibleData.slice(start, end);
    this.offset = start * this.option.itemHeight;
  }
  private toggleExpand(item: ITreeNode) {
    const isExpand = item.expand;
    if (isExpand) {
      this.collapse(item); // 折叠
    } else {
      this.expand(item); // 展开
    }
  }
  private expand(item: ITreeNode) {
    // 展开节点
    const flattenTree = cloneDeep(this.flattenTree);
    // 异步加载
    if (this.loadData) {
      const children = flattenTree.filter(
        (node) => node.pid === item[this.idKey]
      );
      if (!children.length) {
        flattenTree.forEach((node) => {
          if (item[this.idKey] === node[this.idKey]) {
            node.loading = true;
          }
        });
        this.asyncItem = item;
        this.loadData(item, this.getAsyncData, this.flattenTree);
      }
    }
    flattenTree.forEach((node) => {
      if (node.pid === item[this.idKey]) {
        node.visible = true;
      }
      if (item[this.idKey] === node[this.idKey]) {
        node.expand = true;
      }
    });
    this.flattenTree = flattenTree;
  }
  private collapse(item: ITreeNode) {
    // 折叠节点
    const flattenTree = cloneDeep(this.flattenTree);
    const index = flattenTree.findIndex(
      (node) => node[this.idKey] === item[this.idKey]
    );
    // 找出子孙节点
    for (let i = 0; i < flattenTree.length; i++) {
      if (item[this.idKey] === flattenTree[i][this.idKey]) {
        flattenTree[i].expand = false;
      }
      if (i > index) {
        // 等级比自身相等或者变小了，说明已经找到全部子孙节点
        if (flattenTree[i].level <= item.level) {
          break;
        }
        flattenTree[i].visible = false;
        flattenTree[i].expand = false;
      }
    }
    this.flattenTree = flattenTree;
  }
  private handleClick(item: ITreeNode) {
    const flattenTree = cloneDeep(this.flattenTree);
    flattenTree.forEach((node) => {
      node.active = false;
      if (node[this.idKey] === item[this.idKey]) {
        node.active = true;
      }
    });
    this.flattenTree = flattenTree;
    this.$emit("node-click", item);
  }
  private setlistToTree(flattenTree: ITreeNode[]) {
    this.flattenTree = flattenTree;
    const tree = listToTree(
      cloneDeep(flattenTree),
      this.childrenKey,
      this.idKey
    );
    this.$emit("get-tree-data", tree);
  }
  private dropClearData() {
    this.dragItem = {};
    this.dragIndex = 0;
    this.dragLevel = 0;
    this.dragItemDescendants = [];
    this.dragItemPrevId = "";
    this.dragItemNextId = "";
    this.dropItemId = "";
    this.dropPosition = "";
  }
  private dragStart(item: ITreeNode, fromOut: boolean) {
    // 外部拖拽（数据格式一致）
    if (
      fromOut &&
      !this.flattenTree.find((node) => node[this.idKey] === item[this.idKey])
    ) {
      this.fromOut = fromOut;
      this.dropPosition = "inner";
      const dragItem = {
        ...item,
        pid: -1,
        expand: false,
        level: 0,
        visible: true,
        childLen: 0,
        active: false,
        checked: false,
        indeterminate: false,
      };
      this.dragItem = dragItem;
      return;
    }
    this.dragItem = item;
    // 遍历找出被拖拽节点的全部子孙节点
    this.dragItemDescendants = findDescendants(
      this.flattenTree,
      item,
      this.idKey
    );
    // 所在位置
    this.dragIndex = this.flattenTree.findIndex(
      (node) => node[this.idKey] === item[this.idKey]
    );
    this.dragLevel = item.level; // 拖拽节点等级
    const dragVisibleIndex = this.visibleData.findIndex(
      (node) => node[this.idKey] === item[this.idKey]
    );
    for (let i = 0; i < this.visibleData.length; i++) {
      if (this.visibleData[i].level === item.level) {
        if (i < dragVisibleIndex) {
          // 获取同级拖拽项的上一项，不展示下标线
          this.dragItemPrevId = this.visibleData[i][this.idKey];
        }
        if (i > dragVisibleIndex) {
          // 获取同级拖拽项的下一项，不展示上标线
          this.dragItemNextId = this.visibleData[i][this.idKey];
          break;
        }
      }
    }
  }
  private dragOver(e: any, item: ITreeNode) {
    e.preventDefault(); // 禁用 dragOver 的默认事件才能触发 drop
    // 从外往里拖 不展示标线
    if (this.fromOut) return;
    this.dropPosition = ""; // 清空标线（拖回自身的时候）
    if (this.dragItem[this.idKey] !== item[this.idKey]) {
      const { pageY } = e;
      const { itemHeight } = this.option;
      // 不能使用 e.target
      const { top } = e.currentTarget.getBoundingClientRect();
      this.dropItemId = item[this.idKey];
      // 鼠标位于上四分之一是 prev，下四分之一是 next，中间是 inner
      if (
        top + 0.25 * itemHeight <= pageY &&
        pageY <= top + 0.75 * itemHeight
      ) {
        this.dropPosition = "inner";
      } else if (pageY < top + 0.25 * itemHeight) {
        this.dropPosition = "prev";
      } else if (pageY > top + 0.75 * itemHeight) {
        this.dropPosition = "next";
      }
    }
  }
  private drop(item: ITreeNode) {
    // 禁止父拖到子孙，自己拖自己，子拖到根元素，子 inner 父
    if (
      this.dragItem[this.idKey] === item[this.idKey] ||
      this.dragItemDescendants
        .map((item) => item[this.idKey])
        .includes(item[this.idKey]) ||
      this.dropItemId === this.flattenTree[0][this.idKey] ||
      !this.dropPosition ||
      (this.dropPosition === "inner" && this.dragItem.pid === item[this.idKey])
    ) {
      // 拖拽完毕清空接收项数据，消除标线
      this.dropClearData();
      return;
    }
    const flattenTree = cloneDeep(this.flattenTree);
    // 从外往里拖 不删除
    !this.fromOut && flattenTree.splice(this.dragIndex, 1); // 删除拖拽项
    // 获取接收项在 flattenTree 里的索引
    const index = flattenTree.findIndex(
      (node) => node[this.idKey] === item[this.idKey]
    );
    const itemDescendants = findDescendants(flattenTree, item, this.idKey); // 获取接收项的子孙
    const dragItem = cloneDeep(this.dragItem);
    if (this.dropPosition === "inner") {
      // 拖拽项变为接收项子节点
      dragItem.pid = item[this.idKey];
      dragItem.level = item.level + 1; // 拖拽项 level 变为接收项 level + 1
    } else {
      // 拖拽项变为接收项同级别
      dragItem.pid = item.pid;
      dragItem.level = item.level; // 拖拽项 level 变为接收项 level
    }
    const spliceIndex =
      this.dropPosition === "prev"
        ? index // 放到接收项的上方
        : index + itemDescendants.length + 1; // 放到接收项的子孙下方
    flattenTree.splice(spliceIndex, 0, dragItem);
    // 如果存在拖拽项子孙
    if (this.dragItemDescendants.length) {
      this.dragItemDescendants.forEach((item) => {
        const levelDiff = item.level - this.dragLevel; // 计算子节点 level 和父节点原始 level 差值
        item.level = dragItem.level + levelDiff; // 子节点现在的 level 就等于父节点现在的 level + levelDiff
        const index = flattenTree.findIndex(
          (node) => node[this.idKey] === item[this.idKey]
        );
        flattenTree.splice(index, 1); // 删除其子孙节点
      });
      // 获取接收项在 flattenTree 里的索引，此时的接收项是原拖拽项
      const index = flattenTree.findIndex(
        (node) => node[this.idKey] === this.dragItem[this.idKey]
      );
      flattenTree.splice(index + 1, 0, ...this.dragItemDescendants); // 需要放到接收项的下面，所以 index + 1
    }
    flattenTree.forEach((node) => {
      // 完善拖拽项父节点的数据
      if (node[this.idKey] === this.dragItem.pid) {
        node.childLen -= 1; // 根据子节点个数，判断是否有展开收起图标
        if (!node.childLen) {
          node.expand = false;
        }
      }
      if (this.dropPosition === "inner") {
        // 完善接收项的数据
        if (node[this.idKey] === item[this.idKey]) {
          node.childLen += 1; // 根据子节点个数，判断是否有展开收起图标
          node.expand = true;
        }
        if (node.pid === item[this.idKey]) {
          node.visible = true; // 子节点要展示
        }
      } else if (this.dragLevel !== item.level) {
        // 完善接收项父节点数据
        if (node[this.idKey] === item.pid) {
          node.childLen += 1; // 根据子节点个数，判断是否有展开收起图标
        }
      }
    });
    // 拖拽完毕清空接收项数据，消除标线
    this.dropClearData();
    this.setlistToTree(flattenTree);
  }
  private getTreeNode(id: number | string) {
    const flattenTree = cloneDeep(this.flattenTree);
    const index = flattenTree.findIndex((node) => node[this.idKey] === id);
    return flattenTree[index];
  }
  private addTreeNode(item: ITreeNode) {
    this.addNode(item, (addNode: ITreeNode) => {
      const flattenTree = cloneDeep(this.flattenTree);
      const index = flattenTree.findIndex(
        (node) => node[this.idKey] === item[this.idKey]
      );
      const descendants = findDescendants(flattenTree, item, this.idKey);
      const node: ITreeNode = {
        ...addNode,
        childLen: 0,
        level: item.level + 1,
        visible: true,
        expand: false,
        pid: item[this.idKey],
      };
      flattenTree.splice(index + descendants.length + 1, 0, node);
      flattenTree.forEach((item) => {
        item.active = false;
        if (item[this.idKey] === node[this.idKey]) {
          item.active = true;
        }
        // 父元素展开
        if (item[this.idKey] === node.pid) {
          item.childLen += 1;
          item.expand = true;
        }
        // 子元素显示
        if (item.pid === node.pid) {
          item.visible = true;
        }
      });
      this.$emit("node-click", node);
      this.setlistToTree(flattenTree);
    });
  }
  private deleteTreeNode() {
    const flattenTree = cloneDeep(this.flattenTree);
    const item = flattenTree.filter((item) => item.active)[0];
    if (!item) {
      return;
    }
    let index = 0;
    flattenTree.forEach((node, i) => {
      i === 0 && (node.active = true); // 根节点选中
      if (node[this.idKey] === item.pid) {
        node.childLen -= 1; // 找出父节点 childLen - 1
      }
      if (node[this.idKey] === item[this.idKey]) {
        index = i;
      }
    });
    const itemDescendants = findDescendants(flattenTree, item, this.idKey); // 获取删除项的子孙
    flattenTree.splice(index, 1);
    itemDescendants.forEach((descendants) => {
      const index = flattenTree.findIndex(
        (node) => node[this.idKey] === descendants[this.idKey]
      );
      flattenTree.splice(index, 1); // 删除其子孙节点
    });
    this.setlistToTree(flattenTree);
    return [
      item[this.idKey],
      ...itemDescendants.map((item) => item[this.idKey]),
    ];
  }
  private updateTreeNode(data: any) {
    if (!data || !Object.keys(data).length) {
      return;
    }
    const flattenTree = cloneDeep(this.flattenTree);
    flattenTree.forEach((node, i) => {
      if (node.active) {
        flattenTree[i] = {
          ...node,
          ...data,
        };
      }
    });
    this.setlistToTree(flattenTree);
  }
  private getAsyncData(data: ITreeNode[]) {
    const flattenTree = cloneDeep(this.flattenTree);
    let index = 0;
    flattenTree.forEach((node, i) => {
      if (this.asyncItem[this.idKey] === node[this.idKey]) {
        node.loading = false;
        // 为了判断加载完之后，是否展示展开收起按钮
        node.hasAsyncChildren = data.length ? 1 : 0;
        index = i;
      }
    });
    data &&
      data.length &&
      data.forEach((item: ITreeNode) => {
        item.level = this.asyncItem.level + 1;
        item.childLen = 0;
        item.visible = true;
        item.expand = false;
        item.pid = this.asyncItem[this.idKey];
        delete item[this.childrenKey];
      });
    flattenTree[index].childLen += data.length;
    flattenTree[index].expand = true;
    flattenTree.splice(index + 1, 0, ...data);
    this.setlistToTree(flattenTree);
    this.showCheckbox && this.toggleChecked(flattenTree[index]);
  }
  private toggleChecked(item: ITreeNode) {
    const flattenTree = cloneDeep(this.flattenTree);
    // 获取选择项的子孙
    const itemDescendants = findDescendants(flattenTree, item, this.idKey).map(
      (item) => item[this.idKey]
    );
    flattenTree.forEach((node) => {
      if (
        itemDescendants.includes(node[this.idKey]) ||
        node[this.idKey] === item[this.idKey]
      ) {
        node.checked = item.checked || false;
        node.indeterminate = false;
      }
    });
    // 获取选择项的父辈
    const itemElders = findElders(flattenTree, item, this.idKey);
    let i: number;
    for (i = 0; i < itemElders.length; i++) {
      // 获取每个父辈的子孙节点
      const nodeDescendants = findDescendants(
        flattenTree,
        itemElders[i],
        this.idKey
      );
      const nodeAllChecked = nodeDescendants.every((node) => node.checked);
      const nodeAllNotChecked = nodeDescendants.every((node) => !node.checked);
      itemElders[i].checked = nodeAllChecked;
      itemElders[i].indeterminate =
        nodeAllChecked || nodeAllNotChecked ? false : true;
      // 判断某个父辈节点已经是半选状态了，那么这个节点父辈一定是半选，所以终止循环
      if (itemElders[i].indeterminate) {
        break;
      }
    }
    // 如果都是全选，不会走此逻辑
    if (i < itemElders.length) {
      // 把半选状态的最小父辈的父辈们状态置为半选
      itemElders.forEach((node, index) => {
        if (index > i) {
          node.checked = false;
          node.indeterminate = true;
        }
      });
    }
    this.setlistToTree(flattenTree);
    this.$emit(
      "checked-change",
      item,
      item.checked || false,
      item.indeterminate || false
    );
  }
}
</script>

<style scoped lang="scss">
.tree {
  position: relative;
  width: 100%;
  overflow: auto;
  .tree_content {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    min-height: 100px;
  }
}
</style>
