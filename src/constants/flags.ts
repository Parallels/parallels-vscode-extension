export const FLAG_NO_GROUP = "no_group";
export const FLAG_CONFIGURATION = "parallels.configuration";
export const FLAG_VAGRANT_VERSION = "hashicorp.vagrant.version";
export const FLAG_VAGRANT_PATH = "hashicorp.vagrant.path";
export const FLAG_PACKER_VERSION = "hashicorp.packer.version";
export const FLAG_PACKER_PATH = "hashicorp.packer.path";

const COMMAND_PREFIX = "parallels-desktop";
const TREE_VIEW_PREFIX = "tree-view";

export enum VM_TYPE {
  "win-311",
  "win-95 ",
  "win-98",
  "win-me",
  "win-nt ",
  "win-2000",
  "win-xp",
  "win-2003",
  "win-vista",
  "win-2008",
  "win-7",
  "win-8",
  "win-2012",
  "win-8.1",
  "win-10",
  "win-2016",
  "win-2019",
  "win-2022",
  "win-11 ",
  "win",
  "rhel",
  "rhel7",
  "suse",
  "debian",
  "fedora-core",
  "fc",
  "xandros",
  "ubuntu",
  "elementary",
  "mandriva",
  "mandrake",
  "centos",
  "centos7",
  "psbm",
  "redhat",
  "opensuse",
  "linux-2.4",
  "linux-2.6",
  "linux",
  "mageia",
  "mint",
  "boot2docker",
  "kali",
  "manjaro",
  "zorin",
  "macosx",
  "tiger",
  "macos-10.4",
  "leopard",
  "macos-10.5",
  "snowleopard",
  "macos-10.6",
  "freebsd",
  "freebsd-4",
  "freebsd-5",
  "freebsd-6",
  "freebsd-7",
  "freebsd-8",
  "chrome-1",
  "chrome",
  "msdos-6.22",
  "msdos",
  "os2-3",
  "os2-4",
  "os2-45",
  "ecomstation-1.1",
  "ecomstation-1.2",
  "os2",
  "netware-4",
  "netware-5",
  "netware-6 ",
  "netware",
  "solaris-9",
  "solaris-10",
  "solaris-11",
  "opensolaris",
  "solaris",
  "qnx",
  "openstep",
  "other"
}

export function getVmType(type: string): VM_TYPE {
  return VM_TYPE[type as keyof typeof VM_TYPE];
}

export class CommandsFlags {
  static clearDownloadCache = `${COMMAND_PREFIX}.clear-download-cache`;
  static treeViewViewVmDetails = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.view-vm-details`;
  static treeViewAddGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-group`;
  static treeViewRemoveGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.remove-group`;
  static treeViewAddVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-vm`;
  static treeViewPauseVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.pause-vm`;
  static treeViewSuspendVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.suspend-vm`;
  static treeViewRefreshVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.refresh-vms`;
  static treeViewResumeVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.resume-vm`;
  static treeViewStartVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-vm`;
  static treeViewStartHeadlessVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-headless-vm`;
  static treeViewStopVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.stop-vm`;
  static treeViewTakeVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.take-vm-snapshot`;
  static treeViewDeleteVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.delete-vm-snapshot`;
  static treeViewRestoreVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.restore-vm-snapshot`;
  static treeViewTakeGroupSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.take-group-snapshot`;
  static treeViewStartGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-group-vms`;
  static treeViewPauseGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.pause-group-vms`;
  static treeViewResumeGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.resume-group-vms`;
  static treeViewSuspendGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.suspend-group-vms`;
  static treeViewStopGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.stop-group-vms`;
}
