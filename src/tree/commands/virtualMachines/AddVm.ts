import {NewVirtualMachineRequiredVariables} from "../../../models/parallels/NewVirtualMachineRequiredVariables";
import * as vscode from "vscode";
import * as path from "path";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {generateHtml} from "../../../views/header.html";
import {CreateMachineService} from "../../../services/createMachineService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {NewVirtualMachineRequest} from "../../../models/parallels/NewVirtualMachineRequest";
import {LogService} from "../../../services/logService";
import {Provider} from "../../../ioc/provider";
import {VirtualMachineCommand} from "../BaseCommand";
import {PackerService} from "../../../services/packerService";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { ShowErrorMessage } from "../../../helpers/error";

const registerAddVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeAddVm, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "ADD_VM_COMMAND_CLICK");

      if (!(await PackerService.canAddVms())) {
        ShowErrorMessage(TELEMETRY_VM, "There are some required dependencies missing. Please install them and try again.");
        return;
      }

      LogService.info("Add VM command called", "AddVmCommand");
      LogService.sendTelemetryEvent(TelemetryEventIds.AddNewMachine);
      const svc = new CreateMachineService(context);
      const operatingSystemContent = await svc.get();

      const osData = `[${operatingSystemContent.map(os => os.toString()).join(",")}]`;

      LogService.info("Creating webview", "AddVmCommand");
      const panel = vscode.window.createWebviewPanel(
        "create_vm", // Identifies the type of the webview. Used internally
        "Create VM", // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
          // Enable scripts in the webview
          enableScripts: true
        } // Webview options. More on these later.
      );

      const updateWebview = () => {
        panel.iconPath = {
          light: vscode.Uri.file(path.join(__filename, "..", "..", "img", "light", `virtual_machine.svg`)),
          dark: vscode.Uri.file(path.join(__filename, "..", "..", "img", "dark", `virtual_machine.svg`))
        };

        panel.webview.html = getWebviewContent(context, panel, osData);
      };

      panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
          case "setFlag": {
            const cmd = JSON.parse(message.text);
            vscode.window.showInformationMessage(message.text);
            panel.webview.postMessage({command: "updateFlag", text: cmd.value});
            return;
          }
          case "vmNameChange": {
            const config = Provider.getConfiguration();
            const exists = config.allMachines.find(m => m.Name === message.text);
            if (exists) {
              panel.webview.postMessage({command: "vmNameExists", text: "true"});
            } else {
              panel.webview.postMessage({command: "vmNameExists", text: "false"});
            }
            break;
          }
          case "createVm": {
            const cmd = JSON.parse(message.text);
            let name = cmd.name;
            if (cmd.name === "" || cmd.name === undefined || cmd.name === null) {
              name = "New VM";
            }
            const request: NewVirtualMachineRequest = {
              name: name,
              os: cmd.os,
              platform: cmd.platform,
              distro: cmd.distro,
              image: cmd.image,
              isoChecksum: cmd.isoChecksum,
              isoUrl: cmd.isoUrl,
              requiredVariables: [],
              specs: {
                cpus: cmd.specs?.cpu ?? "2",
                memory: cmd.specs?.memory ?? "2048",
                disk: cmd.specs?.disk ?? "65536",
                username: cmd.specs?.username ?? "",
                password: cmd.specs?.password ?? ""
              },
              flags: cmd.allowedFlags,
              addons: []
            };

            cmd.addons.forEach((a: any) => {
              if (a.deploy) {
                request.addons.push(a.id);
              }
            });
            if (cmd.requiredVariables && cmd.requiredVariables.length > 0) {
              cmd.requiredVariables.forEach((v: any) => {
                const variable: NewVirtualMachineRequiredVariables = {
                  key: v.id,
                  value: v.value
                };
                request.requiredVariables.push(variable);
              });
            }
            const TELEMETRY_OPERATION = `${request.os.toUpperCase()}_${request.platform.toUpperCase()}_${request.distro.toUpperCase()}_${request.image.toUpperCase()}`;
            telemetry.sendOperationEvent(TELEMETRY_VM, `CREATE_${TELEMETRY_OPERATION}`);
            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: `Creating VM ${request.name}`
              },
              async progress => {
                panel.dispose();
                await svc
                  .createVm(request)
                  .then(
                    value => {
                      if (value) {
                        ParallelsDesktopService.getVms().then(() => {
                          telemetry.sendOperationEvent(TELEMETRY_VM, `SUCCESSFULLY_CREATED_${TELEMETRY_OPERATION}`);
                          LogService.sendTelemetryEvent(TelemetryEventIds.AddNewMachineCompleted);
                          LogService.info(`VM ${request.name} created`, "AddVmCommand");
                          provider.refresh();
                          vscode.window.showInformationMessage(`VM ${request.name} created successfully`);
                          return;
                        });
                      } else {
                        LogService.info(`VM ${request.name} not created`, "AddVmCommand");
                        ShowErrorMessage(TELEMETRY_VM, `VM ${request.name} not created`);
                      }
                    },
                    err => {
                      telemetry.sendOperationEvent(TELEMETRY_VM, `FAILED_TO_CREATE_${TELEMETRY_OPERATION}`);
                      LogService.sendTelemetryEvent(TelemetryEventIds.AddNewMachineFailed);
                      LogService.error(`Error creating VM: ${err}`, "AddVmCommand", true);
                      ShowErrorMessage(TELEMETRY_VM, `Error creating VM: ${err}`);
                    }
                  )
                  .catch(err => {
                    telemetry.sendOperationEvent(TELEMETRY_VM, `FAILED_TO_CREATE_${TELEMETRY_OPERATION}`);
                    LogService.sendTelemetryEvent(TelemetryEventIds.AddNewMachineFailed);
                    LogService.error(`Error creating VM: ${err}`, "AddVmCommand", true);
                    ShowErrorMessage(TELEMETRY_VM, `Error creating VM: ${err}`);
                  });
                return;
              }
            );
            return;
          }
        }
      });

      updateWebview();
      // }
    })
  );
};

