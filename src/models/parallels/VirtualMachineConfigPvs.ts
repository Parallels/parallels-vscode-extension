export interface VirtualMachineConfigPvs {
  "?xml": XML;
  ParallelsVirtualMachine: ParallelsVirtualMachine;
}

export interface XML {
  "@_version": string;
  "@_encoding": string;
}

export interface ParallelsVirtualMachine {
  AppVersion: string;
  ValidRc: number;
  Identification: Identification;
  Security: Security;
  Settings: Settings;
  Hardware: Hardware;
  InstalledSoftware: number;
  "@_dyn_lists": string;
  "@_schemaVersion": string;
}

export interface Hardware {
  Cpu: CPU;
  Chipset: Chipset;
  Clock: Clock;
  Memory: Memory;
  Video: Video;
  HibernateState: HibernateState;
  VirtIOSerial: VirtIOSerial;
  CdRom: CDROM;
  Hdd: HDD;
  NetworkAdapter: NetworkAdapter;
  Sound: HardwareSound;
  USB: USB;
  UsbConnectHistory: USBConnectHistory;
  BTConnectHistory: BTConnectHistory;
  TpmChip: TPMChip;
  "@_dyn_lists": string;
  "@_Hdd_patch": string;
  "@_NetworkAdapter_patch": string;
}

export interface BTConnectHistory {
  "@_dyn_lists": string;
}

export interface CDROM {
  Index: number;
  Enabled: number;
  Connected: number;
  EmulatedType: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  InterfaceType: number;
  StackIndex: number;
  Passthrough: number;
  SubType: number;
  DeviceDescription: string;
  "@_dyn_lists": string;
  "@_id": string;
}

export interface Chipset {
  Type: number;
  Version: number;
  "@_dyn_lists": string;
  "@_Version_patch": string;
}

export interface Clock {
  TimeShift: number;
  "@_dyn_lists": string;
}

export interface CPU {
  Number: number;
  Mode: number;
  Type: number;
  AutoCountEnabled: number;
  AccelerationLevel: number;
  EnableVTxSupport: number;
  EnableHotplug: number;
  VirtualizedHV: number;
  VirtualizePMU: number;
  "@_Type_patch": string;
  "@_dyn_lists": string;
  "@_EnableVTxSupport_patch": string;
  "@_AutoCountEnabled_patch": string;
}

export interface HDD {
  Uuid: string;
  Index: number;
  Enabled: number;
  Connected: number;
  EmulatedType: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  InterfaceType: number;
  StackIndex: number;
  DiskType: number;
  Size: number;
  SizeOnDisk: number;
  Passthrough: number;
  SubType: number;
  Splitted: number;
  DiskVersion: number;
  CompatLevel: string;
  DeviceDescription: string;
  AutoCompressEnabled: number;
  OnlineCompactMode: number;
  "@_dyn_lists": string;
  "@_id": string;
}

export interface HibernateState {
  ConfigDirty: number;
  SMapType: number;
  HardwareSignature: number;
  ShutdownReason: number;
  LongReset: number;
  ServerUuid: string;
  CpuFeatures: CPUFeatures;
  "@_dyn_lists": string;
}

export interface CPUFeatures {
  FEATURES_MASK: number;
  EXT_FEATURES_MASK: number;
  EXT_80000001_ECX_MASK: number;
  EXT_80000001_EDX_MASK: number;
  EXT_80000007_EDX_MASK: number;
  EXT_80000008_EAX: number;
  EXT_00000007_EBX_MASK: number;
  EXT_00000007_EDX_MASK: number;
  EXT_0000000D_EAX_MASK: number;
  EXT_00000006_EAX_MASK: number;
  CpuFeaturesMaskValid: number;
  "@_dyn_lists": string;
}

export interface Memory {
  RAM: number;
  RamAutoSizeEnabled: number;
  EnableHotplug: number;
  HostMemQuotaMin: number;
  HostMemQuotaMax: number;
  HostMemQuotaPriority: number;
  AutoQuota: number;
  MaxBalloonSize: number;
  ExtendedMemoryLimits: number;
  "@_dyn_lists": string;
  "@_ExtendedMemoryLimits_patch": string;
  "@_RamAutoSizeEnabled_patch": string;
}

