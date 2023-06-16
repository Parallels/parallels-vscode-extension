import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import {VirtualMachineProvider} from "../virtual_machine";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {Provider} from "../../ioc/provider";
import {CommandsFlags} from "../../constants/flags";
import {VirtualMachine} from "../../models/virtualMachine";
import {generateHtml} from "../../views/header.html";
import {getScreenCaptureFolder, isDarkTheme} from "../../helpers/helpers";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";

let lastClickedTime: number | undefined;

export function registerViewVmDetailsCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewViewVmDetails, async (item: VirtualMachineTreeItem) => {
      if (item.type !== "Group" && item.type !== "Snapshot") {
        const clickedTime = Date.now();
        // if (lastClickedTime && clickedTime - lastClickedTime < 500) {
        const panel = vscode.window.createWebviewPanel(
          "vm_details", // Identifies the type of the webview. Used internally
          "VM Details", // Title of the panel displayed to the user
          vscode.ViewColumn.One, // Editor column to show the new webview panel in.
          {
            // Enable scripts in the webview
            enableScripts: true,
            retainContextWhenHidden: true
          } // Webview options. More on these later.
        );

        const screenshot = await getMachineSnapshot(item.vmId ?? "", context).catch(err => {
          parallelsOutputChannel.appendLine(`Error getting screenshot: ${err}`);
          return "";
        });
        const updateWebview = () => {
          panel.title = `${item.name}`;
          panel.iconPath = {
            light: vscode.Uri.file(path.join(__filename, "..", "..", "img", "light", `desktop.svg`)),
            dark: vscode.Uri.file(path.join(__filename, "..", "..", "img", "dark", `desktop.svg`))
          };
          const screenshotUri = screenshot !== "" ? panel.webview.asWebviewUri(vscode.Uri.file(screenshot)) : "";
          panel.webview.html = getWebviewContent(context, panel, item.item as VirtualMachine, screenshotUri.toString());
        };

        panel.webview.onDidReceiveMessage(async message => {
          switch (message.command) {
            case "updateVm": {
              const cmd = JSON.parse(message.text);
              for (const flag in cmd) {
                switch (flag) {
                  case "startupAndShutdown__startView":
                    ParallelsDesktopService.setVmConfig(item.vmId ?? "", "startup-view", cmd[flag])
                      .then(
                        value => {
                          if (!value) {
                            vscode.window.showErrorMessage("Failed to update VM");
                          }
                        },
                        reason => {
                          vscode.window.showErrorMessage(reason);
                        }
                      )
                      .catch(error => {
                        vscode.window.showErrorMessage(error);
                      });
                    break;
                }
              }
              panel.dispose();
              return;
            }
          }
        });

        updateWebview();
        // }

        lastClickedTime = clickedTime;
      }
    })
  );
}

