import * as fs from "fs";
import * as vscode from "vscode";
import {VagrantService} from "../hashicorp/vagrant";
import {Provider} from "../ioc/provider";
import {VirtualMachineGroup} from "../models/groups";

export function registerTestCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("parallels-desktop.test", async () => {
      const config = Provider.getConfiguration();
      const what = await vscode.window.showInputBox({
        prompt: "What do you want to do?",
        placeHolder: "Enter a command"
      });
      const installed = VagrantService.isInstalled();
      if (what) {
        config.addVirtualMachineGroup(new VirtualMachineGroup(what));
        // const uri = vscode.Uri.parse("parallels:" + what);
        // const doc = await vscode.workspace.openTextDocument(uri);
        // await vscode.window.showTextDocument(doc);
        const panel = vscode.window.createWebviewPanel(
          "catCoding", // Identifies the type of the webview. Used internally
          "Cat Coding", // Title of the panel displayed to the user
          vscode.ViewColumn.One, // Editor column to show the new webview panel in.
          {
            // Enable scripts in the webview
            enableScripts: true
          } // Webview options. More on these later.
        );

        let iteration = 0;
        const updateWebview = () => {
          const cat = iteration++ % 2 ? "Coding" : "Compiling";
          panel.title = cat;
          panel.webview.html = getWebviewContent(cat);
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
    })
  );
}

function getWebviewContent(cat: string) {
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
        <form id="myForm" onsubmit="event.preventDefault(); handleButtonAction();">
          <input type="text" id="inputField" placeholder="Enter text here" />
          <button type="submit">Submit</button>
        </form>
        <button onclick="handleButtonAction()">Submit</button>
      </div>
    </body>
  </html>`;
}