export interface NetworkAdapter {
  Index: number;
  Enabled: number;
  Connected: number;
  EmulatedType: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  AdapterNumber: number;
  AdapterName: string;
  MAC: string;
  VMNetUuid: string;
  HostMAC: string;
  HostInterfaceName: string;
  Router: number;
  DHCPUseHostMac: number;
  ForceHostMacAddress: number;
  AdapterType: number;
  StaticAddress: number;
  PktFilter: PktFilter;
  LinkRateLimit: LinkRateLimit;
  AutoApply: number;
  ConfigureWithDhcp: number;
  DefaultGateway: string;
  ConfigureWithDhcpIPv6: number;
  DefaultGatewayIPv6: string;
  NetProfile: Profile;
  DeviceDescription: string;
  "@_dyn_lists": string;
  "@_AdapterType_patch": string;
  "@_id": string;
}

export interface LinkRateLimit {
  Enable: number;
  TxBps: number;
  GUITxScale: number;
  RxBps: number;
  GUIRxScale: number;
  TxLossPpm: number;
  RxLossPpm: number;
  TxDelayMs: number;
  RxDelayMs: number;
  "@_dyn_lists": string;
}

export interface Profile {
  Type: number;
  Custom: number;
  "@_dyn_lists": string;
  "@_Custom_patch"?: string;
}

export interface PktFilter {
  PreventPromisc: number;
  PreventMacSpoof: number;
  PreventIpSpoof: number;
  "@_dyn_lists": string;
}

export interface HardwareSound {
  Enabled: number;
  Connected: number;
  BusType: number;
  EmulatedType: number;
  AdvancedType: number;
  HDAPatchApplied: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  VolumeSync: number;
  Output: string;
  Mixer: string;
  Channel: number;
  AEC: number;
  SoundInputs: SoundPuts;
  SoundOutputs: SoundPuts;
  DeviceDescription: string;
  "@_Output_patch": string;
  "@_dyn_lists": string;
  "@_AdvancedType_patch": string;
  "@_Mixer_patch": string;
  "@_id": string;
}

export interface SoundPuts {
  Sound: SoundInputsSound;
  "@_dyn_lists": string;
}

export interface SoundInputsSound {
  Enabled: number;
  Connected: number;
  BusType: number;
  EmulatedType: number;
  AdvancedType: number;
  HDAPatchApplied: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  VolumeSync: number;
  Output: string;
  Mixer: string;
  Channel: number;
  AEC: number;
  SoundInputs: BTConnectHistory;
  SoundOutputs: BTConnectHistory;
  DeviceDescription: string;
  "@_Output_patch": string;
  "@_dyn_lists": string;
  "@_AdvancedType_patch": string;
  "@_Mixer_patch": string;
  "@_id": string;
}

export interface TPMChip {
  Type: number;
  Policy: number;
  "@_Type_patch": string;
  "@_dyn_lists": string;
}

export interface USB {
  Enabled: number;
  Connected: number;
  EmulatedType: number;
  SystemName: string;
  UserFriendlyName: string;
  Remote: number;
  AutoConnect: number;
  ConnectReason: number;
  DeviceDescription: string;
  UsbType: number;
  "@_dyn_lists": string;
  "@_id": string;
}

export interface USBConnectHistory {
  USBPort: USBPort[];
  "@_dyn_lists": string;
}

export interface USBPort {
  Location: number;
  SystemName: string;
  Timestamp: number;
  "@_dyn_lists": string;
  "@_id": string;
}

export interface Video {
  Enabled: number;
  Type: number;
  VirtIOBusType: number;
  VideoMemorySize: number;
  EnableDirectXShaders: number;
  ScreenResolutions: ArchivingOptions;
  Enable3DAcceleration: number;
  EnableVSync: number;
  MaxDisplays: number;
  EnableHiResDrawing: number;
  UseHiResInGuest: number;
  HostScaleFactor: number;
  NativeScalingInGuest: number;
  ApertureOnlyCapable: number;
  "@_ApertureOnlyCapable_patch": string;
  "@_dyn_lists": string;
  "@_VideoMemorySize_patch": string;
  "@_NativeScalingInGuest_patch": string;
}

