import { cloneDeep } from "lodash";

interface IOption {
  props: IProps;
  extProps?: string[];
  defaultExpandAll?: boolean;
  defaultActiveKey?: string;
}

const defaultDataHandler = (item: any, option: IOption) => {
  const {
    props: { id },
    defaultExpandAll,
    defaultActiveKey,
  } = option;
  if (defaultExpandAll) {
    if (item.childLen) {
      item.expand = true;
    }
    item.visible = true;
  }
  if (defaultActiveKey) {
    if (item[id] === defaultActiveKey) {
      item.active = true;
    }
  }
};

/**
 * 树结构拍平
 * @param {array} list 树的数据
 * @param {object} option 树格式配置
 * @param {number} level 树拍平之后的等级划分
 * @param {number} pid 父节点id
 * @returns
 */
export const flatten = (
  data: any[],
  level = 1,
  pid: string | null,
  option: IOption
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
    extProps,
  } = option;
  data.forEach((item: any) => {
    const newItem: ITreeNode = {
      // 对原数据的地址引用，外部可直接更改源数据
      $origin_data: item,
      [title]: title in item ? item[title] : "",
      [id]: id in item ? item[id] : "",
      [checkable]: checkable in item ? item[checkable] : true,
      [checked]: checked in item ? item[checked] : false, // 默认展示勾选框
      [indeterminate]: indeterminate in item ? item[indeterminate] : false,
      [disableCheckbox]:
        disableCheckbox in item ? item[disableCheckbox] : false,
      [disableCheckboxHoverText]:
        disableCheckboxHoverText in item ? item[disableCheckboxHoverText] : "",
      level,
      expand: false,
      visible: level === 1,
      pid,
      childLen: item[children] ? item[children].length : 0,
    };
    extProps &&
      extProps.forEach((key) => {
        newItem[key] = item[key];
      });
    defaultDataHandler(newItem, option);
    arr.push(newItem);
    arr.push(...flatten(item[children] || [], level + 1, item[id], option));
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
