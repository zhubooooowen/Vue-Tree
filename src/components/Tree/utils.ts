import { cloneDeep } from "lodash";

interface IOption {
  props: IProps;
  expandKeys: string[];
  checkedKeys: string[];
  defaultExpandAll: boolean;
  defaultActiveKey: string;
}

const getParentStatus = (children: ITreeNode[], option: IOption) => {
  const {
    props: { id, checked },
    expandKeys,
  } = option;
  let checkedLen = 0;
  let expandLen = 0;
  for (let i = 0; i < children.length; i++) {
    const item = children[i];
    if (item[checked]) checkedLen++;
    if (expandKeys.includes(item[id]) || item.expand || item.visible)
      expandLen++;
  }
  const everyChecked = checkedLen === children.length;
  const someChecked = checkedLen <= children.length && checkedLen > 0;
  // 没有全部选择，或者全部是半选，父节点为半选
  const indeterminate = someChecked && !everyChecked;
  return { checked: everyChecked, indeterminate, expand: expandLen > 0 };
};

/**
 * 树结构拍平
 * @param {array} data 树的数据
 * @param {number} level 树拍平之后的等级划分
 * @param {number} pid 父节点id
 * @param {object} option 树格式配置
 * @param {boolean} parentChecked 可选 父节点选择
 * @param {boolean} parentExpand 可选 父节点展开
 * @returns
 */
export const flatten = (
  data: any[],
  level = 1,
  pid: string | null,
  option: IOption,
  parentChecked?: boolean,
  parentExpand?: boolean
) => {
  const arr: ITreeNode[] = [];
  const {
    props: {
      title,
      children,
      id,
      checkable,
      checked,
      indeterminate,
      disableCheckbox,
      disableCheckboxHoverText,
    },
    defaultActiveKey,
    defaultExpandAll,
    expandKeys,
    checkedKeys,
  } = option;
  data.forEach((item: any) => {
    // 父节点勾选，子节点一定勾选
    // checkedKeys 包含该节点，节点勾选
    let itemChecked =
      parentChecked || checkedKeys.includes(item[id])
        ? true
        : checked in item
        ? item[checked]
        : false;
    const childLen = item[children] ? item[children].length : 0;
    // expandKeys 包含该节点，且该节点有子节点，节点展开
    let itemExpand =
      childLen && (defaultExpandAll || expandKeys.includes(item[id]));
    // 如果节点禁用，则不勾选，不展开
    if (item[disableCheckbox]) {
      itemChecked = false;
      itemExpand = false;
    }
    const newItem: ITreeNode = {
      // 对原数据的地址引用，外部可直接更改源数据
      $origin_data: item,
      [title]: title in item ? item[title] : "",
      [id]: id in item ? item[id] : "",
      [checkable]: checkable in item ? item[checkable] : true,
      [checked]: itemChecked,
      // 默认展示勾选框
      [indeterminate]: false,
      [disableCheckbox]:
        disableCheckbox in item ? item[disableCheckbox] : false,
      [disableCheckboxHoverText]:
        disableCheckboxHoverText in item ? item[disableCheckboxHoverText] : "",
      level,
      expand: itemExpand,
      // 父节点展开，则子节点展示
      // 自身节点展开，则自己展示
      visible:
        level === 1 ||
        defaultExpandAll ||
        expandKeys.includes(item[id]) ||
        !!parentExpand,
      pid,
      childLen,
      active: item[id] === defaultActiveKey,
    };
    if (item[children] && item[children].length) {
      const newItemChildren = flatten(
        item[children],
        level + 1,
        item[id],
        option,
        itemChecked,
        itemExpand
      );
      // 通过子节点的状态，判断父节点的勾选和展开状态
      const parentStatus = getParentStatus(newItemChildren, option);
      arr.push({
        ...newItem,
        [checked]: parentStatus.checked,
        [indeterminate]: parentStatus.indeterminate,
        expand: parentStatus.expand,
      });
      // 通过父节点的展开状态，判断子节点是否展示
      newItemChildren.forEach((item) => {
        if (item.pid === newItem[id]) {
          item.visible = parentStatus.expand;
        }
      });
      arr.push(...newItemChildren);
    } else {
      arr.push(newItem);
    }
  });
  return arr;
};

// 生成唯一id
export function createUUID() {
  const s: string[] = [];
  const hexDigits = "0123456789abcdef";
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] as string & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = "-";

  const uuid: string = s.join("");
  return uuid;
}

/**
 * 找出数据的子孙节点
 * @param {object} data
 * @param {object} item
 * @param {object} props
 * @returns
 */
export const findDescendants = (
  data: ITreeNode[],
  item: ITreeNode,
  props: IProps
) => {
  const { id } = props;
  const arr = [];
  const index = data.findIndex((node) => node[id] === item[id]);
  for (let i = 0; i < data.length; i++) {
    if (i > index) {
      // 等级比自身相等或者变小了，说明已经找到全部子孙节点
      if (data[i].level <= item.level) {
        break;
      }
      arr.push(data[i]);
    }
  }
  return arr;
};

/**
 * 找出数据的长辈节点
 * @param {object} data
 * @param {object} item
 * @param {object} props
 * @returns
 */
export const findElders = (
  data: ITreeNode[],
  item: ITreeNode,
  itemIndex: number,
  props: IProps
) => {
  const { id } = props;
  const sliceData = data.slice(0, itemIndex);
  const itemElders: ITreeNode[] = [];
  const getElders = (item: ITreeNode) => {
    if (!item.pid) return;
    sliceData.forEach((node) => {
      if (node[id] === item.pid) {
        itemElders.push(node);
        getElders(node);
      }
    });
  };
  getElders(item);
  return itemElders;
};

// 需要删除的属性
const deleteAttrKey = [
  "pid",
  "level",
  "expand",
  "visible",
  "active",
  "childLen",
  "loading",
  "hasAsyncChildren",
];

/**
 *
 * @param {*array} list
 * @param {object} props
 * @returns
 */
export const listToTree = (list: ITreeNode[], props: IProps) => {
  const { children, id } = props;
  const arr = cloneDeep(list);
  const map: { [key: string]: ITreeNode } = {};
  const tree: any = [];
  arr.forEach((item) => {
    map[item[id]] = item;
    item[children] = [];
  });
  arr.forEach((item) => {
    const parent = item.pid !== null ? map[item.pid] : null;
    deleteAttrKey.forEach((attr) => {
      delete item[attr];
    });
    if (parent) {
      parent[children].push(item);
    } else {
      tree.push(item);
    }
  });
  return tree;
};
