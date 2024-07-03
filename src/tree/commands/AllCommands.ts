import {
  DevOpsCatalogCommand,
  DevOpsRemoteHostsCommand,
  DevOpsRemoteProviderManagementCommand,
  VagrantCommand,
  VirtualMachineCommand
} from "./BaseCommand";
import {AddGroupCommand} from "./virtualMachines/AddGroup";
import {AddVmCommand} from "./virtualMachines/AddVm";
import {CopyIpAddressCommand} from "./virtualMachines/copyIpAddress";
import {DeleteVMCommand} from "./virtualMachines/deleteVm";
import {DeleteVmSnapshotCommand} from "./virtualMachines/deleteVmSnapshot";
import {EnterVmCommand} from "./virtualMachines/enterVm";
import {PauseGroupVirtualMachinesCommand} from "./virtualMachines/pauseGroupVirtualMachines";
import {PauseVirtualMachineCommand} from "./virtualMachines/pauseVirtualMachine";
import {RemoveGroupCommand} from "./virtualMachines/removeGroup";
import {RenameGroupCommand} from "./virtualMachines/renameGroup";
import {RenameMachineCommand} from "./virtualMachines/renameMachine";
import {RestoreVmSnapshotCommand} from "./virtualMachines/restoreVmSnapshot";
import {ResumeGroupVirtualMachinesCommand} from "./virtualMachines/resumeGroupVirtualMachines";
import {StartGroupVirtualMachinesCommand} from "./virtualMachines/startGroupVirtualMachines";
import {StartHeadlessVirtualMachineCommand} from "./virtualMachines/startHeadlessVirtualMachine";
import {StartVirtualMachineCommand} from "./virtualMachines/startVirtualMachine";
import {StartWindowVirtualMachineCommand} from "./virtualMachines/startWindowVirtualMachine";
import {StopGroupVirtualMachineCommand} from "./virtualMachines/stopGroupVirtualMachines";
import {StopVirtualMachineCommand} from "./virtualMachines/stopVirtualMachine";
import {SuspendGroupVirtualMachinesCommand} from "./virtualMachines/suspendGroupVirtualMachines";
import {SuspendVirtualMachineCommand} from "./virtualMachines/suspendVirtualMachine";
import {TakeGroupSnapshotCommand} from "./virtualMachines/takeGroupSnapshot";
import {TakeSnapshotCommand} from "./virtualMachines/takeSnapshot";
import {ToggleRosettaLinuxCommand} from "./virtualMachines/toggleRosettaLinux";
import {ToggleShowHideCommand} from "./virtualMachines/toggleShowHide";
import {VagrantBoxesInitCommand} from "./vagrant/vagrantBoxesInit";
import {VagrantBoxRefreshCommand} from "./vagrant/vagrantBoxesRefresh";
import {VagrantBoxesRemoveCommand} from "./vagrant/vagrantBoxesRemove";
import {ViewVmDetailsCommand} from "./virtualMachines/viewVmDetails";
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
import {ResumeVirtualMachineCommand} from "./virtualMachines/resumeVirtualMachine";
import {RefreshVirtualMachineCommand} from "./virtualMachines/refreshVirtualMachines";
import {DevOpsAddCatalogProviderCommand} from "./devopsCatalogProvider/addCatalogProvider";
import {DevOpsRefreshCatalogProviderCommand} from "./devopsCatalogProvider/refreshCatalogProvider";
import {DevOpsAddRemoteProviderCommand} from "./devopsRemoteHostProvider/addRemoteProvider";
import {DevOpsInstallFromRemoteCommand} from "./devopsRemoteHostProvider/installFromRemoteProvider";
import {DevOpsInstallFromCatalogCommand} from "./devopsCatalogProvider/installFromCatalogProvider";
import {DevOpsRefreshRemoteHostsProviderCommand} from "./devopsRemoteHostProvider/refreshRemoteHostsProvider";
import {DevOpsEnableRemoteProviderOrchestratorHostCommand} from "./devopsRemoteHostProvider/enableRemoteProviderOrchestratorHost";
import {DevOpsDisableRemoteProviderOrchestratorHostCommand} from "./devopsRemoteHostProvider/disableRemoteProviderOrchestratorHost";
import {DevOpsRemoveCatalogProviderCommand} from "./devopsCatalogProvider/removeCatalogProvider";
import {DevOpsRemoveRemoteProviderCommand} from "./devopsRemoteHostProvider/removeRemoteProvider";
import {DevOpsPullCatalogProviderManifestCommand} from "./devopsCatalogProvider/pullCatalogProviderManifest";
import {DevOpsStartVirtualMachineCommand} from "./devopsRemoteHostProvider/startVirtualMachine";
import {DevOpsStopVirtualMachineCommand} from "./devopsRemoteHostProvider/stopVirtualMachine";
import {DevOpsSuspendVirtualMachineCommand} from "./devopsRemoteHostProvider/suspendVirtualMachine";
import {DevOpsPauseVirtualMachineCommand} from "./devopsRemoteHostProvider/pauseVirtualMachine";
import {DevOpsCloneVirtualMachineCommand} from "./devopsRemoteHostProvider/cloneVirtualMachine";
import {DevOpsRemoveVirtualMachineCommand} from "./devopsRemoteHostProvider/removeVirtualMachine";
import {DevOpsResumeVirtualMachineCommand} from "./devopsRemoteHostProvider/resumeVirtualMachine";
import {DevOpsPushVmToCatalogProviderManifestCommand} from "./devopsCatalogProvider/pushVmToCatalogProvider";
import {DevOpsRemoveCatalogProviderManifestCommand} from "./devopsCatalogProvider/removeCatalogProviderManifest";
import {DevOpsAddRemoteProviderOrchestratorHostCommand} from "./devopsRemoteHostProvider/addRemoteProviderOrchestratorHost";
import {DevOpsRemoveRemoteProviderOrchestratorHostCommand} from "./devopsRemoteHostProvider/removeRemoteProviderOrchestratorHost";
import {DevOpsForceRefreshRemoteHostsProviderCommand} from "./devopsRemoteHostProvider/forceRefreshRemoteHostsProvider";
import {DevOpsManagementProviderAddUserCommand} from "./devopsManagementProvider/addRemoteProviderUser";
import {DevOpsManagementProviderRemoveUserCommand} from "./devopsManagementProvider/removeRemoteProviderUser";
import {DevOpsManagementProviderAddUserClaimCommand} from "./devopsManagementProvider/addRemoteProviderUserClaim";
import {DevOpsManagementProviderRemoveUserClaimCommand} from "./devopsManagementProvider/removeRemoteProviderUserClaim";
import {DevOpsManagementProviderAddUserRoleCommand} from "./devopsManagementProvider/addRemoteProviderUserRoles";
import {DevOpsManagementProviderRemoveUserRoleCommand} from "./devopsManagementProvider/removeRemoteProviderUserRoles";
import {DevOpsManagementProviderAddClaimCommand} from "./devopsManagementProvider/addRemoteProviderClaim";
import {DevOpsManagementProviderRemoveClaimCommand} from "./devopsManagementProvider/removeRemoteProviderClaim";
import {DevOpsManagementProviderRemoveRoleCommand} from "./devopsManagementProvider/removeRemoteProviderRole";
import {DevOpsManagementProviderAddRoleCommand} from "./devopsManagementProvider/addRemoteProviderRole";
import {DevOpsTaintCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/taintCatalogProviderManifestVersion";
import {DevOpsUnTaintCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/untaintCatalogProviderManifestVersion";
import {DevOpsRevokeCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/revokeCatalogProviderManifestVersion";
import {DevOpsAddRoleToCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/addCatalogProviderManifestVersionRoles";
import {DevOpsRemoveRoleFromCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/removeCatalogProviderManifestVersionRoles";
import {DevOpsAddClaimsToCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/addCatalogProviderManifestVersionClaims";
import {DevOpsAddTagsToCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/addCatalogProviderManifestVersionTags";
import {DevOpsRemoveClaimFromCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/removeCatalogProviderManifestVersionClaims";
import {DevOpsRemoveTagFromCatalogProviderManifestVersionCommand} from "./devopsCatalogProvider/removeCatalogProviderManifestVersionTags";
import {DevOpsManagementProviderUpdateProviderCommand} from "./devopsManagementProvider/updateRemoteProvider";
import {DevOpsManagementProviderUpdateUserCommand} from "./devopsManagementProvider/updateRemoteProviderUser";
import {DevOpsPullCatalogManifestMachineOnHostCommand} from "./devopsRemoteHostProvider/pullCatalogManifestMachineOnHost";
import {DevOpsUpdateRemoteProviderOrchestratorHostCommand} from "./devopsRemoteHostProvider/updateRemoteProviderOrchestratorHost";
import { CloneVmCommand } from "./virtualMachines/cloneVm";

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
  CloneVmCommand,
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

export const AllDevOpsCatalogCommands: DevOpsCatalogCommand[] = [
  DevOpsInstallFromCatalogCommand,
  DevOpsAddCatalogProviderCommand,
  DevOpsRemoveCatalogProviderCommand,
  DevOpsRemoveCatalogProviderManifestCommand,
  DevOpsPullCatalogProviderManifestCommand,
  DevOpsPushVmToCatalogProviderManifestCommand,
  DevOpsRefreshCatalogProviderCommand,
  DevOpsTaintCatalogProviderManifestVersionCommand,
  DevOpsUnTaintCatalogProviderManifestVersionCommand,
  DevOpsRevokeCatalogProviderManifestVersionCommand,
  DevOpsAddRoleToCatalogProviderManifestVersionCommand,
  DevOpsRemoveRoleFromCatalogProviderManifestVersionCommand,
  DevOpsAddClaimsToCatalogProviderManifestVersionCommand,
  DevOpsRemoveClaimFromCatalogProviderManifestVersionCommand,
  DevOpsAddTagsToCatalogProviderManifestVersionCommand,
  DevOpsRemoveTagFromCatalogProviderManifestVersionCommand
];

export const AllDevOpsRemoteCommands: DevOpsRemoteHostsCommand[] = [
  DevOpsInstallFromRemoteCommand,
  DevOpsAddRemoteProviderCommand,
  DevOpsRemoveRemoteProviderCommand,
  DevOpsRefreshRemoteHostsProviderCommand,
  DevOpsForceRefreshRemoteHostsProviderCommand,
  DevOpsAddRemoteProviderOrchestratorHostCommand,
  DevOpsRemoveRemoteProviderOrchestratorHostCommand,
  DevOpsEnableRemoteProviderOrchestratorHostCommand,
  DevOpsDisableRemoteProviderOrchestratorHostCommand,
  DevOpsStartVirtualMachineCommand,
  DevOpsStopVirtualMachineCommand,
  DevOpsSuspendVirtualMachineCommand,
  DevOpsPauseVirtualMachineCommand,
  DevOpsResumeVirtualMachineCommand,
  DevOpsCloneVirtualMachineCommand,
  DevOpsRemoveVirtualMachineCommand,
  DevOpsPullCatalogManifestMachineOnHostCommand,
  DevOpsUpdateRemoteProviderOrchestratorHostCommand
];

export const AllDevopsRemoteProviderManagementCommands: DevOpsRemoteProviderManagementCommand[] = [
  DevOpsManagementProviderAddUserCommand,
  DevOpsManagementProviderRemoveUserCommand,
  DevOpsManagementProviderAddUserClaimCommand,
  DevOpsManagementProviderRemoveUserClaimCommand,
  DevOpsManagementProviderAddUserRoleCommand,
  DevOpsManagementProviderRemoveUserRoleCommand,
  DevOpsManagementProviderAddClaimCommand,
  DevOpsManagementProviderRemoveClaimCommand,
  DevOpsManagementProviderAddRoleCommand,
  DevOpsManagementProviderRemoveRoleCommand,
  DevOpsManagementProviderUpdateProviderCommand,
  DevOpsManagementProviderUpdateUserCommand
];