function getMachineSnapshot(machineId: string, context: vscode.ExtensionContext): Promise<string> {
  return new Promise((resolve, reject) => {
    const destinationFolder = getScreenCaptureFolder(context);
    const destinationFile = path.join(destinationFolder, `${machineId}.png`);
    ParallelsDesktopService.captureScreen(machineId, destinationFile)
      .then(
        value => {
          if (!value) {
            if (fs.existsSync(destinationFile)) {
              return resolve(destinationFile);
            }
            reject();
          }
          resolve(destinationFile);
        },
        reason => {
          if (fs.existsSync(destinationFile)) {
            return resolve(destinationFile);
          }
          reject(reason);
        }
      )
      .catch(error => {
        if (fs.existsSync(destinationFile)) {
          return resolve(destinationFile);
        }
        reject(error);
      });
  });
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  item: VirtualMachine,
  screenshot?: string
) {
  const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "img/os_logos")));
  let osImg = "/linux_logo_light.svg";
  if (item.OS === "win-11") {
    osImg = "/images/windows_logo_light.svg";
  } else if (item.OS === "macosx") {
    osImg = "/images/macos_logo_light.svg";
  } else if (item.OS === "Other") {
    osImg = "/images/other_logo_light.svg";
  }
  if (isDarkTheme()) {
    osImg = osImg.replace("_light", "_dark");
  }
  const data = JSON.stringify(item, null, 2).replace(/"/g, "'");
  const script = `<script></script>`;
  const html = `
  <div class="card-container mt-2" x-data="{
    isPosting: false,
    changed: false,
    activeTab: 'mouseAndKeyboard',
    itemData: {
    },
    screenshot: '${screenshot}',
    getOsLogo() {
      let osLogo = this.options.OS
      switch (this.options.OS) {
        case 'ubuntu':
          osLogo = 'ubuntu'
          break;
        case 'windows':
          osLogo = 'windows'
          break;
        case 'win-11':
          osLogo = 'windows'
          break;
        case 'macos':
          osLogo = 'macosx'
          break;
        case 'macosx':
          osLogo = 'macosx'
          break;
        case 'fedora':
          osLogo = 'fedora'
          break;
        case 'kali':
          osLogo = 'kali_linux'
          break;
        default:
          osLogo = 'other'
          break;
      }

      return \`${imageUri}/\${osLogo}_logo.svg\`
    },
    pad(n, width) {
      var n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
    },
    displayTime(ticksInSecs) {
      var ticks = ticksInSecs;
      var hh = Math.floor(ticks / 3600);
      var mm = Math.floor((ticks % 3600) / 60);
      var ss = ticks % 60;
  
      return this.pad(hh, 2) + ':' + this.pad(mm, 2) + ':' + this.pad(ss, 2);
    },
    save() {
      this.isPosting = true;
      vscode.postMessage({
        command: 'updateVm',
        text: JSON.stringify(this.itemData, null, 2)
      });
    },
    options: ${data},
  }">
    <template x-if="isPosting">
      <div class="flex justify-center items-center h-full w-full absolute top-0 left-0 loading">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue"></div>
      </div>
    </template>
    <div class="card-container mt-2">
      <ul role="list">
        <li class="flex w-full flex-row justify-between items-center gap-x-6 py-5">
          <div class="h-14 w-14 p-2 bg-gray-50 rounded-lg">
            <img class="h-12 w-12 flex-none" :src="getOsLogo()" />
          </div>
          <div class="flex flex-col gap-x-4 items-start flex-auto">
            <div class="flex gap-x-2">
              <h1 class="card-title text-xl font-semibold" x-text="options.Name"></h1>
              <h3 class="text-xm font-semibold text-gray-500" x-text="'[' + options.State + ']'"></h3>
            </div>
            <div>
              <h3 class="card-subtitle text-sm font-semibold text-gray-500" x-text="options.ID"></h3>
            </div>
            <div>
              <h3 class="card-subtitle text-xs font-semibold text-gray-500" x-text="options['Home path']"></h3>
            </div>
          </div>
        </li>
        <li class="flex justify-between w-full gap-x-0">
          <div class="flex flex-col flex-grow gap-x-4">
            <h1 class="card-title text-xl font-semibold">Description:</h1>
            <p x-text="options.Description"></p>
          </div>
          <div class="flex items-center justify-center" x-show="screenshot === ''" style="width: 300px; min-width: 300px; max-width: 300px; min-height: 190px; background-color: black;">
          <img class="h-12 w-12 p-2 flex-none rounded-full" :src="getOsLogo()" />
          </div>
          <div x-show="screenshot !== ''" class="flex" style="width: 300px; min-width: 300px; max-width: 300px; min-height: 190px">
            <img width="300" :src="screenshot" />
          </div>
        </li>
      </ul>
    </div>
    <div class="card-container mt-2">
      <ul role="list" class="divide-y divide-solid divide-gray-200 mt-4">
        <li class="flex justify-between w-full gap-x-0">
          <div class="flex flex-auto gap-x-4">
            <h1 class="card-title text-lg font-semibold">Guest Tools:</h1>
          </div>
          <div class="flex items-center">
            <p x-text="options['GuestTools'].state" class="text-sm"></p>
            <p
              class="text-sm ml-2"
              x-show="options['GuestTools'].version !== ''"
              x-text="'Version: ' + options['GuestTools'].version"
            ></p>
          </div>
        </li>
        <li class="flex justify-between w-full gap-x-0">
          <div class="flex flex-auto gap-x-4">
            <h1 class="card-title text-lg font-semibold">Up Time</h1>
          </div>
          <div class="flex items-center">
            <p x-text="displayTime(options['Uptime'])" class="text-sm"></p>
          </div>
        </li>
        <li class="flex justify-between w-full gap-x-0">
          <div class="flex flex-auto gap-x-4">
            <h1 class="card-title text-lg font-semibold">Configuration Path</h1>
          </div>
          <div class="flex items-center">
            <p x-text="options['Home path']" class="text-sm"></p>
          </div>
        </li>
      </ul>
    </div>
    <div class="card-container mt-2">
      <div id="tabs" class="border-b border-gray-200 dark:border-gray-700">
        <ul class="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'mouseAndKeyboard' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'mouseAndKeyboard'"
            >
              <svg
                viewBox="0 0 16 16"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'mouseAndKeyboard' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="m 2.5 2 c -1.367188 0 -2.5 1.132812 -2.5 2.5 v 7 c 0 1.367188 1.132812 2.5 2.5 2.5 h 11 c 1.367188 0 2.5 -1.132812 2.5 -2.5 v -7 c 0 -1.367188 -1.132812 -2.5 -2.5 -2.5 z m 0 2 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.242188 0.171875 -0.445312 0.398438 -0.488281 c 0.03125 -0.007813 0.066406 -0.011719 0.101562 -0.011719 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m -8 3 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m -10 3 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 3 0 h 4 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -4 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 6 0 h 1 c 0.277344 0 0.5 0.222656 0.5 0.5 v 1 c 0 0.277344 -0.222656 0.5 -0.5 0.5 h -1 c -0.277344 0 -0.5 -0.222656 -0.5 -0.5 v -1 c 0 -0.277344 0.222656 -0.5 0.5 -0.5 z m 0 0"
                  ></path>
                </g>
              </svg>
              Mouse and Keyboard
            </a>
          </li>
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'hardware' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'hardware'"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'hardware' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                ></path></svg
              >Hardware
            </a>
          </li>
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'display' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'display'"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'display' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"
                ></path></svg
              >Display
            </a>
          </li>
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'optimization' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'optimization'"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'optimization' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clip-rule="evenodd"
                ></path></svg
              >Optimization
            </a>
          </li>
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'shared' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'shared'"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'shared' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clip-rule="evenodd"
                ></path></svg
              >Shared
            </a>
          </li>
          <li class="mr-2">
            <a
              href="#"
              class="inline-flex p-4 border-b-2 rounded-t-lg group"
              :class="activeTab === 'advanced' ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group'"
              @click="activeTab = 'advanced'"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5 mr-2"
                :class="activeTab === 'advanced' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clip-rule="evenodd"
                ></path></svg
              >Advanced
            </a>
          </li>
        </ul>
      </div>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'mouseAndKeyboard'">
        <li class="flex justify-between w-full mt-1 pt-1">
          <div class="flex flex-auto items-center">
            <h1 class="card-title text-xs">Smart mouse optimized for games</h1>
          </div>
          <div class="flex items-center">
            <div class="relative inline-block text-sm text-left">
              <select
                id="itemData__hardware__mouseAndKeyboard__smartMouseOptimizedForGames"
                x-model="itemData.mouseAndKeyboard__smartMouseOptimizedForGames"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                @change="changed = true"
              >
                <option
                  :selected="options['Mouse and Keyboard']['Smart mouse optimized for games'] === 'on'"
                  value="on"
                >
                  On
                </option>
                <option
                  :selected="options['Mouse and Keyboard']['Smart mouse optimized for games'] === 'off'"
                  value="off"
                >
                  Off
                </option>
                <option
                  :selected="options['Mouse and Keyboard']['Smart mouse optimized for games'] === 'auto'"
                  value="auto"
                >
                  Auto
                </option>
              </select>
            </div>
          </div>
        </li>
        <li class="flex justify-between w-full mt-1 pt-1">
          <div class="flex flex-auto items-center">
            <h1 data-tooltip-target="tooltip-no-arrow" data-tooltip-trigger="hover" class="card-title text-xs">
              Sticky mouse
            </h1>
            <div
              id="tooltip-no-arrow"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
            >
              Tooltip content
            </div>
          </div>
          <div class="flex items-center">
            <div class="relative inline-block text-sm text-left">
              <select
                id="itemData__hardware__mouseAndKeyboard__stickyMouse"
                x-model="itemData.mouseAndKeyboard__stickyMouse"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                @change="changed = true"
              >
                <option :selected="options['Mouse and Keyboard']['Sticky mouse'] === 'on'" value="on">On</option>
                <option :selected="options['Mouse and Keyboard']['Sticky mouse'] === 'off'" value="off">Off</option>
              </select>
            </div>
          </div>
        </li>
        <li class="flex justify-between w-full mt-1 pt-1">
          <div class="flex flex-auto items-center">
            <h1 data-tooltip-target="tooltip-no-arrow" data-tooltip-trigger="hover" class="card-title text-xs">
              Smooth scrolling
            </h1>
            <div
              id="tooltip-no-arrow"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
            >
              Tooltip content
            </div>
          </div>
          <div class="flex items-center">
            <div class="relative inline-block text-sm text-left">
              <select
                id="itemData__hardware__mouseAndKeyboard__smoothScrolling"
                x-model="itemData.mouseAndKeyboard__smoothScrolling"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                @change="changed = true"
              >
                <option :selected="options['Mouse and Keyboard']['Smooth scrolling'] === 'on'" value="on">
                  On
                </option>
                <option :selected="options['Mouse and Keyboard']['Smooth scrolling'] === 'off'" value="off">
                  Off
                </option>
              </select>
            </div>
          </div>
        </li>
        <li class="flex justify-between w-full mt-1 pt-1">
          <div class="flex flex-auto items-center">
            <h1 data-tooltip-target="tooltip-no-arrow" data-tooltip-trigger="hover" class="card-title text-xs">
              Keyboard optimization mode
            </h1>
            <div
              id="tooltip-no-arrow"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
            >
              Tooltip content
            </div>
          </div>
          <div class="flex items-center">
            <div class="relative inline-block text-sm text-left">
              <select
                id="itemData__hardware__mouseAndKeyboard__keyboardOptimizationMode"
                x-model="itemData.mouseAndKeyboard__keyboardOptimizationMode"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                @change="changed = true"
              >
                <option
                  :selected="options['Mouse and Keyboard']['Keyboard optimization mode'] === 'auto'"
                  value="on"
                >
                  Auto
                </option>
                <option
                  :selected="options['Mouse and Keyboard']['Keyboard optimization mode'] === 'accessibility'"
                  value="on"
                >
                  Accessibility
                </option>
                <option :selected="options['Mouse and Keyboard']['Keyboard optimization mode'] === 'on'" value="on">
                  On
                </option>
                <option
                  :selected="options['Mouse and Keyboard']['Keyboard optimization mode'] === 'off'"
                  value="off"
                >
                  Off
                </option>
              </select>
            </div>
          </div>
        </li>
      </ul>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'hardware'">
        <li class="flex justify-center w-full mt-1 pt-1">
          <div class="flex flex-auto items-center justify-center">
            <h1 class="card-title text-xs">Not implemented yet</h1>
          </div>
        </li>
      </ul>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'display'">
        <li class="flex justify-between w-full mt-1 pt-1">
          <div class="flex flex-auto items-center">
            <h1 class="card-title text-xs">Startup View</h1>
          </div>
          <div class="flex items-center">
            <div class="relative inline-block text-sm text-left">
              <select
                :disabled="options.State !== 'stopped'"
                id="startupAndShutdown__startView"
                x-model="itemData.startupAndShutdown__startView"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                @change="changed = true"
              >
                <option :selected="options['Startup and Shutdown']['Startup view'] === 'window'" value="window">
                  Window
                </option>
                <option
                  :selected="options['Startup and Shutdown']['Startup view'] === 'coherence'"
                  value="Coherence"
                >
                  Coherence
                </option>
                <option
                  :selected="options['Startup and Shutdown']['Startup view'] === 'fullscreen'"
                  value="fullscreen"
                >
                  Fullscreen
                </option>
                <option :selected="options['Startup and Shutdown']['Startup view'] === 'same'" value="same">
                  Same
                </option>
                <option :selected="options['Startup and Shutdown']['Startup view'] === 'modality'" value="modality">
                  Modality
                </option>
                <option :selected="options['Startup and Shutdown']['Startup view'] === 'headless'" value="headless">
                  Headless
                </option>
              </select>
            </div>
          </div>
        </li>
      </ul>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'optimization'">
        <li class="flex justify-center w-full mt-1 pt-1">
          <div class="flex flex-auto items-center justify-center">
            <h1 class="card-title text-xs">Not implemented yet</h1>
          </div>
        </li>
      </ul>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'shared'">
        <li class="flex justify-center w-full mt-1 pt-1">
          <div class="flex flex-auto items-center justify-center">
            <h1 class="card-title text-xs">Not implemented yet</h1>
          </div>
        </li>
      </ul>
      <ul role="list" class="divide-y divide-solid divide-gray-200" x-show="activeTab === 'advanced'">
        <li class="flex justify-center w-full mt-1 pt-1">
          <div class="flex flex-auto items-center justify-center">
            <h1 class="card-title text-xs">Not implemented yet</h1>
          </div>
        </li>
      </ul>
    </div>
    <div class="flex items-end justify-end p-4" x-show="changed === true">
      <button x-show="changed === true" type="button" class="btn btn-primary" @click="save()">Apply</button>
    </div>
  </div>
`;

  return generateHtml(context, panel, html, [script]);
}
