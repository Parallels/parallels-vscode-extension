import * as uuid from "uuid";
import {formatDate} from "./helpers";

export function generateMacConfigPvs(name: string) {
  const vmUuid = uuid.v4();
  const vmStartTime = formatDate(new Date());
  return `<?xml version="1.0" encoding="UTF-8"?>
  <ParallelsVirtualMachine schemaVersion="1.0" dyn_lists="VirtualAppliance 0">
      <AppVersion>18.3.0-53605</AppVersion>
      <ValidRc>0</ValidRc>
      <Identification dyn_lists="">
        <VmUuid>{${vmUuid}}</VmUuid>
        <VmType>2</VmType>
        <SourceVmUuid>{${vmUuid}}</SourceVmUuid>
        <LinkedVmUuid></LinkedVmUuid>
        <LinkedSnapshotUuid></LinkedSnapshotUuid>
        <VmName>${name}</VmName>
        <ServerUuid>{2689848c-135b-4b92-8ced-fc177f6f6c02}</ServerUuid>
        <ServerUuidAs></ServerUuidAs>
        <LastServerUuid></LastServerUuid>
        <ServerHost></ServerHost>
        <VmLocationName></VmLocationName>
        <VmCreationDate>${vmStartTime}</VmCreationDate>
        <VmUptimeStartDateTime>${vmStartTime}</VmUptimeStartDateTime>
        <VmUptimeInSeconds>0</VmUptimeInSeconds>
      </Identification>
      <Security dyn_lists="">
        <AccessControlList dyn_lists="AccessControl"/>
        <LockedOperationsList dyn_lists="LockedOperation"/>
        <PasswordProtectedOperations dyn_lists="LockedOperation"/>
        <LockDownHash></LockDownHash>
        <Owner></Owner>
        <IsOwner>0</IsOwner>
        <AccessForOthers>0</AccessForOthers>
        <LockedSign>0</LockedSign>
      </Security>
      <Settings dyn_lists="">
        <General dyn_lists="PrevOsNumber">
            <OsType>7</OsType>
            <OsNumber>1795</OsNumber>
            <SourceOsVersion></SourceOsVersion>
            <VmDescription></VmDescription>
            <IsTemplate>0</IsTemplate>
            <CustomProperty></CustomProperty>
            <SwapDir></SwapDir>
            <VmColor>0</VmColor>
            <Profile Custom_patch="1" dyn_lists="">
              <Type>0</Type>
              <Custom>0</Custom>
           </Profile>
           <CpuRamProfile dyn_lists="">
              <Custom>0</Custom>
              <OtherCpu>0</OtherCpu>
              <OtherRam>0</OtherRam>
              <CustomCpu dyn_lists="">
                 <Number>4</Number>
                 <Auto>1</Auto>
              </CustomCpu>
              <CustomMemory dyn_lists="">
                 <RamSize>8192</RamSize>
                 <Auto>1</Auto>
              </CustomMemory>
           </CpuRamProfile>
           <AssetId></AssetId>
           <SerialNumber></SerialNumber>
           <SmbiosBiosVersion></SmbiosBiosVersion>
           <SmbiosBoardId></SmbiosBoardId>
        </General>
        <Startup AutoStart_patch="2" dyn_lists="">
           <AutoStart>0</AutoStart>
           <AutoStartDelay>0</AutoStartDelay>
           <VmStartLoginMode>0</VmStartLoginMode>
           <WindowMode>0</WindowMode>
           <StartInDetachedWindow>0</StartInDetachedWindow>
           <BootingOrder dyn_lists="BootDevice 5">
              <BootDevice dyn_lists="" id="0">
                 <Index>0</Index>
                 <Type>6</Type>
                 <BootingNumber>0</BootingNumber>
                 <InUse>1</InUse>
              </BootDevice>
              <BootDevice dyn_lists="" id="1">
                 <Index>0</Index>
                 <Type>5</Type>
                 <BootingNumber>1</BootingNumber>
                 <InUse>1</InUse>
              </BootDevice>
              <BootDevice dyn_lists="" id="2">
                 <Index>0</Index>
                 <Type>15</Type>
                 <BootingNumber>2</BootingNumber>
                 <InUse>1</InUse>
              </BootDevice>
              <BootDevice dyn_lists="" id="3">
                 <Index>0</Index>
                 <Type>3</Type>
                 <BootingNumber>3</BootingNumber>
                 <InUse>1</InUse>
              </BootDevice>
              <BootDevice dyn_lists="" id="4">
                 <Index>0</Index>
                 <Type>8</Type>
                 <BootingNumber>4</BootingNumber>
                 <InUse>0</InUse>
              </BootDevice>
           </BootingOrder>
           <AllowSelectBootDevice>0</AllowSelectBootDevice>
           <Bios EfiEnabled_patch="" dyn_lists="">
              <EfiEnabled>5</EfiEnabled>
              <EfiSecureBoot>0</EfiSecureBoot>
           </Bios>
           <ExternalDeviceSystemName></ExternalDeviceSystemName>
        </Startup>
        <Shutdown dyn_lists="" OnVmWindowClose_patch="3">
           <AutoStop>1</AutoStop>
           <OnVmWindowClose>1</OnVmWindowClose>
           <WindowOnShutdown>0</WindowOnShutdown>
           <ReclaimDiskSpace>0</ReclaimDiskSpace>
        </Shutdown>
        <SasProfile dyn_lists="">
           <Custom>0</Custom>
        </SasProfile>
        <Runtime UndoDisks_patch="1" dyn_lists="" OptimizePowerConsumptionMode_patch="1" CompactMode_patch="1" HypervisorType_patch="" StickyMouse_patch="2">
           <ForegroundPriority>1</ForegroundPriority>
           <BackgroundPriority>1</BackgroundPriority>
           <DiskCachePolicy>1</DiskCachePolicy>
           <CloseAppOnShutdown>0</CloseAppOnShutdown>
           <ActionOnStop>1</ActionOnStop>
           <DockIcon>0</DockIcon>
           <OsResolutionInFullScreen>0</OsResolutionInFullScreen>
           <FullScreen dyn_lists="CornerAction" CornerAction_patch="2">
              <UseAllDisplays>0</UseAllDisplays>
              <UseActiveCorners>0</UseActiveCorners>
              <UseNativeFullScreen>1</UseNativeFullScreen>
              <CornerAction>1</CornerAction>
              <CornerAction>0</CornerAction>
              <CornerAction>0</CornerAction>
              <CornerAction>0</CornerAction>
              <ScaleViewMode>1</ScaleViewMode>
              <EnableGammaControl>1</EnableGammaControl>
              <OptimiseForGames>0</OptimiseForGames>
              <ActivateSpacesOnClick>1</ActivateSpacesOnClick>
           </FullScreen>
           <UndoDisks>0</UndoDisks>
           <SafeMode>0</SafeMode>
           <SystemFlags></SystemFlags>
           <DisableAPIC>0</DisableAPIC>
           <OptimizePowerConsumptionMode>1</OptimizePowerConsumptionMode>
           <ShowBatteryStatus>1</ShowBatteryStatus>
           <Enabled>0</Enabled>
           <EnableAdaptiveHypervisor>0</EnableAdaptiveHypervisor>
           <UseSMBiosData>0</UseSMBiosData>
           <DisableSpeaker>1</DisableSpeaker>
           <HideBiosOnStartEnabled>0</HideBiosOnStartEnabled>
           <UseDefaultAnswers>0</UseDefaultAnswers>
           <CompactHddMask>0</CompactHddMask>
           <CompactMode>0</CompactMode>
           <DisableWin7Logo>1</DisableWin7Logo>
           <OptimizeModifiers>3</OptimizeModifiers>
           <StickyMouse>0</StickyMouse>
           <PauseOnDeactivation>0</PauseOnDeactivation>
           <FEATURES_MASK>0</FEATURES_MASK>
           <EXT_FEATURES_MASK>0</EXT_FEATURES_MASK>
           <EXT_80000001_ECX_MASK>0</EXT_80000001_ECX_MASK>
           <EXT_80000001_EDX_MASK>0</EXT_80000001_EDX_MASK>
           <EXT_80000007_EDX_MASK>0</EXT_80000007_EDX_MASK>
           <EXT_80000008_EAX>0</EXT_80000008_EAX>
           <EXT_00000007_EBX_MASK>0</EXT_00000007_EBX_MASK>
           <EXT_00000007_EDX_MASK>0</EXT_00000007_EDX_MASK>
           <EXT_0000000D_EAX_MASK>0</EXT_0000000D_EAX_MASK>
           <EXT_00000006_EAX_MASK>0</EXT_00000006_EAX_MASK>
           <CpuFeaturesMaskValid>0</CpuFeaturesMaskValid>
           <UnattendedInstallLocale></UnattendedInstallLocale>
           <UnattendedInstallEdition></UnattendedInstallEdition>
           <UnattendedEvaluationVersion>0</UnattendedEvaluationVersion>
           <HostRetinaEnabled>0</HostRetinaEnabled>
           <DebugServer dyn_lists="">
              <Port>0</Port>
              <State>0</State>
           </DebugServer>
           <HypervisorType>1</HypervisorType>
           <ResourceQuota>100</ResourceQuota>
           <NetworkBusType>0</NetworkBusType>
        </Runtime>
        <Schedule dyn_lists="">
           <SchedBasis>0</SchedBasis>
           <SchedGranularity>0</SchedGranularity>
           <SchedDayOfWeek>0</SchedDayOfWeek>
           <SchedDayOfMonth>0</SchedDayOfMonth>
           <SchedDay>0</SchedDay>
           <SchedWeek>0</SchedWeek>
           <SchedMonth>0</SchedMonth>
           <SchedStartDate>1752-01-01</SchedStartDate>
           <SchedStartTime></SchedStartTime>
           <SchedStopDate>1752-01-01</SchedStopDate>
           <SchedStopTime></SchedStopTime>
        </Schedule>
        <Tools dyn_lists="">
           <ToolsVersion></ToolsVersion>
           <BusType>0</BusType>
           <IsolatedVm>0</IsolatedVm>
           <NonAdminToolsUpgrade>1</NonAdminToolsUpgrade>
           <LockGuestOnSuspend>0</LockGuestOnSuspend>
           <SyncVmHostname>0</SyncVmHostname>
           <SyncSshIds>0</SyncSshIds>
           <Coherence ShowTaskBar_patch="1" MultiDisplay_patch="1" dyn_lists="" ExcludeDock_patch="1">
              <ShowTaskBar>1</ShowTaskBar>
              <ShowTaskBarInCoherence>0</ShowTaskBarInCoherence>
              <RelocateTaskBar>0</RelocateTaskBar>
              <GroupAllWindows>0</GroupAllWindows>
              <DoNotMinimizeToDock>0</DoNotMinimizeToDock>
              <BringToFront>0</BringToFront>
              <ExcludeDock>1</ExcludeDock>
              <MultiDisplay>1</MultiDisplay>
              <DisableDropShadow>0</DisableDropShadow>
              <AppInDock>0</AppInDock>
              <ShowWinSystrayInMacMenu>1</ShowWinSystrayInMacMenu>
              <SwitchToFullscreenOnDemand>1</SwitchToFullscreenOnDemand>
              <PauseIdleVM>0</PauseIdleVM>
              <PauseIdleVMTimeout>30</PauseIdleVMTimeout>
              <WindowAnimation>1</WindowAnimation>
           </Coherence>
           <SharedFolders dyn_lists="">
              <HostSharing dyn_lists="SharedFolder 0" MapSharedFoldersOnLetters_patch="1">
                 <Enabled>0</Enabled>
                 <ShareAllMacDisks>0</ShareAllMacDisks>
                 <ShareUserHomeDir>1</ShareUserHomeDir>
                 <MapSharedFoldersOnLetters>1</MapSharedFoldersOnLetters>
                 <UserDefinedFoldersEnabled>1</UserDefinedFoldersEnabled>
                 <SetExecBitForFiles>0</SetExecBitForFiles>
                 <VirtualLinks>1</VirtualLinks>
                 <EnableDos8dot3Names>1</EnableDos8dot3Names>
                 <SharedShortcuts>1</SharedShortcuts>
                 <SharedCloud>1</SharedCloud>
              </HostSharing>
              <GuestSharing ShareRemovableDrives_patch="1" dyn_lists="">
                 <Enabled>1</Enabled>
                 <AutoMount>1</AutoMount>
                 <AutoMountNetworkDrives>0</AutoMountNetworkDrives>
                 <EnableSpotlight>0</EnableSpotlight>
                 <AutoMountCloudDrives>1</AutoMountCloudDrives>
                 <ShareRemovableDrives>1</ShareRemovableDrives>
                 <PortNumber>0</PortNumber>
                 <AllowExec>0</AllowExec>
              </GuestSharing>
           </SharedFolders>
           <SharedProfile dyn_lists="">
              <Enabled>0</Enabled>
              <UseDesktop>1</UseDesktop>
              <UseDocuments>1</UseDocuments>
              <UsePictures>1</UsePictures>
              <UseMusic>1</UseMusic>
              <UseMovies>1</UseMovies>
              <UseDownloads>1</UseDownloads>
              <UseTrashBin>1</UseTrashBin>
           </SharedProfile>
           <SharedApplications dyn_lists="">
              <FromWinToMac>1</FromWinToMac>
              <FromMacToWin>1</FromMacToWin>
              <SmartSelect>1</SmartSelect>
              <AppInDock>2</AppInDock>
              <ShowWindowsAppInDock>0</ShowWindowsAppInDock>
              <ShowGuestNotifications>1</ShowGuestNotifications>
              <BounceDockIconWhenAppFlashes>1</BounceDockIconWhenAppFlashes>
              <WebApplications dyn_lists="">
                 <WebBrowser>0</WebBrowser>
                 <EmailClient>0</EmailClient>
                 <FtpClient>0</FtpClient>
                 <Newsgroups>0</Newsgroups>
                 <Rss>0</Rss>
                 <RemoteAccess>0</RemoteAccess>
              </WebApplications>
              <IconGroupingEnabled>1</IconGroupingEnabled>
              <DisableRecentDocs>0</DisableRecentDocs>
              <StoreInternetPasswordsInOSXKeychain>0</StoreInternetPasswordsInOSXKeychain>
           </SharedApplications>
           <AutoUpdate dyn_lists="">
              <Enabled>1</Enabled>
           </AutoUpdate>
           <ClipboardSync Enabled_patch="1" dyn_lists="">
              <Enabled>1</Enabled>
              <PreserveTextFormatting>1</PreserveTextFormatting>
           </ClipboardSync>
           <DragAndDrop Enabled_patch="1" dyn_lists="">
              <Enabled>1</Enabled>
           </DragAndDrop>
           <KeyboardLayoutSync dyn_lists="">
              <Enabled>1</Enabled>
           </KeyboardLayoutSync>
           <MouseSync dyn_lists="">
              <Enabled>1</Enabled>
           </MouseSync>
           <MouseVtdSync dyn_lists="">
              <Enabled>1</Enabled>
           </MouseVtdSync>
           <SmartMouse dyn_lists="">
              <Enabled>1</Enabled>
           </SmartMouse>
           <SmoothScrolling dyn_lists="">
              <Enabled>1</Enabled>
           </SmoothScrolling>
           <TimeSync SyncInterval_patch="1" dyn_lists="">
              <Enabled>1</Enabled>
              <SyncInterval>60</SyncInterval>
              <KeepTimeDiff>0</KeepTimeDiff>
              <SyncHostToGuest>0</SyncHostToGuest>
              <SyncTimezoneDisabled>0</SyncTimezoneDisabled>
           </TimeSync>
           <TisDatabase dyn_lists="">
              <Data></Data>
           </TisDatabase>
           <Modality Opacity_patch="" dyn_lists="" StayOnTop_patch="">
              <Opacity>0.5</Opacity>
              <StayOnTop>1</StayOnTop>
              <CaptureMouseClicks>1</CaptureMouseClicks>
              <UseWhenAppInBackground>1</UseWhenAppInBackground>
              <ShowOnAllSpaces>1</ShowOnAllSpaces>
           </Modality>
           <SharedVolumes dyn_lists="">
              <Enabled>1</Enabled>
              <UseExternalDisks>1</UseExternalDisks>
              <UseDVDs>1</UseDVDs>
              <UseConnectedServers>1</UseConnectedServers>
              <UseInversedDisks>0</UseInversedDisks>
           </SharedVolumes>
           <Gestures Enabled_patch="1" dyn_lists="">
              <Enabled>1</Enabled>
              <OneFingerSwipe>0</OneFingerSwipe>
           </Gestures>
           <RemoteControl dyn_lists="">
              <Enabled>1</Enabled>
           </RemoteControl>
           <LocationProvider dyn_lists="">
              <Enabled>1</Enabled>
           </LocationProvider>
           <AutoSyncOSType dyn_lists="">
              <Enabled>1</Enabled>
           </AutoSyncOSType>
           <WinMaintenance dyn_lists="">
              <Enabled>0</Enabled>
              <ScheduleDay>9</ScheduleDay>
              <ScheduleTime>00:00:00</ScheduleTime>
           </WinMaintenance>
           <DevelopOptions dyn_lists="" ShowInMenu_patch="1">
              <ShowInMenu>0</ShowInMenu>
           </DevelopOptions>
           <DiskSpaceOptimization dyn_lists="">
              <SyncFreeSpaceFromHost>0</SyncFreeSpaceFromHost>
           </DiskSpaceOptimization>
        </Tools>
        <Autoprotect dyn_lists="" Period_patch="1">
           <Enabled>0</Enabled>
           <Period>86400</Period>
           <TotalSnapshots>3</TotalSnapshots>
           <Schema>2</Schema>
           <NotifyBeforeCreation>1</NotifyBeforeCreation>
        </Autoprotect>
        <AutoCompress Enabled_patch="1" dyn_lists="">
           <Enabled>0</Enabled>
           <Period>86400</Period>
           <FreeDiskSpaceRatio>50</FreeDiskSpaceRatio>
        </AutoCompress>
        <GlobalNetwork dyn_lists="DnsIPAddress SearchDomain">
           <HostName></HostName>
           <DefaultGateway></DefaultGateway>
           <DefaultGatewayIPv6></DefaultGatewayIPv6>
           <AutoApplyIpOnly>0</AutoApplyIpOnly>
        </GlobalNetwork>
        <VmEncryptionInfo dyn_lists="">
           <Enabled>0</Enabled>
           <PluginId></PluginId>
           <Hash1></Hash1>
           <Hash2></Hash2>
           <Salt></Salt>
        </VmEncryptionInfo>
        <VmProtectionInfo dyn_lists="">
           <Enabled>0</Enabled>
           <Hash1></Hash1>
           <Hash2></Hash2>
           <Hash3></Hash3>
           <Salt></Salt>
           <ExpirationInfo dyn_lists="">
              <Enabled>0</Enabled>
              <ExpirationDate>1752-01-01 00:00:00</ExpirationDate>
              <TrustedTimeServerUrl>https://parallels.com</TrustedTimeServerUrl>
              <Note></Note>
              <TimeCheckIntervalSeconds>1800</TimeCheckIntervalSeconds>
              <OfflineTimeToLiveSeconds>864000</OfflineTimeToLiveSeconds>
           </ExpirationInfo>
        </VmProtectionInfo>
        <SharedCamera Enabled_patch="1" dyn_lists="">
           <Enabled>1</Enabled>
        </SharedCamera>
        <SharedCCID Enabled_patch="" dyn_lists="">
           <Enabled>0</Enabled>
        </SharedCCID>
        <Keyboard dyn_lists="">
           <HardwareLayout>0</HardwareLayout>
        </Keyboard>
        <VirtualPrintersInfo dyn_lists="" ShowHostPrinterUI_patch="1" UseHostPrinters_patch="1">
           <UseHostPrinters>0</UseHostPrinters>
           <SyncDefaultPrinter>0</SyncDefaultPrinter>
           <ShowHostPrinterUI>0</ShowHostPrinterUI>
        </VirtualPrintersInfo>
        <SharedBluetooth Enabled_patch="" dyn_lists="">
           <Enabled>0</Enabled>
        </SharedBluetooth>
        <SharedGamepad dyn_lists="">
           <Enabled>1</Enabled>
        </SharedGamepad>
        <LockDown dyn_lists="">
           <Hash></Hash>
        </LockDown>
        <UsbController dyn_lists="" UhcEnabled_patch="1">
           <BusType>0</BusType>
           <UhcEnabled>0</UhcEnabled>
           <EhcEnabled>1</EhcEnabled>
           <XhcEnabled>1</XhcEnabled>
           <ExternalDevices dyn_lists="">
              <Disks>1</Disks>
              <HumanInterfaces>1</HumanInterfaces>
              <Communication>1</Communication>
              <Audio>1</Audio>
              <Video>1</Video>
              <SmartCards>1</SmartCards>
              <Printers>1</Printers>
              <SmartPhones>1</SmartPhones>
              <Other>1</Other>
           </ExternalDevices>
        </UsbController>
        <OnlineCompact dyn_lists="" Mode_patch="">
           <Mode>0</Mode>
        </OnlineCompact>
        <TravelOptions dyn_lists="">
           <Enabled>0</Enabled>
           <Condition dyn_lists="">
              <Enter>0</Enter>
              <EnterBetteryThreshold>30</EnterBetteryThreshold>
              <Quit>0</Quit>
           </Condition>
           <SavedOptions dyn_lists="PauseIdleVM 0 AdaptiveHV 0 OptimizePower 0 AutoprotectOptions 0 NetAdapter 0"/>
        </TravelOptions>
        <ArchivingOptions dyn_lists="">
           <Enabled>0</Enabled>
        </ArchivingOptions>
        <PackingOptions dyn_lists="">
           <Direction>0</Direction>
           <Progress>0</Progress>
        </PackingOptions>
     </Settings>
     <Hardware dyn_lists="Fdd 0 CdRom 1 Hdd 1 Serial 0 Parallel 0 Printer 0 NetworkAdapter 1 Sound 1 USB 1 PciVideoAdapter 0 GenericDevice 0 GenericPciDevice 0 GenericScsiDevice 0 GenericNvmeDevice 0" NetworkAdapter_patch="1">
        <Cpu AutoCountEnabled_patch="1" dyn_lists="" EnableVTxSupport_patch="1">
           <Number>4</Number>
           <Mode>0</Mode>
           <Type>1</Type>
           <AutoCountEnabled>1</AutoCountEnabled>
           <AccelerationLevel>2</AccelerationLevel>
           <EnableVTxSupport>1</EnableVTxSupport>
           <EnableHotplug>0</EnableHotplug>
           <VirtualizedHV>0</VirtualizedHV>
           <VirtualizePMU>0</VirtualizePMU>
        </Cpu>
        <Chipset Version_patch="3" dyn_lists="">
           <Type>2</Type>
           <Version>2</Version>
        </Chipset>
        <Clock dyn_lists="">
           <TimeShift>0</TimeShift>
        </Clock>
        <Memory ExtendedMemoryLimits_patch="1" dyn_lists="" RamAutoSizeEnabled_patch="1">
           <RAM>8192</RAM>
           <RamAutoSizeEnabled>1</RamAutoSizeEnabled>
           <EnableHotplug>0</EnableHotplug>
           <HostMemQuotaMin>128</HostMemQuotaMin>
           <HostMemQuotaMax>4294967295</HostMemQuotaMax>
           <HostMemQuotaPriority>50</HostMemQuotaPriority>
           <AutoQuota>1</AutoQuota>
           <MaxBalloonSize>70</MaxBalloonSize>
           <ExtendedMemoryLimits>0</ExtendedMemoryLimits>
        </Memory>
        <Video NativeScalingInGuest_patch="" ApertureOnlyCapable_patch="2" dyn_lists="" VideoMemorySize_patch="1">
           <Enabled>1</Enabled>
           <Type>0</Type>
           <VirtIOBusType>0</VirtIOBusType>
           <VideoMemorySize>0</VideoMemorySize>
           <EnableDirectXShaders>1</EnableDirectXShaders>
           <ScreenResolutions dyn_lists="ScreenResolution 0 DynamicResolution 0">
              <Enabled>0</Enabled>
           </ScreenResolutions>
           <Enable3DAcceleration>1</Enable3DAcceleration>
           <EnableVSync>1</EnableVSync>
           <MaxDisplays>0</MaxDisplays>
           <EnableHiResDrawing>0</EnableHiResDrawing>
           <UseHiResInGuest>1</UseHiResInGuest>
           <HostScaleFactor>0</HostScaleFactor>
           <NativeScalingInGuest>0</NativeScalingInGuest>
           <ApertureOnlyCapable>1</ApertureOnlyCapable>
        </Video>
        <HibernateState dyn_lists="">
           <ConfigDirty>1</ConfigDirty>
           <SMapType>0</SMapType>
           <HardwareSignature>0</HardwareSignature>
           <ShutdownReason>-1</ShutdownReason>
           <LongReset>0</LongReset>
           <ServerUuid></ServerUuid>
           <CpuFeatures dyn_lists="">
              <FEATURES_MASK>0</FEATURES_MASK>
              <EXT_FEATURES_MASK>0</EXT_FEATURES_MASK>
              <EXT_80000001_ECX_MASK>0</EXT_80000001_ECX_MASK>
              <EXT_80000001_EDX_MASK>0</EXT_80000001_EDX_MASK>
              <EXT_80000007_EDX_MASK>0</EXT_80000007_EDX_MASK>
              <EXT_80000008_EAX>0</EXT_80000008_EAX>
              <EXT_00000007_EBX_MASK>0</EXT_00000007_EBX_MASK>
              <EXT_00000007_EDX_MASK>0</EXT_00000007_EDX_MASK>
              <EXT_0000000D_EAX_MASK>0</EXT_0000000D_EAX_MASK>
              <EXT_00000006_EAX_MASK>0</EXT_00000006_EAX_MASK>
              <CpuFeaturesMaskValid>0</CpuFeaturesMaskValid>
           </CpuFeatures>
        </HibernateState>
        <VirtIOSerial dyn_lists="">
           <ToolgatePort>0</ToolgatePort>
           <LoopbackPort>0</LoopbackPort>
        </VirtIOSerial>
        <CdRom dyn_lists="" id="0">
           <Index>0</Index>
           <Enabled>1</Enabled>
           <Connected>0</Connected>
           <EmulatedType>1</EmulatedType>
           <SystemName></SystemName>
           <UserFriendlyName></UserFriendlyName>
           <Remote>0</Remote>
           <InterfaceType>2</InterfaceType>
           <StackIndex>1</StackIndex>
           <Passthrough>1</Passthrough>
           <SubType>0</SubType>
           <DeviceDescription></DeviceDescription>
        </CdRom>
        <Hdd dyn_lists="Partition 0" id="0">
           <Uuid>{f0c6ac96-dccb-4b2d-8a4f-3576bcca9f56}</Uuid>
           <Index>0</Index>
           <Enabled>1</Enabled>
           <Connected>1</Connected>
           <EmulatedType>1</EmulatedType>
           <SystemName>harddisk.hdd</SystemName>
           <UserFriendlyName>harddisk.hdd</UserFriendlyName>
           <Remote>0</Remote>
           <InterfaceType>2</InterfaceType>
           <StackIndex>0</StackIndex>
           <DiskType>1</DiskType>
           <Size>262144</Size>
           <SizeOnDisk>0</SizeOnDisk>
           <Passthrough>0</Passthrough>
           <SubType>0</SubType>
           <Splitted>0</Splitted>
           <DiskVersion>2</DiskVersion>
           <CompatLevel></CompatLevel>
           <DeviceDescription></DeviceDescription>
           <AutoCompressEnabled>1</AutoCompressEnabled>
           <OnlineCompactMode>0</OnlineCompactMode>
        </Hdd>
        <NetworkAdapter dyn_lists="NetAddress DnsIPAddress SearchDomain" AdapterType_patch="1" id="0">
           <Index>0</Index>
           <Enabled>1</Enabled>
           <Connected>1</Connected>
           <EmulatedType>1</EmulatedType>
           <SystemName>eth0</SystemName>
           <UserFriendlyName>eth0</UserFriendlyName>
           <Remote>0</Remote>
           <AdapterNumber>-1</AdapterNumber>
           <AdapterName>Default Adapter</AdapterName>
           <MAC>001C42F11C90</MAC>
           <VMNetUuid></VMNetUuid>
           <HostMAC>001C4258BFDE</HostMAC>
           <HostInterfaceName></HostInterfaceName>
           <Router>0</Router>
           <DHCPUseHostMac>2</DHCPUseHostMac>
           <ForceHostMacAddress>0</ForceHostMacAddress>
           <AdapterType>3</AdapterType>
           <StaticAddress>0</StaticAddress>
           <PktFilter dyn_lists="">
              <PreventPromisc>1</PreventPromisc>
              <PreventMacSpoof>1</PreventMacSpoof>
              <PreventIpSpoof>1</PreventIpSpoof>
           </PktFilter>
           <LinkRateLimit dyn_lists="">
              <Enable>0</Enable>
              <TxBps>0</TxBps>
              <GUITxScale>1</GUITxScale>
              <RxBps>0</RxBps>
              <GUIRxScale>1</GUIRxScale>
              <TxLossPpm>0</TxLossPpm>
              <RxLossPpm>0</RxLossPpm>
              <TxDelayMs>0</TxDelayMs>
              <RxDelayMs>0</RxDelayMs>
           </LinkRateLimit>
           <AutoApply>0</AutoApply>
           <ConfigureWithDhcp>0</ConfigureWithDhcp>
           <DefaultGateway></DefaultGateway>
           <ConfigureWithDhcpIPv6>0</ConfigureWithDhcpIPv6>
           <DefaultGatewayIPv6></DefaultGatewayIPv6>
           <NetProfile dyn_lists="">
              <Type>0</Type>
              <Custom>1</Custom>
           </NetProfile>
           <DeviceDescription></DeviceDescription>
        </NetworkAdapter>
        <Sound AdvancedType_patch="101" Mixer_patch="1" dyn_lists="" Output_patch="1" id="0">
           <Enabled>1</Enabled>
           <Connected>1</Connected>
           <BusType>0</BusType>
           <EmulatedType>0</EmulatedType>
           <AdvancedType>2</AdvancedType>
           <HDAPatchApplied>0</HDAPatchApplied>
           <SystemName></SystemName>
           <UserFriendlyName></UserFriendlyName>
           <Remote>0</Remote>
           <VolumeSync>1</VolumeSync>
           <Output>Default</Output>
           <Mixer>Default</Mixer>
           <Channel>0</Channel>
           <AEC>0</AEC>
           <SoundInputs dyn_lists="Sound 1">
              <Sound AdvancedType_patch="" Mixer_patch="1" dyn_lists="" Output_patch="1" id="0">
                 <Enabled>0</Enabled>
                 <Connected>1</Connected>
                 <BusType>0</BusType>
                 <EmulatedType>0</EmulatedType>
                 <AdvancedType>0</AdvancedType>
                 <HDAPatchApplied>0</HDAPatchApplied>
                 <SystemName>0|1|7a4342575153757fe359779b26641a7d8553d9a3</SystemName>
                 <UserFriendlyName>Default</UserFriendlyName>
                 <Remote>0</Remote>
                 <VolumeSync>1</VolumeSync>
                 <Output>Default</Output>
                 <Mixer>Default</Mixer>
                 <Channel>0</Channel>
                 <AEC>0</AEC>
                 <SoundInputs dyn_lists="Sound 0"/>
                 <SoundOutputs dyn_lists="Sound 0"/>
                 <DeviceDescription></DeviceDescription>
              </Sound>
           </SoundInputs>
           <SoundOutputs dyn_lists="Sound 1">
              <Sound AdvancedType_patch="" Mixer_patch="1" dyn_lists="" Output_patch="1" id="0">
                 <Enabled>0</Enabled>
                 <Connected>1</Connected>
                 <BusType>0</BusType>
                 <EmulatedType>0</EmulatedType>
                 <AdvancedType>0</AdvancedType>
                 <HDAPatchApplied>0</HDAPatchApplied>
                 <SystemName>1|1|dda47b44f2614b04cbaa649ea54213d4e451709e</SystemName>
                 <UserFriendlyName>Default</UserFriendlyName>
                 <Remote>0</Remote>
                 <VolumeSync>1</VolumeSync>
                 <Output>Default</Output>
                 <Mixer>Default</Mixer>
                 <Channel>0</Channel>
                 <AEC>0</AEC>
                 <SoundInputs dyn_lists="Sound 0"/>
                 <SoundOutputs dyn_lists="Sound 0"/>
                 <DeviceDescription></DeviceDescription>
              </Sound>
           </SoundOutputs>
           <DeviceDescription></DeviceDescription>
        </Sound>
        <USB dyn_lists="" id="0">
           <Enabled>1</Enabled>
           <Connected>1</Connected>
           <EmulatedType>0</EmulatedType>
           <SystemName></SystemName>
           <UserFriendlyName></UserFriendlyName>
           <Remote>0</Remote>
           <AutoConnect>0</AutoConnect>
           <ConnectReason>0</ConnectReason>
           <DeviceDescription></DeviceDescription>
           <UsbType>0</UsbType>
        </USB>
        <UsbConnectHistory dyn_lists="USBPort 0"/>
        <BTConnectHistory dyn_lists="BTDevConnect 0"/>
        <TpmChip dyn_lists="" Type_patch="1">
           <Type>0</Type>
           <Policy>3</Policy>
        </TpmChip>
     </Hardware>
     <InstalledSoftware>0</InstalledSoftware>
  </ParallelsVirtualMachine>`;
}
