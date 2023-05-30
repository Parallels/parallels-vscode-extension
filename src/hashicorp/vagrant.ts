import * as vscode from 'vscode';
import * as copy from '../helpers/copy';
import * as cp from 'child_process';
import * as fs from 'fs';
import path = require('path');
import * as channel from '../helpers/channel';

export class Vagrant {
  parallelsVersion = '1.0.1';
  vagrantVersion = '1.0.2';

  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      cp.exec('packer --version', (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static install(): Promise<boolean> {
    channel.parallelsOutputChannel.show();
    channel.parallelsOutputChannel.appendLine('Installing Vagrant...');
    return new Promise((resolve, reject) => {
      let brew = cp.spawn('brew', ['tap', 'hashicorp/tap']);
      brew.stdout.on('data', (data) => {
        channel.parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on('data', (data) => {
        channel.parallelsOutputChannel.appendLine(data);
      });
      brew.on('close', (code) => {
        if (code !== 0) {
          channel.parallelsOutputChannel.appendLine(`brew tap exited with code ${code}`);
          return resolve(false);
        }
        let packer = cp.spawn('brew', ['install', 'hashicorp/tap/hashicorp-vagrant']);
        packer.stdout.on('data', (data) => {
          channel.parallelsOutputChannel.appendLine(data);
        });
        packer.stderr.on('data', (data) => {
          channel.parallelsOutputChannel.appendLine(data);
        });
        packer.on('close', (code) => {
          if (code !== 0) {
            channel.parallelsOutputChannel.appendLine(`brew install exited with code ${code}`);
            return resolve(false);
          }
          return resolve(true);
        });
      });
    });
  }

  async init(folder: string, boxFile: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (folder === '') {
        reject('Folder is not set');
        return;
      }

      folder = path.dirname(folder);

      const result = await copy.executeCommandInTerminal(`cd ${folder} && vagrant init ${boxFile} && exit`);
      if (result) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  async up(folder: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (folder === '') {
        reject('Folder is not set');
        return;
      }

      folder = path.dirname(folder);

      const result = await copy.executeCommandInTerminal(`cd ${folder} && vagrant up && exit`);
      if (result) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  async getCurrentBoxes(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const config = vscode.workspace.getConfiguration('parallels-desktop');
      const basePath = config.get<string>('output_path') ?? '';
      if (basePath === '') {
        reject('Output path is not set');
        return;
      }
      const files = copy.getFiles(basePath, '.box');
      files.forEach((file) => {
        const folder = path.dirname(file);
        if (!fs.existsSync(`${folder}/Vagrantfile`)) {
          this.init(folder, file).catch((err) => {
            console.log(err);
            reject(err);
          });
        }
      });

      resolve(files);
    });
  }
}
