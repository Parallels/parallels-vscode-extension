import * as vscode from "vscode";
import * as path from "path";
import {VirtualMachineProvider} from "../virtual_machine";
import {ParallelsVirtualMachineItem} from "../virtual_machine_item";
import {Provider} from "../../ioc/provider";
import {CommandsFlags} from "../../constants/flags";

let lastClickedTime: number | undefined;

export function registerItemClickCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewItemClick, async (item: ParallelsVirtualMachineItem) => {
      if (item.type !== "Group" && item.type !== "Snapshot") {
        const clickedTime = Date.now();
        if (lastClickedTime && clickedTime - lastClickedTime < 500) {
          const panel = vscode.window.createWebviewPanel(
            "catCoding", // Identifies the type of the webview. Used internally
            "Cat Coding", // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
              // Enable scripts in the webview
              enableScripts: true
            } // Webview options. More on these later.
          );

          const updateWebview = () => {
            panel.title = `VM: ${item.name}`;
            panel.iconPath = {
              light: vscode.Uri.file(path.join(__filename, "..", "..", "img", "light", `desktop.svg`)),
              dark: vscode.Uri.file(path.join(__filename, "..", "..", "img", "dark", `desktop.svg`))
            };

            panel.webview.html = getWebviewContent(item);
          };

          panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
              case "buttonAction":
                vscode.window.showInformationMessage(message.text);
                return;
            }
          });

          updateWebview();
        }

        lastClickedTime = clickedTime;
      }
    })
  );
}

function getWebviewContent(item: ParallelsVirtualMachineItem) {
  const test = __dirname;
  const test2 = __dirname + "/../views/test.html";
  // const html = fs.readFileSync(__dirname + "../views/test.html", "utf8");
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <style>
        .logo-container {
          position: absolute;
          top: 0;
          left: 0;
        }
  
        .form-container {
          position: relative;
          margin-top: 50px;
        }
      </style>
  
      <script>
        const vscode = acquireVsCodeApi();
  
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
      </script>
    </head>
  
    <body>
      <div class="logo-container">
        <img src="logo.png" alt="Logo" />
      </div>
  
      <div class="form-container">
        <h1>${item.name}</h1>
        <form id="myForm" onsubmit="event.preventDefault(); handleButtonAction();">
          <input type="text" id="inputField" placeholder="Enter text here" />
          <button type="submit">Submit</button>
        </form>
        <button onclick="handleButtonAction()">Submit</button>
      </div>
    </body>
  </html>`;
}
