export const FLAG_NO_GROUP = "no_group";
export const FLAG_CONFIGURATION = "parallels.configuration";
export const FLAG_VAGRANT_VERSION = "hashicorp.vagrant.version";
export const FLAG_VAGRANT_PATH = "hashicorp.vagrant.path";
export const FLAG_PACKER_VERSION = "hashicorp.packer.version";
export const FLAG_PACKER_PATH = "hashicorp.packer.path";

const COMMAND_PREFIX = "parallels-desktop";
const TREE_VIEW_PREFIX = "tree-view";

export class CommandsFlags {
  static treeViewItemClick = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.item-click`;
  static treeViewAddGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-group`;
  static treeViewRemoveGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.remove-group`;
  static treeViewAddVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-vm`;
  static treeViewPauseVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.pause-vm`;
  static treeViewRefreshVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.refresh-vms`;
  static treeViewResumeVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.resume-vm`;
  static treeViewStartVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-vm`;
  static treeViewStartHeadlessVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-headless-vm`;
  static treeViewStopVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.stop-vm`;
}