export interface ArchivingOptions {
  Enabled: number;
  "@_dyn_lists": DynLists;
}

export enum DynLists {
  Empty = "",
  ScreenResolution0DynamicResolution0 = "ScreenResolution 0 DynamicResolution 0"
}

export interface VirtIOSerial {
  ToolgatePort: number;
  LoopbackPort: number;
  "@_dyn_lists": string;
}

export interface Identification {
  VmUuid: string;
  VmType: number;
  SourceVmUuid: string;
  LinkedVmUuid: string;
  LinkedSnapshotUuid: string;
  VmName: string;
  ServerUuid: string;
  ServerUuidAs: string;
  LastServerUuid: string;
  ServerHost: string;
  VmFilesLocation: number;
  VmLocationName: string;
  VmCreationDate: Date;
  VmUptimeStartDateTime: Date;
  VmUptimeInSeconds: number;
  VmLastStateChangedDateTime: Date;
  "@_dyn_lists": string;
}

export interface Security {
  AccessControlList: BTConnectHistory;
  LockedOperationsList: BTConnectHistory;
  PasswordProtectedOperations: BTConnectHistory;
  LockDownHash: string;
  Owner: string;
  IsOwner: number;
  AccessForOthers: number;
  LockedSign: number;
  "@_dyn_lists": string;
}

export interface Settings {
  General: General;
  Startup: Startup;
  Shutdown: Shutdown;
  SasProfile: SASProfile;
  Runtime: Runtime;
  Schedule: Schedule;
  Tools: Tools;
  Autoprotect: Autoprotect;
  AutoCompress: AutoCompress;
  GlobalNetwork: GlobalNetwork;
  VmEncryptionInfo: VMEncryptionInfo;
  VmProtectionInfo: VMProtectionInfo;
  SharedCamera: SharedBluetooth;
  SharedCCID: SharedBluetooth;
  Keyboard: Keyboard;
  VirtualPrintersInfo: VirtualPrintersInfo;
  SharedBluetooth: SharedBluetooth;
  SharedGamepad: ArchivingOptions;
  LockDown: LockDown;
  UsbController: USBController;
  OnlineCompact: OnlineCompact;
  TravelOptions: TravelOptions;
  ArchivingOptions: ArchivingOptions;
  PackingOptions: PackingOptions;
  "@_dyn_lists": string;
}

export interface AutoCompress {
  Enabled: number;
  Period: number;
  FreeDiskSpaceRatio: number;
  "@_dyn_lists": string;
  "@_Enabled_patch": string;
}

export interface Autoprotect {
  Enabled: number;
  Period: number;
  TotalSnapshots: number;
  Schema: number;
  NotifyBeforeCreation: number;
  "@_dyn_lists": string;
  "@_Period_patch": string;
}

export interface General {
  OsType: number;
  OsNumber: number;
  SourceOsVersion: string;
  VmDescription: string;
  IsTemplate: number;
  CustomProperty: string;
  SwapDir: string;
  VmColor: number;
  Profile: Profile;
  CpuRamProfile: CPURAMProfile;
  AssetId: string;
  SerialNumber: string;
  SmbiosBiosVersion: string;
  SmbiosBoardId: string;
  "@_dyn_lists": string;
}

export interface CPURAMProfile {
  Custom: number;
  OtherCpu: number;
  OtherRam: number;
  CustomCpu: CustomCPU;
  CustomMemory: CustomMemory;
  "@_dyn_lists": string;
}

export interface CustomCPU {
  Number: number;
  Auto: number;
  "@_dyn_lists": string;
}

export interface CustomMemory {
  RamSize: number;
  Auto: number;
  "@_dyn_lists": string;
}

