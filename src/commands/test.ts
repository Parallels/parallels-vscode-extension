import * as vscode from "vscode";

export function registerTestCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("parallels-desktop.test", async () => {
      const what = await vscode.window.showInputBox({
        prompt: "What do you want to do?",
        placeHolder: "Enter a command"
      });
      if (what) {
        // const uri = vscode.Uri.parse("parallels:" + what);
        // const doc = await vscode.workspace.openTextDocument(uri);
        // await vscode.window.showTextDocument(doc);
        const panel = vscode.window.createWebviewPanel(
          "catCoding", // Identifies the type of the webview. Used internally
          "Cat Coding", // Title of the panel displayed to the user
          vscode.ViewColumn.One, // Editor column to show the new webview panel in.
          {} // Webview options. More on these later.
        );

        let iteration = 0;
        const updateWebview = () => {
          const cat = iteration++ % 2 ? "Coding" : "Compiling";
          panel.title = cat;
          panel.iconPath = vscode.Uri.parse("../../img/light/desktop.svg");
          panel.webview.html = getWebviewContent(cat);
        };

        updateWebview();
        setInterval(updateWebview, 3000);
      }
    })
  );
}

function getWebviewContent(cat: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
</head>
<body>
    <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
    <p>Testing ${cat}</p>
</body>
</html>`;
}
