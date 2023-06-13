import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export function copyFiles(sourceDir: string, destDir: string) {
  const files = fs.readdirSync(sourceDir);

  for (const file of files) {
    const srcFile = path.join(sourceDir, file);
    const destFile = path.join(destDir, file);

    if (fs.lstatSync(srcFile).isDirectory()) {
      // Recursively copy directories
      fs.mkdirSync(destFile, {recursive: true});
      copyFiles(srcFile, destFile);
    } else {
      // Copy files
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

export function getFiles(sourceDir: string, extensionFilter = ""): string[] {
  const result: string[] = [];
  const files = fs.readdirSync(sourceDir);

  for (const file of files) {
    const srcFile = path.join(sourceDir, file);

    if (fs.lstatSync(srcFile).isDirectory()) {
      const subResult = getFiles(srcFile, extensionFilter);
      subResult.forEach(subFile => {
        result.push(subFile);
      });
    } else {
      if (extensionFilter !== "" && !srcFile.endsWith(extensionFilter)) {
        continue;
      }
      result.push(srcFile);
    }
  }

  return result;
}

export async function executeCommandInTerminal(command: string): Promise<boolean> {
  command = `${command} && exit`;
  const terminal = vscode.window.createTerminal({name: "Parallels Desktop"});

  // Wait for the terminal to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send the command to the terminal
  terminal.sendText(command);

  // Wait for the command to complete
  return new Promise((resolve, reject) => {
    const disposable = vscode.window.onDidCloseTerminal(event => {
      event.exitStatus?.code === 0 ? resolve(true) : reject(false);
    });
  });
}