export interface GlobalNetwork {
  HostName: string;
  DefaultGateway: string;
  DefaultGatewayIPv6: string;
  AutoApplyIpOnly: number;
  "@_dyn_lists": string;
}

export interface Keyboard {
  HardwareLayout: number;
  "@_dyn_lists": string;
}

export interface LockDown {
  Hash: string;
  "@_dyn_lists": string;
}

export interface OnlineCompact {
  Mode: number;
  "@_dyn_lists": string;
  "@_Mode_patch": string;
}

export interface PackingOptions {
  Direction: number;
  Progress: number;
  "@_dyn_lists": string;
}

export interface Runtime {
  ForegroundPriority: number;
  BackgroundPriority: number;
  DiskCachePolicy: number;
  CloseAppOnShutdown: number;
  ActionOnStop: number;
  DockIcon: number;
  OsResolutionInFullScreen: number;
  FullScreen: FullScreen;
  UndoDisks: number;
  SafeMode: number;
  SystemFlags: string;
  DisableAPIC: number;
  OptimizePowerConsumptionMode: number;
  ShowBatteryStatus: number;
  Enabled: number;
  EnableAdaptiveHypervisor: number;
  UseSMBiosData: number;
  DisableSpeaker: number;
  HideBiosOnStartEnabled: number;
  UseDefaultAnswers: number;
  CompactHddMask: number;
  CompactMode: number;
  DisableWin7Logo: number;
  OptimizeModifiers: number;
  StickyMouse: number;
  PauseOnDeactivation: number;
  FEATURES_MASK: number;
  EXT_FEATURES_MASK: number;
  EXT_80000001_ECX_MASK: number;
  EXT_80000001_EDX_MASK: number;
  EXT_80000007_EDX_MASK: number;
  EXT_80000008_EAX: number;
  EXT_00000007_EBX_MASK: number;
  EXT_00000007_EDX_MASK: number;
  EXT_0000000D_EAX_MASK: number;
  EXT_00000006_EAX_MASK: number;
  CpuFeaturesMaskValid: number;
  UnattendedInstallLocale: string;
  UnattendedInstallEdition: string;
  UnattendedEvaluationVersion: number;
  HostRetinaEnabled: number;
  DebugServer: DebugServer;
  HypervisorType: number;
  ResourceQuota: number;
  RestoreImage: string;
  NetworkBusType: number;
  "@_dyn_lists": string;
  "@_OptimizePowerConsumptionMode_patch": string;
  "@_UndoDisks_patch": string;
  "@_CompactMode_patch": string;
  "@_HypervisorType_patch": string;
  "@_StickyMouse_patch": string;
}

export interface DebugServer {
  Port: number;
  State: number;
  "@_dyn_lists": string;
}

export interface FullScreen {
  UseAllDisplays: number;
  UseActiveCorners: number;
  UseNativeFullScreen: number;
  CornerAction: number[];
  ScaleViewMode: number;
  EnableGammaControl: number;
  OptimiseForGames: number;
  ActivateSpacesOnClick: number;
  "@_dyn_lists": string;
  "@_CornerAction_patch": string;
}

export interface SASProfile {
  Custom: number;
  "@_dyn_lists": string;
}

export interface Schedule {
  SchedBasis: number;
  SchedGranularity: number;
  SchedDayOfWeek: number;
  SchedDayOfMonth: number;
  SchedDay: number;
  SchedWeek: number;
  SchedMonth: number;
  SchedStartDate: Date;
  SchedStartTime: string;
  SchedStopDate: Date;
  SchedStopTime: string;
  "@_dyn_lists": string;
}

export interface SharedBluetooth {
  Enabled: number;
  "@_dyn_lists": string;
  "@_Enabled_patch": string;
  PreserveTextFormatting?: number;
  OneFingerSwipe?: number;
}

export interface Shutdown {
  AutoStop: number;
  OnVmWindowClose: number;
  WindowOnShutdown: number;
  ReclaimDiskSpace: number;
  "@_dyn_lists": string;
  "@_OnVmWindowClose_patch": string;
}

