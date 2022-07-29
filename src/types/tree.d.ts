interface IProps {
  title: string;
  children: string;
  id: string;
  checkable: string;
  checked: string;
  indeterminate: string;
  disableCheckbox: string;
  disableCheckboxHoverText: string;
}

interface IOption {
  height: string;
  itemHeight: number;
  // 表格树左边宽度
  treeLeftWidth?: string;
}

interface ITreeNode {
  $origin_data: any;
  level: number;
  expand: boolean;
  visible: boolean;
  pid: string | null;
  childLen: number;
  active?: boolean;
  loading?: boolean;
  hasAsyncChildren?: number;
  [key: string]: any;
}

interface IPositions {
  index: number;
  id: string;
  height: number;
  top: number;
  bottom: number;
}
