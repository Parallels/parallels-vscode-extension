import * as path from "path";
import * as vscode from "vscode";

export function generateHtml(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  body: string,
  scripts: string[] = []
): string {
  const currentThemeKind = vscode.window.activeColorTheme.kind;
  let isDarkModeEnabled = false;
  if (currentThemeKind === vscode.ColorThemeKind.Dark) {
    isDarkModeEnabled = true;
  } else if (currentThemeKind === vscode.ColorThemeKind.Light) {
    isDarkModeEnabled = false;
  } else {
    isDarkModeEnabled = false;
  }
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media", "vscode.css")));
  const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media")));
  let logoUri = "/parallels_logo_light.svg";
  if (isDarkModeEnabled) {
    logoUri = "/parallels_logo_dark.svg";
  }
  const htmlHeader = `<!DOCTYPE html >
    <html lang="en" ${isDarkModeEnabled ? 'class="dark"' : ""}>
      <head>
      <link rel="stylesheet" type="text/css" href="${cssUri}">
      <script>
        const vscode = acquireVsCodeApi();
      </script>
      <script src="https://cdn.jsdelivr.net/gh/alpinejs/alpine@v2.x.x/dist/alpine.min.js" defer></script>
    </head>`;
  const htmlBody = `<body ${isDarkModeEnabled ? 'class="background-color"' : 'class="background-color"'}>
      ${body}
    </body>`;
  let htmlScripts = "";
  for (const script of scripts) {
    htmlScripts += `\n${script}\n`;
  }
  const htmlFooter = `</html>`;
  return htmlHeader + htmlBody + htmlScripts + htmlFooter;
}