export interface Startup {
  AutoStart: number;
  AutoStartDelay: number;
  VmStartLoginMode: number;
  WindowMode: number;
  StartInDetachedWindow: number;
  BootingOrder: BootingOrder;
  AllowSelectBootDevice: number;
  Bios: BIOS;
  ExternalDeviceSystemName: string;
  "@_dyn_lists": string;
  "@_AutoStart_patch": string;
}

export interface BIOS {
  EfiEnabled: number;
  EfiSecureBoot: number;
  "@_dyn_lists": string;
  "@_EfiEnabled_patch": string;
}

export interface BootingOrder {
  BootDevice: BootDevice[];
  "@_dyn_lists": string;
}

export interface BootDevice {
  Index: number;
  Type: number;
  BootingNumber: number;
  InUse: number;
  "@_dyn_lists": string;
  "@_id": string;
}

export interface Tools {
  ToolsVersion: string;
  BusType: number;
  IsolatedVm: number;
  NonAdminToolsUpgrade: number;
  LockGuestOnSuspend: number;
  SyncVmHostname: number;
  SyncSshIds: number;
  Coherence: Coherence;
  SharedFolders: SharedFolders;
  SharedProfile: SharedProfile;
  SharedApplications: SharedApplications;
  AutoUpdate: ArchivingOptions;
  ClipboardSync: SharedBluetooth;
  DragAndDrop: SharedBluetooth;
  KeyboardLayoutSync: ArchivingOptions;
  MouseSync: ArchivingOptions;
  MouseVtdSync: ArchivingOptions;
  SmartMouse: ArchivingOptions;
  SmoothScrolling: ArchivingOptions;
  TimeSync: TimeSync;
  TisDatabase: TisDatabase;
  Modality: Modality;
  SharedVolumes: SharedVolumes;
  Gestures: SharedBluetooth;
  RemoteControl: ArchivingOptions;
  LocationProvider: ArchivingOptions;
  AutoSyncOSType: ArchivingOptions;
  WinMaintenance: WinMaintenance;
  DevelopOptions: DevelopOptions;
  DiskSpaceOptimization: DiskSpaceOptimization;
  RosettaLinux: ArchivingOptions;
  "@_dyn_lists": string;
}

export interface Coherence {
  ShowTaskBar: number;
  ShowTaskBarInCoherence: number;
  RelocateTaskBar: number;
  GroupAllWindows: number;
  DoNotMinimizeToDock: number;
  BringToFront: number;
  ExcludeDock: number;
  MultiDisplay: number;
  DisableDropShadow: number;
  AppInDock: number;
  ShowWinSystrayInMacMenu: number;
  SwitchToFullscreenOnDemand: number;
  PauseIdleVM: number;
  PauseIdleVMTimeout: number;
  WindowAnimation: number;
  "@_MultiDisplay_patch": string;
  "@_dyn_lists": string;
  "@_ShowTaskBar_patch": string;
  "@_ExcludeDock_patch": string;
}

export interface DevelopOptions {
  ShowInMenu: number;
  "@_dyn_lists": string;
  "@_ShowInMenu_patch": string;
}

export interface DiskSpaceOptimization {
  SyncFreeSpaceFromHost: number;
  "@_dyn_lists": string;
}

export interface Modality {
  Opacity: number;
  StayOnTop: number;
  CaptureMouseClicks: number;
  UseWhenAppInBackground: number;
  ShowOnAllSpaces: number;
  "@_dyn_lists": string;
  "@_StayOnTop_patch": string;
  "@_Opacity_patch": string;
}

export interface SharedApplications {
  FromWinToMac: number;
  FromMacToWin: number;
  SmartSelect: number;
  AppInDock: number;
  ShowWindowsAppInDock: number;
  ShowGuestNotifications: number;
  BounceDockIconWhenAppFlashes: number;
  WebApplications: WebApplications;
  IconGroupingEnabled: number;
  DisableRecentDocs: number;
  StoreInternetPasswordsInOSXKeychain: number;
  "@_dyn_lists": string;
}

