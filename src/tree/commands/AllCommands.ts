import {BaseCommand, VagrantCommand, VirtualMachineCommand} from "./BaseCommand";
import {AddGroupCommand} from "./AddGroup";
import {AddVmCommand} from "./AddVm";
import {CopyIpAddressCommand} from "./copyIpAddress";
import {DeleteVMCommand} from "./deleteVm";
import {DeleteVmSnapshotCommand} from "./deleteVmSnapshot";
import {EnterVmCommand} from "./enterVm";
import {PauseGroupVirtualMachinesCommand} from "./pauseGroupVirtualMachines";
import {PauseVirtualMachineCommand} from "./pauseVirtualMachine";
import {RemoveGroupCommand} from "./removeGroup";
import {RenameGroupCommand} from "./renameGroup";
import {RenameMachineCommand} from "./renameMachine";
import {RestoreVmSnapshotCommand} from "./restoreVmSnapshot";
import {ResumeGroupVirtualMachinesCommand} from "./resumeGroupVirtualMachines";
import {StartGroupVirtualMachinesCommand} from "./startGroupVirtualMachines";
import {StartHeadlessVirtualMachineCommand} from "./startHeadlessVirtualMachine";
import {StartVirtualMachineCommand} from "./startVirtualMachine";
import {StartWindowVirtualMachineCommand} from "./startWindowVirtualMachine";
import {StopGroupVirtualMachineCommand} from "./stopGroupVirtualMachines";
import {StopVirtualMachineCommand} from "./stopVirtualMachine";
import {SuspendGroupVirtualMachinesCommand} from "./suspendGroupVirtualMachines";
import {SuspendVirtualMachineCommand} from "./suspendVirtualMachine";
import {TakeGroupSnapshotCommand} from "./takeGroupSnapshot";
import {TakeSnapshotCommand} from "./takeSnapshot";
import {ToggleRosettaLinuxCommand} from "./toggleRosettaLinux";
import {ToggleShowHideCommand} from "./toggleShowHide";
import {VagrantBoxesInitCommand} from "./vagrantBoxesInit";
import {VagrantBoxRefreshCommand} from "./vagrantBoxesRefresh";
import {VagrantBoxesRemoveCommand} from "./vagrantBoxesRemove";
import {ViewVmDetailsCommand} from "./viewVmDetails";
import {SearchAndDownloadBoxesCommand} from "./vagrant/searchAndDownloadBoxes";
import {EnterContainerCommand} from "./docker/enterContainer";
import {GetContainerLogsCommand} from "./docker/getContainerLogs";
import {PauseContainerCommand} from "./docker/pauseContainer";
import {RemoveContainerCommand} from "./docker/removeContainer";
import {RemoveImageCommand} from "./docker/removeImage";
import {RestartContainerCommand} from "./docker/restartContainer";
import {ResumeContainerCommand} from "./docker/resumeContainer";
import {RunContainerCommand} from "./docker/runContainer";
import {StartContainerCommand} from "./docker/startContainer";
import {StopContainerCommand} from "./docker/stopContainer";
import {ResumeVirtualMachineCommand} from "./resumeVirtualMachine";
import {RefreshVirtualMachineCommand} from "./refreshVirtualMachines";

export const AllVirtualMachineCommands: VirtualMachineCommand[] = [
  AddVmCommand,
  AddGroupCommand,
  CopyIpAddressCommand,
  DeleteVMCommand,
  DeleteVmSnapshotCommand,
  EnterVmCommand,
  PauseGroupVirtualMachinesCommand,
  PauseVirtualMachineCommand,
  RefreshVirtualMachineCommand,
  RemoveGroupCommand,
  RenameGroupCommand,
  RenameMachineCommand,
  RestoreVmSnapshotCommand,
  ResumeGroupVirtualMachinesCommand,
  ResumeVirtualMachineCommand,
  StartGroupVirtualMachinesCommand,
  StartHeadlessVirtualMachineCommand,
  StartVirtualMachineCommand,
  StartWindowVirtualMachineCommand,
  StopGroupVirtualMachineCommand,
  StopVirtualMachineCommand,
  SuspendGroupVirtualMachinesCommand,
  SuspendVirtualMachineCommand,
  TakeGroupSnapshotCommand,
  TakeSnapshotCommand,
  ToggleRosettaLinuxCommand,
  ToggleShowHideCommand,
  ViewVmDetailsCommand,

  //Docker Commands
  EnterContainerCommand,
  GetContainerLogsCommand,
  PauseContainerCommand,
  RemoveContainerCommand,
  RemoveImageCommand,
  RestartContainerCommand,
  ResumeContainerCommand,
  RunContainerCommand,
  StartContainerCommand,
  StopContainerCommand
];

export const AllVagrantCommands: VagrantCommand[] = [
  VagrantBoxesInitCommand,
  VagrantBoxRefreshCommand,
  VagrantBoxesRemoveCommand,
  SearchAndDownloadBoxesCommand
];
