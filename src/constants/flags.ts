export const FLAG_NO_GROUP = "no_group";
export const FLAG_CONFIGURATION = "parallels.configuration";
export const FLAG_VAGRANT_VERSION = "hashicorp.vagrant.version";
export const FLAG_VAGRANT_PATH = "hashicorp.vagrant.path";
export const FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS = "hashicorp.vagrant.parallels.plugin";
export const FLAG_VAGRANT_BOXES_PATH = "hashicorp.vagrant.boxes.path";
export const FLAG_PACKER_VERSION = "hashicorp.packer.version";
export const FLAG_PACKER_PATH = "hashicorp.packer.path";
export const FLAG_PARALLELS_DESKTOP_PATH = "prlctl.path";
export const FLAG_PARALLELS_EXTENSION_PATH = "extension.path";
export const FLAG_PARALLELS_EXTENSION_DOWNLOAD_PATH = "extension.download.path";
export const FLAG_HAS_VAGRANT_BOXES = "parallels-desktop:hasVagrantBoxes";
export const FLAG_HAS_VIRTUAL_MACHINES = "parallels-desktop:hasVirtualMachines";
export const FLAG_ENABLE_SHOW_HIDDEN = "parallels-desktop:enableShowHidden";
export const FLAG_DISABLE_SHOW_HIDDEN = "parallels-desktop:disableShowHidden";
export const FLAG_VAGRANT_EXISTS = "parallels-desktop:vagrant";
export const FLAG_PACKER_EXISTS = "parallels-desktop:packer";
export const FLAG_PARALLELS_DESKTOP_EXISTS = "parallels-desktop:parallels";
export const FLAG_PARALLELS_EXTENSION_INITIALIZED = "parallels-desktop:initialized";
export const FLAG_DOCKER_CONTAINER_ITEMS_EXISTS = "parallels-desktop:docker-container-items";
export const FLAG_AUTO_REFRESH = "extension.refresh.auto";
export const FLAG_AUTO_REFRESH_INTERVAL = "extension.refresh.interval";
export const FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY = "extension.order-items-alphabetically";
export const FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE = "extension.show-flat-snapshot-tree";
export const FLAG_START_VMS_HEADLESS_DEFAULT = "extension.start-machines-headless-by-default";
export const FLAG_IS_HEADLESS_DEFAULT = "parallels-desktop:headless-by-default";
export const FLAG_TREE_SHOW_HIDDEN = "tree.show-hidden-items";
export const FLAG_GIT_PATH = "git.path";
export const FLAG_GIT_VERSION = "git.version";
export const FLAG_BREW_PATH = "brew.path";
export const FLAG_BREW_VERSION = "brew.version";

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

export enum TelemetryEventIds {
  ExtensionStarted = 200,
  AddNewMachine = 201,
  AddNewMachineCompleted = 202,
  AddNewMachineFailed = 203,
  GroupAction = 204,
  VirtualMachineAction = 205
}

export class Constants {
  static CacheFlagHardwareInfo = "parallels-desktop.hardware-info";
  static CacheFlagParallelsServerInfo = "parallels-desktop.server-info";
  static CacheFlagPackerAddons = "parallels-desktop.packer-addons";
}

export class CommandsFlags {
  static clearDownloadCache = `${COMMAND_PREFIX}.clear-download-cache`;

  static treeVmInfo = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.view-vm-details`;
  static treeAddVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-vm`;
  static treePauseVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.pause-vm`;
  static treeSuspendVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.suspend-vm`;
  static treeRefreshVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.refresh-vms`;
  static treeResumeVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.resume-vm`;
  static treeStartVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-vm`;
  static treeStartHeadlessVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-headless-vm`;
  static treeStartWindowVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-window-vm`;
  static treeStopVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.stop-vm`;
  static treeRemoveVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.remove-vm`;
  static treeEnterVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.enter-vm`;
  static treeRenameVm = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.rename-vm`;
  static treeEnableRosetta = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.enable-rosetta-linux`;
  static treeDisableRosetta = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.disable-rosetta-linux`;

  static treeCopyIpAddress = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.copy-ip-address`;

  static treeTakeVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.take-vm-snapshot`;
  static treeDeleteVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.delete-vm-snapshot`;
  static treeRestoreVmSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.restore-vm-snapshot`;
  static treeTakeGroupSnapshot = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.take-group-snapshot`;

  static treeShowItem = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.show-item`;
  static treeHideItem = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.hide-item`;

  static treeAddGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.add-group`;
  static treeRemoveGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.remove-group`;
  static treeRenameGroup = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.rename-group`;
  static treeStartGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.start-group-vms`;
  static treePauseGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.pause-group-vms`;
  static treeResumeGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.resume-group-vms`;
  static treeSuspendGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.suspend-group-vms`;
  static treeStopGroupVms = `${COMMAND_PREFIX}.${TREE_VIEW_PREFIX}.stop-group-vms`;

  static coreEnableShowHiddenItems = `${COMMAND_PREFIX}.core.enable-show-hidden-items`;
  static coreDisableShowHiddenItems = `${COMMAND_PREFIX}.core.disable-show-hidden-items`;
  static coreToggleShowHiddenItems = `${COMMAND_PREFIX}.core.toggle-show-hidden-items`;

  static vagrantBoxProviderRefresh = `${COMMAND_PREFIX}.vagrant.box.provider.refresh`;
  static vagrantBoxProviderInit = `${COMMAND_PREFIX}.vagrant.box.provider.init`;
  static vagrantBoxProviderDelete = `${COMMAND_PREFIX}.vagrant.box.provider.delete`;

  static dockerStartContainer = `${COMMAND_PREFIX}.docker.start-container`;
  static dockerStopContainer = `${COMMAND_PREFIX}.docker.stop-container`;
  static dockerRestartContainer = `${COMMAND_PREFIX}.docker.restart-container`;
  static dockerPauseContainer = `${COMMAND_PREFIX}.docker.pause-container`;
  static dockerResumeContainer = `${COMMAND_PREFIX}.docker.resume-container`;
  static dockerRemoveContainer = `${COMMAND_PREFIX}.docker.remove-container`;
  static dockerGetContainerLogs = `${COMMAND_PREFIX}.docker.get-container-logs`;
  static dockerEnterContainer = `${COMMAND_PREFIX}.docker.enter-container`;
  static dockerRunContainer = `${COMMAND_PREFIX}.docker.run-container`;
  static dockerRemoveImage = `${COMMAND_PREFIX}.docker.remove-image`;

  static vagrantSearchAndDownload = `${COMMAND_PREFIX}.vagrant.search-and-download`;
}
