import { cloneDeep } from "lodash";

/**
 * 树结构拍平
 * @param {array} list 树的数据
 * @param {object} option 树格式配置
 * @param {number} level 树拍平之后的等级划分
 * @param {number} pid 父节点id
 * @returns
 */
export const flatten = (
  data: ITreeData[],
  level = 1,
  pid = 0,
  option: any = {
    childrenKey: "children",
    idKey: "id",
    expandAll: false, // 初始化是否展开全部
    activeNodeId: "", // 初始化选中节点
  }
) => {
  const arr: ITreeNode[] = [];
  const { childrenKey, idKey, expandAll, activeNodeId } = option;
  const cloneData = cloneDeep(data);
  cloneData.forEach((item: ITreeData) => {
    item.level = level;
    item.expand = false;
    item.visible = false;
    if (level === 1) {
      item.visible = true;
      // 第一级有子节点，默认展开
      if (item[childrenKey] && item[childrenKey].length) {
        item.expand = true;
      }
    }
    if (expandAll) {
      item.expand = true;
      item.visible = true;
    } else {
      // 默认第二级显示，但不展开
      if (level === 2) {
        item.visible = true;
      }
    }
    if (activeNodeId) {
      if (activeNodeId === item[idKey]) {
        item.active = true;
      }
    } else {
      if (level === 1) {
        item.active = true;
      }
    }
    item.pid = pid;
    item.childLen = item[childrenKey] ? item[childrenKey].length : 0;
    arr.push(item);
    arr.push(
      ...flatten(item[childrenKey] || [], level + 1, item[idKey], option)
    );
    delete item[childrenKey];
  });
  return arr;
};

/**
 * 找出数据的子孙节点
 * @param {object} data
 * @param {object} item
 * @param {string} idKey
 * @returns
 */
export const findDescendants = (
  data: ITreeNode[],
  item: ITreeNode,
  idKey: string
) => {
  const arr = [];
  const index = data.findIndex((node) => node[idKey] === item[idKey]);
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
 * @param {string} idKey
 * @returns
 */
export const findElders = (
  data: ITreeNode[],
  item: ITreeNode,
  idKey: string
) => {
  const itemElders: ITreeNode[] = [];
  const getElders = (item: ITreeNode) => {
    if (!item.pid) return;
    data.forEach((node) => {
      if (node[idKey] === item.pid) {
        itemElders.push(node);
        getElders(node);
      }
    });
  };
  getElders(item);
  return itemElders;
};

/**
 *
 * @param {*array} list
 * @param {string} childrenKey
 * @param {string} idKey
 * @returns
 */
export const listToTree = (
  list: ITreeNode[],
  childrenKey: string,
  idKey: string
) => {
  const map: { [key: string]: ITreeNode } = {};
  let node;
  const tree = [];
  let i;
  for (i = 0; i < list.length; i++) {
    map[list[i][idKey]] = list[i];
    list[i][childrenKey] = [];
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    const child = { ...node };
    const attrArr = [
      "pid",
      "level",
      "expand",
      "visible",
      "active",
      "childLen",
      "loading",
      "hasAsyncChildren",
    ];
    attrArr.forEach((attr) => {
      delete child[attr];
    });
    if (node.pid) {
      map[node.pid][childrenKey].push(child);
    } else {
      tree.push(child);
    }
  }
  return tree;
};
