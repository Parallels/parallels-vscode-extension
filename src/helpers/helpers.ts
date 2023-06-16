import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
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

export function getFoldersBasePath(): string {
  let foldersBasePath = Provider.getSettings().get<string>("parallels-desktop.path");
  if (!foldersBasePath) {
    const homePath = cp.execSync(`echo $HOME`).toString();
    foldersBasePath = path.join(homePath.trim(), ".parallels-desktop-vscode");
    if (!fs.existsSync(foldersBasePath)) {
      fs.mkdirSync(foldersBasePath, {recursive: true});
    }
    return foldersBasePath;
  }

  return foldersBasePath;
}

export function getDownloadFolder(): string {
  let downloadFolder = Provider.getSettings().get<string>("parallels-desktop.downloadFolder");
  if (!downloadFolder) {
    downloadFolder = path.join(getFoldersBasePath(), "downloads");
  }

  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, {recursive: true});
  }

  return downloadFolder;
}

export function getPackerFilesFolder(): string {
  let packerFilesFolder = Provider.getSettings().get<string>("parallels-desktop.packerFilesFolder");
  if (!packerFilesFolder) {
    packerFilesFolder = path.join(getFoldersBasePath(), "packer-files");
  }

  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getScreenCaptureFolder(context: vscode.ExtensionContext): string {
  const packerFilesFolder = path.join(context.extensionPath , "screen-captures");
  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getVagrantBoxFolder(): string {
  let packerFilesFolder = Provider.getSettings().get<string>("parallels-desktop.vagrantBoxFolder");
  if (!packerFilesFolder) {
    packerFilesFolder = path.join(getFoldersBasePath(), "vagrant-boxes");
  }

  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getUserProfileFolder(): string {
  const packerFilesFolder = path.join(getFoldersBasePath(), "profile");

  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}
