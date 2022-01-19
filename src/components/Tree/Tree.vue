<template>
  <div
    class="tree"
    ref="scroller"
    :style="{ height: option.height }"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${allVisibleHeight}px` }">
      <div :style="{ transform: `translateY(${offset}px)` }">
        <tree-node
          v-for="item in visibleData"
          :key="item[_props_.id]"
          :item="item"
          :props="_props_"
          :option="option"
          :draggable="draggable"
          :checkable="!draggable && checkable"
          :load-data="!draggable && loadData"
          :node-class="nodeClass"
          :treeDisabled="treeDisabled"
          @node-click="handleClick"
          @drag-start="dragStart"
          @drag-over="dragOver"
          @drop="drop"
          @toggle-expand="toggleExpand"
          @toggle-checked="toggleChecked"
        >
          <!-- 默认插槽 -->
          <template #default="slotProps">
            <slot v-bind:treeNode="slotProps.treeNode"></slot>
          </template>
        </tree-node>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch, Prop } from "vue-property-decorator";
import TreeNode from "./TreeNode.vue";
import { isEqual, throttle, uniqBy } from "lodash";
import { flatten, findDescendants, findElders, listToTree } from "./utils";
import ResizeObserver from "resize-observer-polyfill";

const getDefaultItem = () => {
  return {
    $origin_data: {},
    level: 0,
    expand: false,
    visible: false,
    pid: null,
    childLen: 0,
  };
};

@Component({
  components: {
    TreeNode,
  },
})
export default class Tree extends Vue {
  @Prop({
    type: Array,
    required: true,
  })
  public tree!: any[];
  @Prop({
    type: Object,
    required: true,
  })
  public option!: IOption;
  @Prop({
    type: Object,
    default() {
      return {};
    },
  })
  public props!: IProps;
  @Prop(Boolean)
  public draggable!: boolean; // 拖拽
  @Prop([Function, Boolean])
  public loadData!: (
    item: ITreeNode,
    getAsyncData: Function,
    flatData: ITreeNode[]
  ) => void | boolean; // 异步加载
  @Prop(Boolean)
  public checkable!: boolean; // 是否展示选择框
  @Prop(Boolean)
  public defaultExpandAll!: boolean; // 初始化是否展开全部节点
  @Prop(String)
  public defaultActiveKey!: string; // 初始化默认选中哪个节点
  @Prop(Array)
  public expandKeys!: string[]; // 展开项，受控属性
  @Prop(Array)
  public checkedKeys!: string[]; // 选择项，受控属性
  @Prop(Boolean)
  public checkStrictly!: boolean; // 勾选节点复选框是否完全受控（true 时父子节点选中状态不再关联）
  @Prop([String, Function])
  public nodeClass!: (item: ITreeNode) => string | string; // 节点的 class
  @Prop(Boolean)
  public treeDisabled!: boolean; // 是否整棵树禁用

  public offset = 0; // translateY偏移量
  public allVisibleHeight = 0; // 树的展示数据的总高度
  public flatData: ITreeNode[] = [];
  public visibleData: ITreeNode[] = [];
  public dragItem: ITreeNode = getDefaultItem(); // 拖拽项
  public dragIndex = 0; // 拖拽项索引
  public dragLevel = 0; // 拖拽项 level
  public dragItemDescendants: ITreeNode[] = []; // 拖拽项子孙
  public dragItemPrevId = ""; // 拖拽项上一项（visibleData） id
  public dragItemNextId = ""; // 拖拽项下一项（visibleData） id
  public dropItemId = ""; // 接收项 id
  public dropPosition = ""; // 接收项标线位置
  public asyncItem: ITreeNode = getDefaultItem(); // 异步加载项
  public handleScroll = throttle(() => {
    this.updateVisibleData((this.$refs.scroller as HTMLElement).scrollTop);
  }, 50);
  public scrollTop = 0;
  // 是否手动更新勾选和展开，手动更新不重新渲染，外部更新重新渲染
  public isToggleChecked = false;
  public isToggleExpand = false;

  get _props_() {
    const props = {
      title: "title",
      children: "children",
      id: "id",
      checkable: "checkable",
      checked: "checked",
      indeterminate: "indeterminate",
      disableCheckbox: "disableCheckbox",
      disableCheckboxHoverText: "disableCheckboxHoverText",
    };
    return { ...props, ...this.props };
  }

  @Watch("tree", { immediate: true })
  public onTreeChange(val: any[], oldVal: any[]) {
    if (!isEqual(val, oldVal)) {
      const { id } = this._props_;
      this.flatData = uniqBy(
        flatten(val, 1, null, {
          props: this._props_,
          defaultExpandAll: this.defaultExpandAll || false,
          defaultActiveKey: this.defaultActiveKey || "",
          expandKeys: this.expandKeys || [],
          checkedKeys: this.checkedKeys || [],
        }),
        id
      );
      if (this.defaultExpandAll) {
        this.updateExpandSyncKeys();
      }
    }
  }
  @Watch("checkedKeys")
  public watchCheckedKeys(val: string[]) {
    // 外部更新 checkedKeys
    if (!this.isToggleChecked) {
      this.flatData = flatten(this.tree, 1, null, {
        props: this._props_,
        defaultExpandAll: false,
        defaultActiveKey: val[val.length - 1] || this.defaultActiveKey || "",
        expandKeys: this.expandKeys || [],
        checkedKeys: val,
      });
    }
    this.isToggleChecked = false;
  }
  @Watch("expandKeys")
  public watchExpandKeys(val: string[]) {
    // 外部更新 checkedKeys
    if (!this.isToggleExpand) {
      this.flatData = flatten(this.tree, 1, null, {
        props: this._props_,
        defaultExpandAll: false,
        defaultActiveKey: val[val.length - 1] || this.defaultActiveKey || "",
        expandKeys: val,
        checkedKeys: this.checkedKeys || [],
      });
    }
    this.isToggleExpand = false;
  }
  @Watch("flatData")
  public onFlatDataChange(val: ITreeNode[]) {
    this.updateVisibleData((this.$refs.scroller as HTMLElement).scrollTop, val); // 重新渲染可视化数据
  }
  @Watch("dropPosition")
  public watchDropPosition(val: string) {
    const { visibleData } = this;
    const { id } = this._props_;
    visibleData.forEach((node, i) => {
      if (node[id] === this.dropItemId) {
        this.$set(visibleData, i, { ...visibleData[i], dropPosition: val });
      }
      // 拖拽项上一项不展示下标线，拖拽项下一项不展示上标线，拖拽到根节点不展示标线
      if (
        (node[id] === this.dragItemPrevId && val === "next") ||
        (node[id] === this.dragItemNextId && val === "prev") ||
        node[id] === this.flatData[0][this._props_.id]
      ) {
        this.$set(visibleData, i, { ...visibleData[i], dropPosition: "" });
      }
    });
  }
  @Watch("dropItemId")
  public watchDropItemId(val: string) {
    const { visibleData } = this;
    const { id } = this._props_;
    visibleData.forEach((node, i) => {
      if (node[id] !== val) {
        this.$set(visibleData, i, { ...visibleData[i], dropPosition: "" });
      }
    });
  }

  public mounted() {
    // 确保容器高度加载完毕
    this.$nextTick(() => {
      this.handleScroll();
      // 监听树容器高度元素
      const element = this.$refs.scroller as HTMLElement;
      if (element) {
        const observer = new ResizeObserver(() => {
          this.updateVisibleData(this.scrollTop);
        });
        observer.observe(element);
      }
    });
  }
  // keep-alive 生命周期
  public activated() {
    // 使用之前记录的 this.scrollTop 重新渲染可视化数据
    this.updateVisibleData(this.scrollTop, this.flatData);
  }
  public updateVisibleData(scrollTop = 0, flatData = this.flatData) {
    if (!this.$refs.scroller) return;
    const offsetHeight = (this.$refs.scroller as HTMLElement).offsetHeight;
    const visibleCount = Math.floor(offsetHeight / this.option.itemHeight);
    let start =
      Math.floor(scrollTop / this.option.itemHeight) -
      Math.floor(visibleCount / 2);
    start = start < 0 ? 0 : start;
    const end = start + visibleCount * 2;
    const allVisibleData = flatData.filter((item) => item.visible);
    this.allVisibleHeight = this.option.itemHeight * allVisibleData.length;
    this.visibleData = allVisibleData.slice(start, end);
    this.offset = start * this.option.itemHeight;
    // 记录滚动的高度，keep-alive 时重新展示树时，定位到之前的位置
    this.scrollTop = scrollTop;
    this.$nextTick(() => {
      (this.$refs.scroller as HTMLElement).scrollTop = scrollTop;
    });
  }
  public toggleExpand(item: ITreeNode) {
    const isExpand = item.expand;
    if (isExpand) {
      this.collapse(item); // 折叠
    } else {
      this.expand(item); // 展开
    }
  }
  public expand(item: ITreeNode) {
    const { id } = this._props_;
    const { flatData } = this;
    const index = flatData.findIndex((node) => node[id] === item[id]);
    // 异步加载
    if (this.loadData && !item.childLen) {
      this.$set(flatData, index, { ...flatData[index], loading: true });
      this.asyncItem = item;
      this.loadData(item, this.getAsyncData, this.flatData);
    } else {
      // 找出子孙节点
      const expandKeyMap: { [key: string]: ITreeNode } = {};
      for (let i = 0; i < flatData.length; i++) {
        if (item[id] === flatData[i][id]) {
          this.$set(flatData, i, { ...flatData[i], expand: true });
        }
        if (i > index) {
          // 等级比自身相等或者变小了，说明已经找到全部子孙节点
          if (flatData[i].level <= item.level) {
            break;
          }
          // 子节点显示
          if (item[id] === flatData[i].pid) {
            this.$set(flatData, i, {
              ...flatData[i],
              visible: true,
            });
          }
          // 如果当前节点为展开状态，且父节点是显示和展开状态，记录当前节点内容
          if (flatData[i].expand) {
            const parentNode = flatData.find(
              (item) => item[id] === flatData[i].pid
            );
            if (parentNode && parentNode.visible && parentNode.expand) {
              expandKeyMap[flatData[i][id]] = flatData[i];
            }
          }
          // 被记录的节点的子节点要展示
          if (expandKeyMap[flatData[i].pid!]) {
            this.$set(flatData, i, {
              ...flatData[i],
              visible: true,
            });
          }
        }
      }
      this.updateExpandSyncKeys();
    }
  }
  public collapse(item: ITreeNode) {
    const { id } = this._props_;
    const { flatData } = this;
    const index = flatData.findIndex((node) => node[id] === item[id]);
    // 找出子孙节点
    for (let i = 0; i < flatData.length; i++) {
      if (item[id] === flatData[i][id]) {
        this.$set(flatData, i, { ...flatData[i], expand: false });
      }
      if (i > index) {
        // 等级比自身相等或者变小了，说明已经找到全部子孙节点
        if (flatData[i].level <= item.level) {
          break;
        }
        if (flatData[i].visible) {
          this.$set(flatData, i, {
            ...flatData[i],
            visible: false,
          });
        }
      }
    }
    this.updateExpandSyncKeys();
  }
  public handleClick(item: ITreeNode, e: Event) {
    const { id } = this._props_;
    const { flatData } = this;
    flatData.forEach((node, i) => {
      node.active = false;
      if (node[id] === item[id]) {
        this.$set(flatData, i, { ...flatData[i], active: true });
        this.$emit("node-click", flatData[i], e);
      }
    });
  }
  public dropClearData() {
    this.dragItem = getDefaultItem();
    this.dragIndex = 0;
    this.dragLevel = 0;
    this.dragItemDescendants = [];
    this.dragItemPrevId = "";
    this.dragItemNextId = "";
    this.dropItemId = "";
    this.dropPosition = "";
  }
  public dragStart(item: ITreeNode) {
    const { id } = this._props_;
    this.dragItem = item;
    // 遍历找出被拖拽节点的全部子孙节点
    this.dragItemDescendants = findDescendants(
      this.flatData,
      item,
      this._props_
    );
    // 所在位置
    this.dragIndex = this.flatData.findIndex((node) => node[id] === item[id]);
    this.dragLevel = item.level; // 拖拽节点等级
    const dragVisibleIndex = this.visibleData.findIndex(
      (node) => node[id] === item[id]
    );
    for (let i = 0; i < this.visibleData.length; i++) {
      if (this.visibleData[i].level === item.level) {
        if (i < dragVisibleIndex) {
          // 获取同级拖拽项的上一项，不展示下标线
          this.dragItemPrevId = this.visibleData[i][id];
        }
        if (i > dragVisibleIndex) {
          // 获取同级拖拽项的下一项，不展示上标线
          this.dragItemNextId = this.visibleData[i][id];
          break;
        }
      }
    }
  }
  public dragOver(item: ITreeNode, e: DragEvent) {
    const { id } = this._props_;
    e.preventDefault(); // 禁用 dragOver 的默认事件才能触发 drop
    this.dropPosition = ""; // 清空标线（拖回自身的时候）
    if (this.dragItem[id] !== item[id]) {
      const { pageY } = e;
      const { itemHeight } = this.option;
      // 不能使用 e.target
      const { top } = (e.currentTarget as any).getBoundingClientRect();
      this.dropItemId = item[id];
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
  public drop(item: ITreeNode) {
    const { id } = this._props_;
    const { flatData } = this;
    const dragItem = { ...this.dragItem };
    if (
      !this.dropPosition ||
      // 自己拖自己
      dragItem[id] === item[id] ||
      // 父拖到子孙
      this.dragItemDescendants.map((item) => item[id]).includes(item[id]) ||
      // 仅有一个根节点，不允许往根节点拖拽
      (flatData.filter((item) => item.level === 1).length === 1 &&
        item.level === 1)
    ) {
      // 拖拽完毕清空接收项数据，消除标线
      this.dropClearData();
      return;
    }
    flatData.splice(this.dragIndex, 1 + this.dragItemDescendants.length); // 删除拖拽项及其子孙
    // 获取接收项在 flatData 里的索引
    const index = flatData.findIndex((node) => node[id] === item[id]);
    const itemDescendants = findDescendants(flatData, item, this._props_); // 获取接收项的子孙
    if (this.dropPosition === "inner") {
      // 拖拽项变为接收项子节点
      dragItem.pid = item[id];
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
    flatData.splice(spliceIndex, 0, dragItem);
    // 如果存在拖拽项子孙
    if (this.dragItemDescendants.length) {
      this.dragItemDescendants.forEach((item) => {
        const levelDiff = item.level - this.dragLevel; // 计算子节点 level 和父节点原始 level 差值
        item.level = dragItem.level + levelDiff; // 子节点现在的 level 就等于父节点现在的 level + levelDiff
      });
      // 获取接收项在 flatData 里的索引，此时的接收项是原拖拽项
      const index = flatData.findIndex(
        (node) => node[id] === this.dragItem[id]
      );
      flatData.splice(index + 1, 0, ...this.dragItemDescendants); // 需要放到接收项的下面，所以 index + 1
    }
    flatData.forEach((node, i) => {
      // 完善拖拽项父节点和接收项父节点的数据
      if (node[id] === this.dragItem.pid || node[id] === item.pid) {
        const childLen = flatData.filter(
          (item) => item.pid === node[id]
        ).length;
        this.$set(flatData, i, {
          ...flatData[i],
          childLen,
          expand: !!childLen,
        });
      }
      if (this.dropPosition === "inner") {
        // 完善接收项的数据
        if (node[id] === item[id]) {
          // 根据子节点个数，判断是否有展开收起图标
          this.$set(flatData, i, {
            ...flatData[i],
            childLen: node.childLen + 1,
            expand: true,
          });
        }
        if (node.pid === item[id]) {
          // 子节点要展示
          this.$set(flatData, i, { ...flatData[i], visible: true });
        }
      }
    });
    // 拖拽完毕清空接收项数据，消除标线
    this.dropClearData();
    this.$emit("drop", item, dragItem, this.flatData);
  }
  public getAsyncData(data: ITreeNode[]) {
    const {
      title,
      id,
      checkable,
      checked,
      indeterminate,
      disableCheckbox,
      disableCheckboxHoverText,
    } = this._props_;
    const { flatData } = this;
    let index = 0;
    flatData.forEach((node, i) => {
      if (this.asyncItem[id] === node[id]) {
        // 为了判断加载完之后，是否展示展开收起按钮
        this.$set(flatData, i, {
          ...flatData[i],
          loading: false,
          hasAsyncChildren: data.length ? 1 : 0,
        });
        index = i;
      }
    });
    const arr: ITreeNode[] = [];
    data &&
      data.length &&
      data.forEach((item: ITreeNode) => {
        const itemDisableCheckbox =
          disableCheckbox in item ? item[disableCheckbox] : false;
        const newItem: ITreeNode = {
          $origin_data: item,
          [title]: title in item ? item[title] : "",
          [id]: id in item ? item[id] : "",
          [checkable]: checkable in item ? item[checkable] : true,
          // 继承父节点勾选状态
          [checked]: itemDisableCheckbox ? false : this.asyncItem[checked],
          [indeterminate]: false,
          [disableCheckbox]: itemDisableCheckbox,
          [disableCheckboxHoverText]:
            disableCheckboxHoverText in item
              ? item[disableCheckboxHoverText]
              : "",
          level: this.asyncItem.level + 1,
          expand: false,
          visible: true,
          pid: this.asyncItem[id],
          childLen: 0,
        };
        arr.push(newItem);
      });
    this.$set(flatData, index, {
      ...flatData[index],
      childLen: data.length,
      expand: !!data.length,
    });
    flatData.splice(index + 1, 0, ...arr);
    this.updateExpandSyncKeys();
  }
  public treeNodeCheckedHandler(item: ITreeNode) {
    const { id, checked, indeterminate, disableCheckbox } = this._props_;
    const { flatData } = this;
    const itemIndex = flatData.findIndex((node) => node[id] === item[id]);
    // 父子节点选中状态不再关联
    if (this.checkStrictly) {
      this.$set(flatData, itemIndex, {
        ...flatData[itemIndex],
        [checked]: item[checked],
      });
      return;
    }
    // 获取选择项的父辈
    const itemElders = findElders(flatData, item, itemIndex, this._props_).map(
      (node) => node[id]
    );
    // 获取选择项子孙
    for (let i = 0; i < flatData.length; i++) {
      if (i > itemIndex) {
        // 等级比自身相等或者变小了，说明已经找到全部子孙节点
        if (flatData[i].level <= item.level) {
          break;
        }
        if (
          (item[checked] && !flatData[i][disableCheckbox]) ||
          !item[checked]
        ) {
          this.$set(flatData, i, {
            ...flatData[i],
            [checked]: item[checked],
            [indeterminate]: false,
          });
        }
      }
    }
    this.$set(flatData, itemIndex, {
      ...flatData[itemIndex],
      [checked]: item[checked],
      [indeterminate]: false,
    });
    // 处理父辈节点数据
    this.eldersNodeCheckedHandler(itemElders);
  }
  public eldersNodeCheckedHandler(itemElders: string[]) {
    const { id, checked, indeterminate, disableCheckbox } = this._props_;
    const { flatData } = this;
    let index: number;
    for (index = 0; index < itemElders.length; index++) {
      // 获取每个父辈的子节点
      const nodeChildren: ITreeNode[] = [];
      // 找到父节点在 flatData 中的位置
      let parentIndex = 0;
      flatData.forEach((node, i) => {
        if (node.pid === itemElders[index]) {
          nodeChildren.push(node);
        }
        if (node[id] === itemElders[index]) {
          parentIndex = i;
        }
      });
      const nodeAllChecked = nodeChildren.every(
        (node: ITreeNode) => node[checked] || node[disableCheckbox]
      );
      const nodeAllNotChecked = nodeChildren.every(
        (node: ITreeNode) => !node[checked] && !node[indeterminate]
      );
      const isIndeterminate =
        nodeAllChecked || nodeAllNotChecked ? false : true;
      this.$set(flatData, parentIndex, {
        ...flatData[parentIndex],
        [checked]: nodeAllChecked,
        [indeterminate]: isIndeterminate,
      });
      // 判断某个父辈节点已经是半选状态了，那么这个节点父辈一定是半选，所以终止循环
      if (isIndeterminate) {
        break;
      }
    }
    // 如果都是全选，不会走此逻辑
    if (index < itemElders.length) {
      // 把半选状态的最小父辈的父辈们状态置为半选
      for (let i = index + 1; i < itemElders.length; i++) {
        // 找到父节点在 flatData 中的位置
        const parentIndex = flatData.findIndex(
          (item) => item[id] === itemElders[i]
        );
        this.$set(flatData, parentIndex, {
          ...flatData[parentIndex],
          [checked]: false,
          [indeterminate]: true,
        });
      }
    }
  }
  public toggleChecked(item: ITreeNode) {
    this.treeNodeCheckedHandler(item);
    this.$emit("toggle-checked", item);
    this.updateCheckedSyncKeys();
  }
  public updateExpandSyncKeys() {
    const { id } = this._props_;
    const expandKeys: string[] = [];
    this.flatData.forEach((node) => {
      if (node.expand && node.visible) {
        expandKeys.push(node[id]);
      }
    });
    this.$emit("update:expandKeys", expandKeys);
    this.isToggleExpand = true;
  }
  public updateCheckedSyncKeys() {
    const { id, checked } = this._props_;
    const checkedKeys: string[] = [];
    this.flatData.forEach((node) => {
      if (node[checked]) {
        checkedKeys.push(node[id]);
      }
    });
    this.$emit("update:checkedKeys", checkedKeys);
    this.isToggleChecked = true;
  }

  // 以下是对外暴露的 API 方法
  // 获取当前节点
  public getTreeNode(id: string) {
    return this.flatData.find((node) => node[this._props_.id] === id);
  }
  // 获取子孙
  public getDescendants(item: ITreeNode) {
    return findDescendants(this.flatData, item, this._props_);
  }
  // 获取父辈
  public getElders(item: ITreeNode) {
    const { id } = this._props_;
    const index = this.flatData.findIndex((node) => node[id] === item[id]);
    return findElders(this.flatData, item, index, this._props_);
  }
  // 获取树的已选择节点
  public getCheckedTreeNode() {
    return this.flatData.filter((node) => node[this._props_.checked]);
  }
  // 获取树的半选节点
  public getIndeterminateTreeNode() {
    return this.flatData.filter((node) => node.indeterminate);
  }
  // 获取树的已展开节点
  public getExpandTreeNode() {
    return this.flatData.filter((node) => node.expand);
  }
  // 拍平数据转换为树结构
  public getTreeData() {
    return listToTree(this.flatData, this._props_);
  }
  // 增加树节点
  public addTreeNode(parentNode: ITreeNode, childNode: any) {
    const {
      title,
      id,
      checkable,
      checked,
      indeterminate,
      disableCheckbox,
      disableCheckboxHoverText,
    } = this._props_;
    const { flatData } = this;
    const index = flatData.findIndex((node) => node[id] === parentNode[id]);
    const item: ITreeNode = {
      ...parentNode,
      ...childNode,
      $origin_data: childNode,
      [title]: childNode[title] || "未命名",
      [id]: childNode[id] || "",
      [checkable]: parentNode[checkable] || true,
      [checked]: parentNode[checked] || false,
      [indeterminate]: false,
      [disableCheckbox]: parentNode[disableCheckbox] || false,
      [disableCheckboxHoverText]: parentNode[disableCheckboxHoverText] || "",
      childLen: 0,
      level: parentNode.level + 1,
      visible: true,
      expand: false,
      pid: parentNode[id],
      active: true,
    };
    let length = 0;
    for (let i = 0; i < flatData.length; i++) {
      if (flatData[i][id] === item.pid) {
        this.$set(flatData, i, {
          ...flatData[i],
          childLen: flatData[i].childLen + 1,
          expand: true,
        });
      }
      if (flatData[i].active) {
        this.$set(flatData, i, {
          ...flatData[i],
          active: false,
        });
      }
      if (i > index) {
        // 等级比自身相等或者变小了，说明已经找到全部子孙节点
        if (flatData[i].level <= parentNode.level) {
          break;
        }
        length += 1;
        // 子节点显示
        if (flatData[index][id] === flatData[i].pid) {
          this.$set(flatData, i, {
            ...flatData[i],
            visible: true,
          });
        }
      }
    }
    flatData.splice(index + length + 1, 0, item);
  }
  // 更新 active 树节点
  public updateActiveTreeNode(item: object) {
    const { flatData } = this;
    flatData.forEach((node, i) => {
      if (node.active) {
        this.$set(flatData, i, { ...flatData[i], ...item });
      }
    });
  }
  // 删除 active 树节点
  public deleteTreeNode() {
    const { id } = this._props_;
    const { flatData } = this;
    const item = flatData.find((item) => item.active);
    if (!item) {
      return;
    }
    const itemIndex = flatData.findIndex((node) => node[id] === item[id]);
    const itemDescendants = []; // 获取删除项的子孙
    for (let i = 0; i < flatData.length; i++) {
      if (i < itemIndex) {
        if (item.pid === flatData[i][id]) {
          // 找出父节点 childLen - 1
          this.$set(flatData, i, {
            ...flatData[i],
            childLen: flatData[i].childLen - 1,
          });
          if (flatData[i].childLen === 0) {
            this.$set(flatData, i, { ...flatData[i], expand: false });
          }
        }
      }
      if (i > itemIndex) {
        // 等级比自身相等或者变小了，说明已经找到全部子孙节点
        if (flatData[i].level <= item.level) {
          break;
        }
        itemDescendants.push(flatData[i]);
      }
    }
    flatData.splice(itemIndex, 1 + itemDescendants.length);
    flatData[0] && this.$set(flatData, 0, { ...flatData[0], active: true }); // 根节点选中
    // 返回删除的节点 id
    return [item[id], ...itemDescendants.map((item) => item[id])];
  }
  // 更新树节点
  public updateTreeNode(id: string, data: object) {
    const { flatData } = this;
    const index = flatData.findIndex((item) => item[this._props_.id] === id);
    this.$set(flatData, index, { ...flatData[index], ...data });
  }
}
</script>

<style scoped lang="scss">
.tree {
  width: 100%;
  min-width: 270px;
  overflow: auto;
}
</style>