export const AddVmCommand: VirtualMachineCommand = {
  register: registerAddVmCommand
};

const getWebviewContent = (context: vscode.ExtensionContext, panel: vscode.WebviewPanel, osData: string) => {
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media", "vscode.css")));
  const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media")));
  const config = Provider.getConfiguration();
  const cpus = config.hardwareInfo?.SPHardwareDataType[0].number_processors ?? "2";
  const memory = config.hardwareInfo?.SPHardwareDataType[0].physical_memory ?? "2048";

  const script = `<script>
  window.addEventListener('message', event => {
    const message = event.data;
    const isValidVmNameInput = document.getElementById('isValidVmName')
    switch (message.command) {
        case 'vmNameExists':
          if (message.text === 'true') {
            console.log('true');
            isValidVmNameInput.value = 'false';
            isValidVmNameInput.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            console.log('false');
            isValidVmNameInput.value = 'true';
            isValidVmNameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
    }
});
  </script>`;
  const html = `
    <div class="content">
      <div
        id="data"
        class="page-body mt-2"
        x-data="{
        isPosting: false,
        version: '${config.parallelsDesktopVersion}',
        host: {
          cpu: '${cpus}',
          memory: '${memory}',
        },
        itemData: {
          os: 'undefined',
          platform: 'undefined',
          distro: 'undefined',
          image: 'undefined',
          name: 'undefined',
          description: undefined,
          isoUrl: 'undefined',
          isoHelp: undefined,
          isoChecksum: 'undefined',
          requireIsoDownload: false,
          allowMachineSpecs: false,
          allowUserOverride: false,
          allowAddons: false,
          isValidVmName: 'true',
          requiredVariables: [],
          allowedFlags: [],
          specs: {
            cpu: 2,
            memory: 2048,
            disk: 65536,
            username: 'parallels',
            password: 'parallels',
          },
          options: {
            startHeadless: false,
            generateVagrantBox: false,
          },
          defaults: {
            specs: {
              cpu: 2,
              memory: 2048,
              diskSize: 65536,
            },
            user: undefined,
          },
          addons: []
        },
        getAllOs() {
          return this.options
        },
        getVersion() {
          return this.version
        },
        getHostSpecs() {
          return 'Host - ' + this.host.cpu + ' CPU, ' + this.host.memory + ' RAM'
        },
        getAllOsPlatforms() {
          if (this.itemData.os === 'undefined') return []
          return this.options.find(o => o.id === this.itemData.os)?.platforms ?? []
        },
        getAllOsPlatformsDistros() {
          if (this.itemData.os === 'undefined' &amp;&amp; this.itemData.platform ==='undefined') return []
          return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros ?? []
        },
        getAllOsPlatformsDistrosImages() {
          if(this.itemData.os === 'linux') {
            if (this.itemData.os === 'undefined' &amp;&amp; this.itemData.platform ==='undefined' &amp;&amp; this.itemData.distro === 'undefined') return []
            return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros.find(d => d.id === this.itemData.distro)?.images ?? []  
          } else {
            if (this.itemData.os === 'undefined' &amp;&amp; this.itemData.platform ==='undefined') return []
            return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.images ?? []  
          }
        },
        getAllOsPlatformsDistrosImageAddons() {
          const img = this.getImage();
          if (img === undefined) return []
          return img.addons ?? []
        },
        getImageFlags() {
          const img = this.getImage();
          if (img === undefined) return []
          return img.allowedFlags ?? []
        },
        getImage() {
          if (this.itemData.os === 'undefined' || this.itemData.image === 'undefined') return undefined
          if(this.itemData.os === 'linux') {
            if (this.itemData.os === 'undefined' &amp;&amp; this.itemData.platform ==='undefined' &amp;&amp; this.itemData.distro === 'undefined') return []
            return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros.find(d => d.id === this.itemData.distro)?.images.find(i => i.id === this.itemData.image) ?? undefined
          } else {
            if (this.itemData.os === 'undefined' &amp;&amp; this.itemData.platform ==='undefined') return []
            return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.images.find(i => i.id === this.itemData.image) ?? undefined
          }
        },
        onOsChange() {
          this.itemData.platform = 'undefined'; 
          this.itemData.distro = 'undefined'; 
          this.itemData.image = 'undefined'; 
          this.itemData.requireIsoDownload = false;
          this.itemData.allowMachineSpecs = false;
          this.itemData.allowUserOverride = false;
          this.itemData.allowAddons = false;
          if (this.itemData.os !== 'undefined' &amp;&amp; !this.showPlatform()) { 
            this.itemData.platform = (this.options.find(o => o.id === this.itemData.os)?.platforms ?? [])[0].id
          } if (this.itemData.os !== 'undefined' &amp;&amp; this.showPlatform()) {
            this.itemData.platform = 'undefined';
          }
          this.itemData.defaults = {
            specs: {
              cpu: 2,
              memory: 2048,
              diskSize: 65536,
            },
            user: undefined,
          };
          this.itemData.addons = [];
          this.itemData.isoUrl = '';
          this.itemData.requiredVariables = [];
          this.itemData.isoChecksum = '';
          this.itemData.isoHelp = undefined;
          this.itemData.description = undefined;
        },
        onPlatformDropdownChange() {
          this.itemData.distro = 'undefined'; 
          this.itemData.image = 'undefined';
          this.itemData.requiredVariables = [];
          this.itemData.requireIsoDownload = false;
          this.itemData.allowMachineSpecs = false;
          this.itemData.allowUserOverride = false;
          this.itemData.allowAddons = false;
          this.itemData.defaults = {
            specs: {
              cpu: 2,
              memory: 2048,
              diskSize: 65536,
            },
            user: undefined,
          };
          this.itemData.addons = [];
          this.itemData.isoUrl = '';
          this.itemData.isoChecksum = '';
          this.itemData.isoHelp = undefined;
          this.itemData.description = undefined;
        },
        onDistroDropdownChange() {
          this.itemData.image = 'undefined'; 
          this.itemData.requireIsoDownload = false;
          this.itemData.allowMachineSpecs = false;
          this.itemData.allowUserOverride = false;
          this.itemData.allowAddons = false;
          this.itemData.requiredVariables = [];
          this.itemData.defaults = {
            specs: {
              cpu: 2,
              memory: 2048,
              diskSize: 65536,
            },
            user: undefined,
          };
          this.itemData.addons = [];
          this.itemData.isoUrl = '';
          this.itemData.isoChecksum = '';
          this.itemData.isoHelp = undefined;
          this.itemData.description = undefined;
        },
        onImageDropdownChange() {
          let img = this.getAllOsPlatformsDistrosImages()?.find(i => i.id === this.itemData.image);
          this.itemData.name = img?.name ?? ''
          this.itemData.requireIsoDownload = img.requireIsoDownload ?? false;
          this.itemData.allowMachineSpecs = img.allowMachineSpecs ?? false;
          this.itemData.allowUserOverride = img.allowUserOverride ?? false;
          this.itemData.allowAddons = img.allowAddons ?? false;
          this.itemData.isoUrl = img.isoUrl ?? '';
          this.itemData.isoChecksum = img.isoChecksum ?? '';
          if(img.isoHelp) {
            this.itemData.isoHelp = img.isoHelp;
          }
          if(img.defaults?.specs) {
            this.itemData.specs.cpu = img.defaults.specs.cpus ?? this.itemData.defaults.specs.cpus;
            this.itemData.specs.memory = img.defaults.specs.memory ?? this.itemData.defaults.specs.memory;
            this.itemData.specs.diskSize = img.defaults.specs.diskSize ?? this.itemData.defaults.specs.diskSize;
          }
          if(img.defaults?.user) {
            this.itemData.defaults.user = {};
            this.itemData.defaults.user.username = img.defaults.user.username ?? this.itemData.defaults.user.username;
            this.itemData.defaults.user.password = img.defaults.user.password ?? this.itemData.defaults.user.password;
          }
          if(img.requiredVariables) {
            this.itemData.requiredVariables = img.requiredVariables;
          }
          this.itemData.description = img.description ?? undefined;
          this.checkVmName(this.itemData.name);
        },
        showPlatform() {
          if (this.itemData.os === 'undefined') return true
          return this.itemData.os !== 'undefined' &amp;&amp; (this.options.find(o => o.id === this.itemData.os)?.platforms ?? []).length > 1
        },
        getImageType() {
          return this.getAllOsPlatformsDistrosImages()?.find(i => i.id === this.itemData.image)?.type ?? ''
        },
        showPlatformDropdown() {
          return this.itemData.os !== 'undefined' &amp;&amp; (this.options.find(o => o.id === this.itemData.os)?.platforms ?? []).length > 1
        },
        showDistroDropdown() {
          return  this.itemData.os === 'linux' &amp;&amp; this.itemData.platform !== 'undefined';
        },
        showImageDropdown() {
          if (this.itemData.os === 'linux') {
            return this.itemData.os === 'linux' &amp;&amp; this.itemData.platform !== 'undefined' &amp;&amp; this.itemData.distro !== 'undefined'
          } else {
            return  this.itemData.os !== 'undefined' &amp;&amp; this.itemData.platform !== 'undefined';
          }
        },
        showMachineSpecs() {
          if(this.itemData.allowMachineSpecs === 'undefined') return this.itemData.image !== 'undefined'
          return this.itemData.allowMachineSpecs
        },
        showMachineOptions() {
          const flags = this.getImageFlags();
          if (flags === undefined) return false
          return flags.length > 0
        },
        showMachineAddons() {
          const img = this.getImage();
          if (img === undefined) return false
          if (img.allowAddons === false) return false
          if (img.type === 'internal' || img.type === 'iso' ) return false
          return img.addons.length > 0
        },
        showRequiredVariables() {
          const img = this.getImage();
          return img.requiredVariables.length > 0
        },
        showSaveButton() {
          const img = this.getImage();
          return !img === undefined;
        },
        getDefaultPlatform() {
          if (this.itemData.os === 'undefined') return 'undefined'
          return (this.options.find(o => o.id === this.itemData.os)?.platforms ?? [])[0].id
        },
        addImageAddon(id, state) {
          console.log('addImageAddon', id, state)
          if (this.itemData.addons.length === 0) {
            console.log('addImageAddon', id, state, 'pushing first')
            this.itemData.addons.push({id: id, deploy: state});
            return;
          }
    
          let found = false
          for (let i = 0; i < this.itemData.addons.length; i++) {
            if (this.itemData.addons[i].id === id) {
              if (!state){
                this.itemData.addons.splice(i, 1);
              }
              found = true;
              return;
            }
          }
          if (!found) {
            this.itemData.addons.push({id: id, deploy: state});
          }
        },
        addImageFlags(id, state) {
          if (id === 'generateVagrantBox') {
            if(state) {
              this.itemData.defaults.user.username = 'vagrant';
              this.itemData.defaults.user.password = 'vagrant';
            } else {
              const img = this.getImage();
              this.itemData.defaults.user.username = img.defaults?.user?.username ?? 'parallels';
              this.itemData.defaults.user.password = img.defaults?.user?.password ?? 'parallels';
            }
          }
          if (this.itemData.allowedFlags.length === 0) {
            this.itemData.allowedFlags.push({code: id, enabled: state});
            return;
          }
    
          let found = false
          for (let i = 0; i < this.itemData.allowedFlags.length; i++) {
            if (this.itemData.allowedFlags[i].code === id) {
              if (!state){
                this.itemData.allowedFlags.splice(i, 1);
              }
              found = true;
              return;
            }
          }
                      
          if (!found) {
            this.itemData.allowedFlags.push({code: id, enabled: state});
          }

        },
        validatePostButton() {
          let result = true;
          if(!this.itemData) {
            result = false
          }
          if(result && this.itemData.isValidVmName !== 'true') {
            result = false
          }
          if(result && this.itemData.image === 'undefined') {
            result = false
          }
          if(result && this.itemData.requireIsoDownload) {
            if(this.itemData.isoUrl === '' ||
              this.itemData.isoChecksum === '') {
              result = false;
            }
          }
          if(result && this.itemData.requiredVariables.length > 0) {
            for (let i = 0; i < this.itemData.requiredVariables.length; i++) {
              if (this.itemData.requiredVariables[i].value === undefined || this.itemData.requiredVariables[i].value === '') {
                result = false;
                break;
              }
            }
          }
          return result;
        },
        onPost() {
          this.isPosting = true;
          vscode.postMessage({
            command: 'createVm',
            text: JSON.stringify(this.itemData, null, 2)
          });
        },
        checkVmName(name) {
          vscode.postMessage({
            command: 'vmNameChange',
            text: name
          });
        },
        onVmNameChange(event) {
          this.checkVmName(event.target.value);
        },
        getButtonText() {
          if (this.isPosting) {
            if (this.getImageType() === 'iso') {
              return 'Creating...'
            } else if (this.getImageType() === 'macos') {
              return 'Creating...'
            } else if (this.getImageType() === 'internal') {
              return 'Attaching...'
            } else if (this.getImageType() === 'packer') {
              if (this.itemData.options.generateVagrantBox) {
                return 'Generating Vagrant Box...'
              } else {
                return 'Generating VM...'
              }
            } else {
              return 'Creating...'
            }
          } else {
            if (this.getImageType() === 'iso') {
              return 'Create VM'
            } else if (this.getImageType() === 'macos') {
              return 'Create VM'
            } else if (this.getImageType() === 'internal') {
              return 'Attach Appliance...'
            } else if (this.getImageType() === 'packer') {
              if (this.itemData.options.generateVagrantBox) {
                return 'Generate Vagrant Box'
              } else {
                return 'Generate VM'
              }
            } else {
              return 'Create'
            }
          }
        },
        options: ${osData}}"
      >
      <template x-if="isPosting">
      <div class="flex justify-center items-center h-full w-full absolute top-0 left-0 loading">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue"></div>
      </div>
      </template>
        <div class="flex flex-row panel-body">
          <div class="main-panel">
            <div class="text-panel title-text gap-x-6 py-0">Create New Virtual Machine</div>
            <ul role="list" class="panel panel-color">
              <li class="flex flex-col gap-x-6 py-0">
                <div class="w-full flex flex-col gap-x-4">
                  <h2 class="title-text mb-2">Operating System</h2>
                  <div class="mb-3" x-show="!showPlatform()">
                    <template x-if="!showPlatform()">
                      <span
                        class="caption-text"
                        x-text="'Compatible with ' +getDefaultPlatform() + (getImageType() !== '' ? ', Image format is '+ getImageType() :'') "
                      ></span>
                    </template>
                  </div>
                </div>
                <div class="flex gap-x-6 py-1">
                  <div class="sm:flex sm:flex-col sm:items-end w-1/4">
                    <div class="relative inline-block text-left">
                      <select
                        name="os"
                        title="os"
                        id="itemData__os"
                        x-model="itemData.os"
                        class="input block w-full p-2.5"
                        @change="onOsChange"
                      >
                        <option selected="" :value="'undefined'" value="undefined">Choose Operating System</option>
                        <template x-for="option in getAllOs()" :key="option">
                          <option :value="option.id" x-text="option.name"></option>
                        </template>
                      </select>
                    </div>
                  </div>
                  <!-- <div class="sm:flex sm:flex-col sm:items-end w-2/6" x-show="showPlatformDropdown()">
                    <div class="relative inline-block text-left">
                      <select
                        name="platform"
                        title="platform"
                        id="itemData__platform"
                        x-show="showPlatformDropdown()"
                        x-model="itemData.platform"
                        class="input block w-full p-2.5"
                        @change="onPlatformDropdownChange"
                      >
                        <option selected="" :value="'undefined'" value="undefined">Choose a platform</option>
                        <template x-for="option in getAllOsPlatforms()" :key="option">
                          <option :value="option.id" x-text="option.name"></option>
                        </template>
                      </select>
                    </div>
                  </div> -->
                  <div class="sm:flex sm:flex-col sm:items-end w-1/4" x-show="showDistroDropdown()">
                    <div class="relative inline-block text-left">
                      <select
                        name="distro"
                        title="distro"
                        id="itemData__distro"
                        x-show="showDistroDropdown()"
                        x-model="itemData.distro"
                        class="input block w-full p-2.5"
                        @change="onDistroDropdownChange"
                      >
                        <option selected="" :value="'undefined'" value="undefined">Choose a Distribution</option>
                        <template x-for="option in getAllOsPlatformsDistros()" :key="option">
                          <option :value="option.id" x-text="option.name"></option>
                        </template>
                      </select>
                    </div>
                  </div>
                  <div
                    class="sm:flex sm:flex-col sm:items-end"
                    :class="showDistroDropdown() ? 'w-2/4': 'w-3/4'"
                    x-show="showImageDropdown()"
                  >
                    <div class="relative inline-block text-left">
                      <select
                        name="image"
                        title="image"
                        x-show="showImageDropdown()"
                        x-model="itemData.image"
                        class="input block w-full p-2.5"
                        @change="onImageDropdownChange"
                      >
                        <option selected="" :value="'undefined'" value="undefined">Choose a Version</option>
                        <template x-for="option in getAllOsPlatformsDistrosImages()" :key="option">
                          <option :value="option.id" x-text="option.name"></option>
                        </template>
                      </select>
                    </div>
                  </div>
                </div>
                <div
                  class="flex sm:flex-row sm:items-end flex-row"
                >
                  <div class="pr-2 mb-2">
                      <span class="input-label" x-text="itemData.description"></span>
                  </div>
                </div>
                <div class="flex flex-row gap-x-1 py-1 mt-2" x-show="itemData.image !== 'undefined'">
                  <div class="sm:flex sm:flex-col sm:items-end w-full">
                    <div class="mb-2 w-full">
                      <label for="vmName" class="block mb-1 input-label">Virtual Machine Name</label>
                      <input
                        id="vmName"
                        type="text"
                        x-model="itemData.name"
                        name="vmName"
                        :value="itemData.image"
                        class="input block w-full p-2.5"
                        placeholder="1"
                        required="true"
                        x-on:input.change="onVmNameChange($event)"
                      />
                    </div>
                    <div class="mb-2 w-full" x-show="itemData.image !== 'undefined' && itemData.isValidVmName === 'false'">
                      <input x-on:input.change="console.log($event)" id="isValidVmName" type="hidden" x-model="itemData.isValidVmName" name="isValidVmName" :value="itemData.isValidVmName" />
                      <span class="input-label-mandatory">This Virtual Machine name already exists</span>
                      </div>
                  </div>
                </div>
              </li>

              <li class="flex flex-col gap-x-6 py-0">
                <div
                  class="flex sm:flex-row sm:items-end flex-row"
                  x-show="itemData.image !== 'undefined' && itemData.requireIsoDownload === true"
                >
                  <div class="pr-2 mb-2 w-3/5">
                    <label for="isoUrl" class="block mb-1 input-label">
                      Iso Url/File <span class="input-label-mandatory">*</span>
                    </label>
                    <input
                      id="isoUrl"
                      type="text"
                      x-model="itemData.isoUrl"
                      name="isoUrl"
                      :value="itemData.isoUrl"
                      class="input block w-full p-2.5"
                      placeholder="Select a ISO file or an Url"
                      required=""
                    />
                    <div class="mt-2" x-show="itemData.isoHelp !== undefined && itemData.requireIsoDownload === true">
                      <span class="input-label" x-show="itemData.isoHelp !== undefined && itemData.isoHelp.prefixText" x-text="itemData.isoHelp?.prefixText ?? ''"></span>
                      <a x-show="itemData.isoHelp !== undefined && itemData.isoHelp.urlText" :href="itemData.isoHelp?.url ?? ''" class="input-label input-label-link " x-text="itemData.isoHelp?.urlText ?? ''"></a>
                      <span class="input-label" x-show="itemData.isoHelp !== undefined && itemData.isoHelp.suffixText" x-text="itemData.isoHelp?.suffixText ?? ''"></span>
                    </div>
                  </div>
                  <div class="mb-2 w-2/5">
                    <label for="isoChecksum" class="block mb-1 input-label">Iso Checksum <span class="input-label-mandatory">*</span></label>
                    <input
                      id="isoChecksum"
                      type="text"
                      x-model="itemData.isoChecksum"
                      name="isoChecksum"
                      :value="itemData.isoChecksum"
                      class="input block w-full p-2.5"
                      placeholder="sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      required=""
                    />
                  </div>
                </div>
              </li>
              <li class="flex flex-col gap-x-6 py-0">
                <div
                  class="flex sm:flex-row sm:items-end flex-row"
                  x-show="itemData.image !== 'undefined' && showRequiredVariables() === true"
                >
                <template x-for="(requiredVariable, index) in itemData.requiredVariables" :key="requiredVariable">
                  <div class="pr-2 mb-2 w-3/5">
                    <label :for="'reqVar__' + requiredVariable.id" class="block mb-1 input-label">
                    <span x-text="requiredVariable.text"></span>
                    <span class="input-label-mandatory">*</span>
                    </label>
                    <input
                      :id="'reqVar__' + requiredVariable.id"
                      type="text"
                      x-model="itemData.requiredVariables[index].value"
                      :name="'reqVar__' + requiredVariable.id"
                      class="input block w-full p-2.5"
                      :placeholder="requiredVariable.hint ?? requiredVariable.text"
                      required=""
                    />
                  </div>
                  </template>
                </div>
              </li>
            </ul>
            <ul role="list" class="panel panel-color" x-show="showMachineSpecs()">
              <li class="flex flex-col gap-x-6 py-1" x-show="showMachineSpecs()">
                <div class="w-full flex flex-col gap-x-4">
                  <h2 class="title-text">Machine Specs</h2>
                  <div class="mt-2">
                    <span class="caption-text" x-text="getHostSpecs()"></span>
                  </div>
                </div>
                <div class="flex gap-x-6 py-5">
                  <div
                    class="sm:flex sm:flex-col sm:items-end"
                    :class="itemData.os !== 'undefined' && itemData.os !== 'macos' ? 'w-1/4': 'w-2/4'"
                  >
                    <div class="mb-2">
                      <label for="cpu" class="block mb-1 input-label">CPU's</label>
                      <input
                        id="itemData__specs__cpu"
                        type="number"
                        x-model="itemData.specs.cpu"
                        name="cpu"
                        min="1"
                        max="32"
                        class="input block w-full p-2.5"
                        placeholder="2"
                        required=""
                      />
                    </div>
                  </div>
                  <div
                    class="sm:flex sm:flex-col sm:items-end"
                    :class="itemData.os !== 'undefined' && itemData.os !== 'macos' ? 'w-1/4': 'w-2/4'"
                  >
                    <div class="relative inline-block text-left">
                      <label for="itemData__specs__memory" class="block mb-1 input-label">Memory</label>
                      <select
                        id="itemData__specs__memory"
                        x-model="itemData.specs.memory"
                        class="input block w-full p-2.5"
                      >
                        <option :value="1024" value="1024">1 GB</option>
                        <option selected="" :value="2048" value="2048">2 GB's</option>
                        <option :value="3072" value="3072">3 GB's</option>
                        <option :value="4096" value="4096">4 GB's</option>
                        <option :value="5120" value="5120">5 GB's</option>
                        <option :value="6144" value="6144">6 GB's</option>
                        <option :value="7168" value="7168">7 GB's</option>
                        <option :value="8192" value="8192">8 GB's</option>
                      </select>
                    </div>
                  </div>
                  <div
                    class="sm:flex sm:flex-col sm:items-end w-2/4"
                    x-show="itemData.os !== 'undefined' && itemData.os !== 'macos'"
                  >
                    <div class="mb-2">
                      <label for="disk" class="block mb-1 input-label">Disk Size</label>
                      <div class="suffix-container input-with-suffix">
                        <input
                          id="itemData__specs__disk"
                          type="number"
                          x-model="itemData.specs.disk"
                          name="disk"
                          min="32768"
                          max="92160"
                          step="1024"
                          class="input block w-full p-2.5"
                          placeholder="32768"
                          required=""
                        />
                        <span class="suffix">MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
            <ul role="list" class="panel panel-color" x-show="showMachineOptions() || showMachineAddons()">
              <li class="flex flex-col w-full mb-3" x-show="showMachineOptions()">
                <div class="w-full flex flex-col gap-x-4">
                  <h2 class="title-text">Additional</h2>
                </div>
              </li>
              <li class="flex flex-col w-full sub-panel sub-panel-color mb-3" x-show="showMachineOptions()">
                <div class="w-full flex flex-col gap-x-4 mb-4">
                  <h2 class="normal-text">Options:</h2>
                </div>
                <div class="flex gap-x-6 options-panel">
                  <template x-for="option in getImageFlags()" :key="option">
                    <div class="sm:flex sm:items-end">
                      <div class="option-checkbox">
                        <input
                          :id="'itemData__addons__' + option.code"
                          x-model="option.enabled"
                          type="checkbox"
                          value=""
                          @change="addImageFlags(option.code, $event.target.checked)"
                        />
                        <label class="ml-2 input-label">
                          <span x-text="option.name" class="input-label"></span>
                        </label>
                      </div>
                    </div>
                  </template>
                </div>
              </li>
              <li class="flex flex-col w-full sub-panel sub-panel-color mb-3" x-show="showMachineAddons()">
                <div class="w-full flex flex-col gap-x-4 mb-4">
                  <h2 class="normal-text">Addons</h2>
                </div>
                <div class="flex gap-x-6 options-panel">
                  <template x-for="option in getAllOsPlatformsDistrosImageAddons()" :key="option">
                    <div class="sm:flex sm:items-end">
                      <div class="option-checkbox">
                        <input
                          :id="'itemData__addons__' + option.id"
                          x-model="option.deploy"
                          type="checkbox"
                          value=""
                          @change="addImageAddon(option.id, $event.target.checked)"
                        />
                        <label class="relative inline-flex items-center cursor-pointer">
                          <label class="ml-2 input-label">
                            <span x-text="option.name" class="input-label"></span>
                          </label>
                        </label>
                      </div>
                    </div>
                  </template>
                </div>
              </li>
              <li class="flex flex-col w-full sub-panel sub-panel-color mb-3" x-show="itemData.defaults.user !== undefined" >
                <div class="w-full flex flex-col gap-x-4 mb-4">
                  <h2 class="normal-text">Default user</h2>
                </div>
                <div class="w-full mb-2">
                  <span class="input-label">
                    This will be the default user/password that will be used to login to the machine.
                  </span>
                </div>
                <div class="flex gap-x-6">
                  <div
                  class="flex sm:flex-row sm:items-end flex-row w-full"
                >
                  <div class="pr-2 mb-2 w-2/4">
                    <label for="isoUrl" class="block mb-1 input-label">
                      Username
                    </label>
                    <input
                      id="defaultUser"
                      type="text"
                      disabled
                      name="isoUrl"
                      :value="itemData.defaults?.user?.username ?? 'parallels-eee'"
                      class="input block w-full p-2.5"
                      placeholder="parallels"
                    />
                  </div>
                  <div class="mb-2 w-2/4">
                    <label for="defaultPassword" class="block mb-1 input-label">Password</label>
                    <input
                      id="defaultPassword"
                      type="text"
                      disabled
                      name="defaultPassword"
                      :value="itemData.defaults?.user?.password ?? 'parallels-eee'"
                      class="input block w-full p-2.5"
                      placeholder="parallels"
                    />
                  </div>
                </div>
                </div>
              </li>
            </ul>
            <ul role="list" class="mb-4 mt-4" x-show="validatePostButton()">
              <li class="flex flex-col gap-x-6 py-1 w-full items-end" x-show="itemData.image !== 'undefined'">
                <div class="flex items-end p-2">
                  <button
                    :disabled="isPosting"
                    id="createVm"
                    type="button"
                    class="btn btn-primary w-40"
                    @click="onPost"
                    x-text="getButtonText()"
                  >
                    Create
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <div class="side-panel">
            <div>
              <span class="title-text">Parallels Desktop 19 for Mac</span>
            </div>
            <div>
              <span class="caption-text" x-text="getVersion()"></span>
            </div>
            <div class="logo-side">
              <img src="${imageUri}/logo_new.png" width="160px" alt="logo" />
            </div>
            <div class="link">
              <a class="link-text" href="https://my.parallels.com/login" target="_blank" rel="noopener noreferrer"
                >Account & Licenses</a
              >
            </div>
            <hr class="divider" />
            <div class="link">
              <a class="link-text" href="https://www.parallels.com/blogs/" target="_blank" rel="noopener noreferrer"
                >Parallels Blog</a
              >
            </div>
            <div class="link">
              <a class="link-text" href="https://forum.parallels.com/" target="_blank" rel="noopener noreferrer"
                >Parallels Forum</a
              >
            </div>
            <div class="link">
              <a class="link-text" href="https://discord.gg/etqdafGvjK" target="_blank" rel="noopener noreferrer"
                >Parallels Discord Server</a
              >
            </div>
          </div>
        </div>
      </div>
    </div>
`;

  return generateHtml(context, panel, html, [script]);
};