export interface WebApplications {
  WebBrowser: number;
  EmailClient: number;
  FtpClient: number;
  Newsgroups: number;
  Rss: number;
  RemoteAccess: number;
  "@_dyn_lists": string;
}

export interface SharedFolders {
  HostSharing: HostSharing;
  GuestSharing: GuestSharing;
  "@_dyn_lists": string;
}

export interface GuestSharing {
  Enabled: number;
  AutoMount: number;
  AutoMountNetworkDrives: number;
  EnableSpotlight: number;
  AutoMountCloudDrives: number;
  ShareRemovableDrives: number;
  PortNumber: number;
  AllowExec: number;
  "@_dyn_lists": string;
  "@_ShareRemovableDrives_patch": string;
}

export interface HostSharing {
  Enabled: number;
  ShareAllMacDisks: number;
  ShareUserHomeDir: number;
  MapSharedFoldersOnLetters: number;
  UserDefinedFoldersEnabled: number;
  SetExecBitForFiles: number;
  VirtualLinks: number;
  EnableDos8dot3Names: number;
  SharedShortcuts: number;
  SharedCloud: number;
  "@_dyn_lists": string;
  "@_MapSharedFoldersOnLetters_patch": string;
}

export interface SharedProfile {
  Enabled: number;
  UseDesktop: number;
  UseDocuments: number;
  UsePictures: number;
  UseMusic: number;
  UseMovies: number;
  UseDownloads: number;
  UseTrashBin: number;
  "@_dyn_lists": string;
}

export interface SharedVolumes {
  Enabled: number;
  UseExternalDisks: number;
  UseDVDs: number;
  UseConnectedServers: number;
  UseInversedDisks: number;
  "@_dyn_lists": string;
}

export interface TimeSync {
  Enabled: number;
  SyncInterval: number;
  KeepTimeDiff: number;
  SyncHostToGuest: number;
  SyncTimezoneDisabled: number;
  "@_dyn_lists": string;
  "@_SyncInterval_patch": string;
}

export interface TisDatabase {
  Data: string;
  "@_dyn_lists": string;
}

export interface WinMaintenance {
  Enabled: number;
  ScheduleDay: number;
  ScheduleTime: string;
  "@_dyn_lists": string;
}

export interface TravelOptions {
  Enabled: number;
  Condition: Condition;
  SavedOptions: BTConnectHistory;
  "@_dyn_lists": string;
}

export interface Condition {
  Enter: number;
  EnterBetteryThreshold: number;
  Quit: number;
  "@_dyn_lists": string;
}

export interface USBController {
  BusType: number;
  UhcEnabled: number;
  EhcEnabled: number;
  XhcEnabled: number;
  ExternalDevices: ExternalDevices;
  "@_dyn_lists": string;
  "@_UhcEnabled_patch": string;
}

export interface ExternalDevices {
  Disks: number;
  HumanInterfaces: number;
  Communication: number;
  Audio: number;
  Video: number;
  SmartCards: number;
  Printers: number;
  SmartPhones: number;
  Other: number;
  "@_dyn_lists": string;
}

export interface VirtualPrintersInfo {
  UseHostPrinters: number;
  SyncDefaultPrinter: number;
  ShowHostPrinterUI: number;
  "@_dyn_lists": string;
  "@_ShowHostPrinterUI_patch": string;
  "@_UseHostPrinters_patch": string;
}

export interface VMEncryptionInfo {
  Enabled: number;
  PluginId: string;
  Hash1: string;
  Hash2: string;
  Salt: string;
  "@_dyn_lists": string;
}

export interface VMProtectionInfo {
  Enabled: number;
  Hash1: string;
  Hash2: string;
  Hash3: string;
  Salt: string;
  ExpirationInfo: ExpirationInfo;
  "@_dyn_lists": string;
}

export interface ExpirationInfo {
  Enabled: number;
  ExpirationDate: Date;
  TrustedTimeServerUrl: string;
  Note: string;
  TimeCheckIntervalSeconds: number;
  OfflineTimeToLiveSeconds: number;
  "@_dyn_lists": string;
}
