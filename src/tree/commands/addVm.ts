import * as vscode from "vscode";
import * as path from "path";

import {VirtualMachineProvider} from "../virtual_machine";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {CommandsFlags} from "../../constants/flags";
import {generateHtml} from "../../views/header.html";
import {CreateMachineService} from "../../services/createMachineService";
import {NewVirtualMachineRequest} from "../../models/newVmRequest";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";

export function registerAddVmCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewAddVm, async (item: VirtualMachineTreeItem) => {
      const svc = new CreateMachineService(context);
      const os = await svc.get();
      let osData = "[";
      os.forEach(o => {
        osData += o.toString() + ",";
      });
      osData += "]";

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
          light: vscode.Uri.file(path.join(__filename, "..", "..", "img", "light", `desktop.svg`)),
          dark: vscode.Uri.file(path.join(__filename, "..", "..", "img", "dark", `desktop.svg`))
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
              specs: {
                cpus: cmd.specs?.cpu ?? "2",
                memory: cmd.specs?.memory ?? "2048",
                disk: cmd.specs?.disk ?? "65536",
                username: cmd.specs?.username ?? "",
                password: cmd.specs?.password ?? ""
              },
              flags: {
                startHeadless: cmd.options?.startHeadless == false,
                generateVagrantBox: cmd.options?.generateVagrantBox == true
              },
              addons: []
            };

            cmd.addons.forEach((a: any) => {
              if (a.deploy) {
                request.addons.push(a.id);
              }
            });
            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: `Creating VM ${request.name}`
              },
              async progress => {
                panel.dispose();
                await svc.createVm(request).then(
                  value => {
                    if (value) {
                      ParallelsDesktopService.getVms().then(() => {
                        provider.refresh();
                        vscode.window.showInformationMessage(`VM ${request.name} created successfully`);
                        return;
                      });
                    } else {
                      vscode.window.showErrorMessage(`VM ${request.name} not created`);
                    }
                  },
                  err => {
                    parallelsOutputChannel.appendLine(`Error creating VM: ${err}`);
                    parallelsOutputChannel.show();
                    vscode.window.showErrorMessage(`Error creating VM: ${err}`);
                  }
                );
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
}

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, osData: string) {
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media", "vscode.css")));
  const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media")));

  const script = `<script></script>`;
  const html =
    `
  <div id="t" class="card-container mt-2" x-data="{
    isPosting: false,
    itemData: {
      os: 'undefined',
      platform: 'undefined',
      distro: 'undefined',
      image: 'undefined',
      name: 'undefined',
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
      addons: []
    },
    getAllOs() {
      return this.options
    },
    getAllOsPlatforms() {
      if (this.itemData.os === 'undefined') return []
      return this.options.find(o => o.id === this.itemData.os)?.platforms ?? []
    },
    getAllOsPlatformsDistros() {
      if (this.itemData.os === 'undefined' && this.itemData.platform ==='undefined') return []
      return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros ?? []
    },
    getAllOsPlatformsDistrosImages() {
      if(this.itemData.os === 'linux') {
        if (this.itemData.os === 'undefined' && this.itemData.platform ==='undefined' && this.itemData.distro === 'undefined') return []
        return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros.find(d => d.id === this.itemData.distro)?.images ?? []  
      } else {
        if (this.itemData.os === 'undefined' && this.itemData.platform ==='undefined') return []
        return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.images ?? []  
      }
    },
    getAllOsPlatformsDistrosImageAddons() {
      const img = this.getImage();
      if (img === undefined) return []
      return img.addons ?? []
    },
    getImage() {
      if (this.itemData.os === 'undefined' || this.itemData.image === 'undefined') return undefined
      if(this.itemData.os === 'linux') {
        if (this.itemData.os === 'undefined' && this.itemData.platform ==='undefined' && this.itemData.distro === 'undefined') return []
        return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.distros.find(d => d.id === this.itemData.distro)?.images.find(i => i.id === this.itemData.image) ?? undefined
      } else {
        if (this.itemData.os === 'undefined' && this.itemData.platform ==='undefined') return []
        return this.options.find(o => o.id === this.itemData.os)?.platforms.find(p => p.id === this.itemData.platform)?.images.find(i => i.id === this.itemData.image) ?? undefined
      }
    },
    onOsChange() {
      this.itemData.platform = 'undefined'; 
      this.itemData.distro = 'undefined'; 
      this.itemData.image = 'undefined'; 
      if (this.itemData.os !== 'undefined' && !this.showPlatform()) { 
        this.itemData.platform = (this.options.find(o => o.id === this.itemData.os)?.platforms ?? [])[0].id
      } if (this.itemData.os !== 'undefined' && this.showPlatform()) {
        this.itemData.platform = 'undefined';
      }
    },
    onPlatformDropdownChange() {
      this.itemData.distro = 'undefined'; 
      this.itemData.image = 'undefined'; 
    },
    onDistroDropdownChange() {
      this.itemData.image = 'undefined'; 
    },
    onImageDropdownChange() {
      this.itemData.name = this.getAllOsPlatformsDistrosImages()?.find(i => i.id === this.itemData.image)?.name ?? ''
    },
    showPlatform() {
      if (this.itemData.os === 'undefined') return true
      return this.itemData.os !== 'undefined' && (this.options.find(o => o.id === this.itemData.os)?.platforms ?? []).length > 1
    },
    getImageType() {
      return this.getAllOsPlatformsDistrosImages()?.find(i => i.id === this.itemData.image)?.type ?? ''
    },
    showPlatformDropdown() {
      return this.itemData.os !== 'undefined' && (this.options.find(o => o.id === this.itemData.os)?.platforms ?? []).length > 1
    },
    showDistroDropdown() {
      return  this.itemData.os === 'linux' && this.itemData.platform !== 'undefined';
    },
    showImageDropdown() {
      if (this.itemData.os === 'linux') {
        return this.itemData.os === 'linux' && this.itemData.platform !== 'undefined' && this.itemData.distro !== 'undefined'
      } else {
        return  this.itemData.os !== 'undefined' && this.itemData.platform !== 'undefined';
      }
    },
    showMachineSpecs() {
      return this.itemData.image !== 'undefined' && this.itemData.os !== 'macos'
    },
    showMachineOptions() {
      const img = this.getImage();
      if (img === undefined) return false
      if (img.type === 'internal' || img.type === 'iso' ) return false
      return this.itemData.image !== 'undefined' && this.itemData.os !== 'macos'
    },
    showMachineAddons() {
      const img = this.getImage();
      if (img === undefined) return false
      if (img.type === 'internal' || img.type === 'iso' ) return false
      return img.addons.length > 0
    },
    getDefaultPlatform() {
      if (this.itemData.os === 'undefined') return 'undefined'
      return (this.options.find(o => o.id === this.itemData.os)?.platforms ?? [])[0].id
    },
    addImageAddon(id, state) {
      if (this.itemData.addons.length === 0) {
        this.itemData.addons.push({id: id, deploy: state});
        return;
      }

      for (let i = 0; i < this.itemData.addons.length; i++) {
        let found = false
        if (this.itemData.addons[i].id === id) {
          if (!state){
            this.itemData.addons.splice(i, 1);
          }
          found = true;
          return;
        }
        
        if (!found) {
          this.itemData.addons.push({id: id, deploy: state});
        }
      }
    },
    onPost() {
      this.isPosting = true;
      vscode.postMessage({
        command: 'createVm',
        text: JSON.stringify(this.itemData, null, 2)
      });
    },
    getButtonText() {
      if (this.isPosting) {
        if (this.getImageType() === 'iso') {
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
    options: ` +
    osData +
    `,
  }">
  <template x-if="isPosting">
  <div class="flex justify-center items-center h-full w-full absolute top-0 left-0 loading">
    <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue"></div>
  </div>
</template>
  <ul role="list" class="divide-y divide-gray-200">
    <li class="flex justify-between gap-x-6 py-5">
      <div class="w-full flex gap-x-4">
        <div class="min-w-0 flex-auto">
          <h1 class="card-title text-xl font-semibold">Creating Virtual Machine
            <span x-show="itemData.image !== 'undefined'" class="text-xs align-middle" x-text="'(' +getImageType() + ')'" ></span>
          </h1>
      </div>
    </li>
  </ul>
  <ul role="list" class="divide-y divide-gray-200">
    <li class="flex flex-col gap-x-6 py-0">
      <div class="w-full flex flex-col gap-x-4">
        <h2 class="card-title">Operating System
          <template x-if="!showPlatform()">
              <span class="text-xs align-middle" x-text="'(' +getDefaultPlatform() + ')'" ></span>
          </template>
        </h2>
      </div>
      <div class="flex gap-x-6 py-1">
        <div class="hidden sm:flex sm:flex-col sm:items-end" >
          <div class="relative inline-block text-left"">
            <select id="itemData__os" x-model="itemData.os" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" @change="onOsChange" >
              <option selected :value="'undefined'" >Choose Operating System</option>
              <template x-for="option in getAllOs()" :key="option">
                <option :value="option.id" x-text="option.name"></option>
              </template>
            </select>
          </div>
        </div>
        <div class="hidden sm:flex sm:flex-col sm:items-end" x-show="showPlatformDropdown()" >
          <div class="relative inline-block text-left"">
            <select id="itemData__platform" x-show="showPlatformDropdown()" x-model="itemData.platform" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" @change="onPlatformDropdownChange">
              <option selected :value="'undefined'">Choose a platform</option>
              <template x-for="option in getAllOsPlatforms()" :key="option">
                <option :value="option.id" x-text="option.name"></option>
              </template>
            </select>
          </div>
        </div>
        <!-- <template x-if="os !== 'undefined' && (options.find(o => o.id === os)?.platforms ?? []).length == 1">
          <div class="flex items-center">
            <span x-text="(options.find(o => o.id === os)?.platforms ?? [])[0].name"></span>
          </div>
        </template> -->
        <div class="hidden sm:flex sm:flex-col sm:items-end" x-show="showDistroDropdown()" >
          <div class="relative inline-block text-left"">
            <select id="itemData__distro" x-show="showDistroDropdown()" x-model="itemData.distro" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" @change="onDistroDropdownChange">
              <option selected :value="'undefined'">Choose a Distribution</option>
              <template x-for="option in getAllOsPlatformsDistros()" :key="option">
                <option :value="option.id" x-text="option.name"></option>
              </template>
            </select>
          </div>
        </div>
        <div class="hidden sm:flex sm:flex-col sm:items-end" x-show="showImageDropdown()" >
          <div class="relative inline-block text-left"">
            <select x-show="showImageDropdown()" x-model="itemData.image" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"  @change="onImageDropdownChange">
              <option selected :value="'undefined'">Choose a Version</option>
              <template x-for="option in getAllOsPlatformsDistrosImages()" :key="option">
                <option :value="option.id" x-text="option.name"></option>
              </template>
            </select>
          </div>
        </div>
      </div>
      <div class="flex flex-row gap-x-1 py-1" x-show="itemData.image !== 'undefined'">
        <div class="hidden sm:flex sm:flex-col sm:items-end w-full" >
          <div class="mb-2 w-full">
            <label for="vmName" class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">Machine Name</label>
            <input id="vmName" type="text" x-model="itemData.name" id="vmName" name="vmName" :value="itemData.image" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="1" required>
          </div>
        </div>
      </div>
    </li>
    <li class="flex flex-col gap-x-6 py-1" x-show="showMachineSpecs()">
      <div class="w-full flex flex-col gap-x-4">
        <h2 class="card-title">Machine Specs</h2>
      </div>
      <div class="flex gap-x-6 py-5">
        <div class="hidden sm:flex sm:flex-col sm:items-end" >
          <div class="mb-2">
            <label for="cpu" class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">CPU's</label>
            <input id="itemData__specs__cpu" type="number" x-model="itemData.specs.cpu" id="cpu" name="cpu" min="1" max="32" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="2" required>
          </div>
        </div>
        <div class="hidden sm:flex sm:flex-col sm:items-end" >
          <div class="relative inline-block text-left"">
          <label for="itemData__specs__memory" class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">Memory</label>
          <select id="itemData__specs__memory" x-model="itemData.specs.memory" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
              <option :value="1024">1 GB</option>
              <option selected :value="2048">2 GB's</option>
              <option :value="3072">3 GB's</option>
              <option :value="4096">4 GB's</option>
              <option :value="5120">5 GB's</option>
              <option :value="6144">6 GB's</option>
              <option :value="7168">7 GB's</option>
              <option :value="8192">8 GB's</option>
            </select>
          </div>
        </div>
        <div class="hidden sm:flex sm:flex-col sm:items-end" >
          <div class="mb-2">
            <label for="disk" class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">Disk Size</label>
            <input id="itemData__specs__disk"  type="number" x-model="itemData.specs.disk" id="disk" name="disk" min="32768" max="92160" step="1024" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="32768" required>
          </div>
        </div>
    </li>
    <li class="flex flex-col gap-x-6 py-5 w-full" x-show="showMachineOptions()">
      <div class="w-full flex flex-col gap-x-4">
        <h2 class="card-title">Options</h2>
      </div>
      <div class="flex gap-x-6 py-3">
        <ul role="list" class="py-0 w-full">
          <li class="flex flex-col gap-x-6 py-1 w-full">
            <div class="hidden sm:flex sm:items-end" >
              <div class="mr-3 flex flex-auto">
                <span class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">Start Headless</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input id="itemData__options__startHeadless" x-model="itemData.options.startHeadless" type="checkbox" value="" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </li>
          <li class="flex flex-col gap-x-6 py-1 w-full" x-show="getImage()?.type ?? 'undefined' === 'packer'">
            <div class="hidden sm:flex sm:items-end" >
              <div class="mr-3 flex flex-auto">
                <span class="block mb-1 text-sm font-medium text-gray-700 dark:text-white">Build Vagrant Box</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input id="itemData__options__generateVagrantBox" x-model="itemData.options.generateVagrantBox" type="checkbox" value="" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </li>
        </ul>
      </div
    </li>
    <li class="flex flex-col gap-x-6 py-1" x-show="showMachineAddons()">
      <div class="w-full flex flex-col gap-x-4">
        <h2 class="card-title">Addons</h2>
      </div>
      <div class="flex gap-x-6 py-3">
        <ul role="list" class="py-0 w-full">
          <template x-for="option in getAllOsPlatformsDistrosImageAddons()" :key="option">
            <li class="flex flex-col gap-x-6 py-1 w-full">
              <div class="hidden sm:flex sm:items-end" >
                <div class="mr-3 flex flex-auto">
                  <span x-text="option.name" class="block mb-1 text-sm font-medium text-gray-700 dark:text-white"></span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input :id="'itemData__addons__' + option.id" x-model="option.deploy" type="checkbox" value="" class="sr-only peer" @change="addImageAddon(option.id, $event.target.checked)"">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div
            </li>
          </template> 
        </ul>
      </div>
    </li>
    <li class="flex flex-col gap-x-6 py-1 w-full items-end" x-show="itemData.image !== 'undefined'">
      <div class="flex items-end p-2" >
        <button :disabled="isPosting" id="createVm" type="button" class="btn btn-primary w-40" @click="onPost" x-text="getButtonText()"></button>
      </div>
    </li>
  </ul>
</div>
`;

  return generateHtml(context, panel, html, [script]);
}
