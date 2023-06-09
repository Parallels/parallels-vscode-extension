import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {Provider} from "../ioc/provider";

export function isDarkTheme(): boolean {
  const currentThemeKind = vscode.window.activeColorTheme.kind;
  let isDarkModeEnabled = false;
  if (currentThemeKind === vscode.ColorThemeKind.Dark) {
    isDarkModeEnabled = true;
  } else if (currentThemeKind === vscode.ColorThemeKind.Light) {
    isDarkModeEnabled = false;
  } else {
    isDarkModeEnabled = false;
  }
  return isDarkModeEnabled;
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getDownloadFolder(context: vscode.ExtensionContext): string {
  let downloadFolder = Provider.getSettings().get<string>("parallels-desktop.downloadFolder");
  if (!downloadFolder) {
    downloadFolder = path.join(context.extensionPath, "downloads");
  }

  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, {recursive: true});
  }

  return downloadFolder;
}

export function getPackerFilesFolder(context: vscode.ExtensionContext): string {
  let packerFilesFolder = Provider.getSettings().get<string>("parallels-desktop.packerFilesFolder");
  if (!packerFilesFolder) {
    packerFilesFolder = path.join(context.extensionPath, "packer-files");
  }

  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}
