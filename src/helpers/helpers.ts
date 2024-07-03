import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
import {Provider} from "../ioc/provider";
import {
  FLAG_PARALLELS_EXTENSION_DOWNLOAD_PATH,
  FLAG_PARALLELS_EXTENSION_PATH,
  FLAG_VAGRANT_BOXES_PATH
} from "../constants/flags";

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
  let folderName = ".parallels-desktop-vscode";
  const os = Provider.getOs();
  let foldersBasePath = Provider.getSettings().get<string>(FLAG_PARALLELS_EXTENSION_PATH);
  if (os.toLowerCase().startsWith("win") && foldersBasePath?.startsWith("/")) {
    foldersBasePath = "";
  }
  let folderExists = false;
  if (foldersBasePath) {
    folderExists = fs.existsSync(foldersBasePath ?? "");
  }

  if (!foldersBasePath || !folderExists) {
    let homePath = "";
    if (os === "darwin" || os === "linux") {
      homePath = process.env.HOME ?? "";
    } else if (os.toLowerCase().startsWith("win")) {
      folderName = "ParallelsDesktop";
      homePath = process.env.APPDATA ?? "";
      if (!homePath) {
        homePath = process.env.USERPROFILE ?? "";
      }
      if (!homePath) {
        homePath = process.env.HOME ?? "";
      }
      if (!homePath) {
        homePath = "C:\\";
      }
    }

    foldersBasePath = path.join(homePath.trim(), folderName);
    if (!fs.existsSync(foldersBasePath)) {
      fs.mkdirSync(foldersBasePath, {recursive: true});
    }

    Provider.getSettings().update(FLAG_PARALLELS_EXTENSION_PATH, foldersBasePath, true);
    return foldersBasePath;
  }

  return foldersBasePath;
}

export function getDownloadFolder(): string {
  let downloadFolder = Provider.getSettings().get<string>(FLAG_PARALLELS_EXTENSION_DOWNLOAD_PATH);
  if (!downloadFolder) {
    downloadFolder = path.join(getFoldersBasePath(), "downloads");
    Provider.getSettings().update(FLAG_PARALLELS_EXTENSION_DOWNLOAD_PATH, downloadFolder, true);
  }

  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, {recursive: true});
  }

  return downloadFolder;
}

export function getPackerTemplateFolder(): string {
  const packerFilesFolder = path.join(getFoldersBasePath(), "packer-templates");
  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getScreenCaptureFolder(context: vscode.ExtensionContext): string {
  const packerFilesFolder = path.join(context.extensionPath, "screen-captures");
  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getVagrantBoxFolder(): string {
  let packerFilesFolder = Provider.getSettings().get<string>(FLAG_VAGRANT_BOXES_PATH);
  if (!packerFilesFolder) {
    packerFilesFolder = path.join(getFoldersBasePath(), "vagrant-boxes");
    Provider.getSettings().update(FLAG_VAGRANT_BOXES_PATH, packerFilesFolder, true);
  }

  if (!fs.existsSync(packerFilesFolder)) {
    fs.mkdirSync(packerFilesFolder, {recursive: true});
  }

  return packerFilesFolder;
}

export function getUserProfileFolder(): string {
  const userConfigFolder = path.join(getFoldersBasePath(), "profile");

  if (!fs.existsSync(userConfigFolder)) {
    fs.mkdirSync(userConfigFolder, {recursive: true});
  }

  return userConfigFolder;
}
