import * as vscode from "vscode";
import * as path from "path";

import {VirtualMachineProvider} from "../virtual_machine";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {Provider} from "../../ioc/provider";
import {CommandsFlags} from "../../constants/flags";
import {VirtualMachine} from "../../models/virtualMachine";
import {generateHtml} from "../../views/header.html";
import {isDarkTheme} from "../../helpers/helpers";

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

        const updateWebview = () => {
          panel.title = `${item.name}`;
          panel.iconPath = {
            light: vscode.Uri.file(path.join(__filename, "..", "..", "img", "light", `desktop.svg`)),
            dark: vscode.Uri.file(path.join(__filename, "..", "..", "img", "dark", `desktop.svg`))
          };

          panel.webview.html = getWebviewContent(context, panel, item.item as VirtualMachine);
        };

        panel.webview.onDidReceiveMessage(message => {
          switch (message.command) {
            case "buttonAction":
              vscode.window.showInformationMessage(message.text);
              return;
            case "setFlag": {
              const cmd = JSON.parse(message.text);
              console.log(cmd.flag);
              console.log(cmd.value);
              vscode.window.showInformationMessage(message.text);
              panel.webview.postMessage({command: "updateFlag", text: cmd.value});
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

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, item: VirtualMachine) {
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media", "vscode.css")));
  const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media")));
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

  const script = `<script>
        const item = ${JSON.stringify(item)};
        function handleButtonAction() {
          // Get form inputs
          const input = document.querySelector("#inputField").value;

          // Send a message to the extension
          vscode.postMessage({
            command: "buttonAction",
            text: input
          });

          // Clear input field
          document.querySelector("#inputField").value = "";
        }

        function sendPdCommand(id,flag) {
          console.log(item);
          console.log("sendPdCommand",id,flag);
          const input = document.querySelector("#"+id).value;
          // Send a message to the extension
          vscode.postMessage({
            command: "setFlag",
            text: \`{"flag": "$\{flag}", "value": "$\{input}"}\`
          });
          const v = document.querySelector("#"+id+"Value");
          v.innerHTML = input;
        }
      </script>`;
  const html = `
    <div class="card-container">
      <ul role="list" class="divide-y divide-gray-200">
        <li class="flex justify-between gap-x-6 py-5">
          <div class="w-full flex gap-x-4">
            <img class="h-12 w-12 flex-none rounded-full bg-gray-50" src="${imageUri}${osImg}"/>
            <div class="min-w-0 flex-auto">
              <h1 class="card-title text-xl font-semibold">${item.Name}<span class="card-subtitle ml-2">${item.State}</span> </h1>
              <p class="mt-1 truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
                <h2 class="card-title">Description</h2>
                <p class="card-text">${item.Description}</p>
              </p>      
          </div>
          <div class-"hidden sm:flex sm:flex-col sm:items-end">
            <h2 class="card-subtitle">Id: ${item.ID}</h2>
          </div>
        </li>
      </ul>
    </div>
    <div class="card-container mt-3">
      <h2>Parallels Tools: <span class="text-indigo-600 dark:text-gray-400"> ${item.GuestTools.state}</h2>
      <h2>Operating System: <span class="text-indigo-600 dark:text-gray-400"> ${item.OS}</h2>
      <h2>Uptime: <span class="text-indigo-600 dark:text-gray-400"> ${item.Uptime}</h2>
      <h2>Home: <span class="text-indigo-600 dark:text-gray-400"> ${item.Home}</h2>
    </div>
    <div class="card-container mt-3">
      <h2 class="card-title">Startup</h2>
        <ul role="list" class="divide-y divide-gray-200">
        <li class="flex justify-between gap-x-6 py-5 items-center" x-data="{isEditing: false}">
          <div class="w-full flex gap-x-4 items-center">
            <div class="min-w-0 flex-auto">
              <p class="text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">AutoStart</p>
          </div>
          <div class-"hidden flex sm:flex sm:flex-col sm:items-center"  x-show="!isEditing">
            <h2 class="card-subtitle" id="autoStartValue">${item["Startup and Shutdown"].Autostart}</h2>
          </div>
          <div class="hidden sm:flex sm:flex-col sm:items-end" x-show="isEditing" >
            <div class="relative inline-block text-left" x-data="{ open: false }">
              <select id="autoStart" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                <option selected>Options</option>
                <option value="off">Off</option>
                <option value="open-window">Open Window</option>
                <option value="start-app">Start App</option>
                <option value="start-host">Start Host</option>
                <option value="user-login">User Login</option>
              </select>
            </div>
          </div>
          <div class-"hidden sm:flex sm:flex-col sm:items-end" x-show="!isEditing">
            <a class="btn btn-sm btn-primary text-xs" type="button" @click="isEditing = !isEditing">Edit</a>
          </div>
          <div class-"hidden sm:flex sm:flex-col sm:items-end" x-show="isEditing">
            <a class="btn btn-sm btn-primary text-xs" type="button" @click="isEditing = !isEditing;" onclick="sendPdCommand('autoStart','autostart')">Save</a>
          </div>
        </li>
      </ul>

            
        <form id="myForm" onsubmit="event.preventDefault(); handleButtonAction();">
          <input type="text" id="inputField" placeholder="Enter text here" />
          <button class="btn btn-primary hover:text-white hover:bg-blue-600" type="submit">Submit</button>
        </form>
        <button onclick="handleButtonAction()">Submit</button>
    </div>
`;

  return generateHtml(context, panel, html, [script]);
}
