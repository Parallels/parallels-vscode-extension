import {VirtualMachineSpecs} from "./virtual_machine_specs";
import * as vscode from "vscode";
import * as copy from "../helpers/copy";
import * as cp from "child_process";
import * as channel from "../helpers/channel";
import * as fs from "fs";

export class Packer {
  parallelsVersion = "1.0.1";
  vagrantVersion = "1.0.2";

  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      cp.exec("packer --version", (err, stdout, stderr) => {
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
    channel.parallelsOutputChannel.appendLine("Installing Packer...");
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
      brew.stdout.on("data", data => {
        channel.parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        channel.parallelsOutputChannel.appendLine(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          channel.parallelsOutputChannel.appendLine(`brew tap exited with code ${code}`);
          return resolve(false);
        }
        const packer = cp.spawn("brew", ["install", "hashicorp/tap/packer"]);
        packer.stdout.on("data", data => {
          channel.parallelsOutputChannel.appendLine(data);
        });
        packer.stderr.on("data", data => {
          channel.parallelsOutputChannel.appendLine(data);
        });
        packer.on("close", code => {
          if (code !== 0) {
            channel.parallelsOutputChannel.appendLine(`brew install exited with code ${code}`);
            return resolve(false);
          }
          return resolve(true);
        });
      });
    });
  }

  getPackerConfig(): string {
    return `
packer {
    required_version = ">= 1.7.0"
    required_plugins {
        parallels = {
        version = ">= ${this.parallelsVersion}"
        source  = "github.com/hashicorp/parallels"
        }
        vagrant = {
        version = ">= ${this.vagrantVersion}"
        source  = "github.com/hashicorp/vagrant"
        }
    }
}

`;
  }

  getSourcesConfig(machine: VirtualMachineSpecs): string {
    return `
source "parallels-iso" "${machine.distro.toLowerCase()}" {
  guest_os_type          = "${machine.distro.toLowerCase()}"
  parallels_tools_flavor = "${machine.toolsFlavor}"
  parallels_tools_mode   = "upload"
  prlctl = [
    ["set", "{{ .Name }}", "--efi-boot", "off"]
  ]
  prlctl_version_file = ".prlctl_version"
  boot_command = [
    ${machine.bootCommand.map(cmd => `"${cmd}"`).join(",\n")}
  ]
  boot_wait      = "${machine.bootWait}"
  cpus           = ${machine.cpus}
  communicator   = "ssh"
  disk_size      = "${machine.diskSize}"
  floppy_files   = null
  iso_checksum   = "${machine.isoChecksum}"
  http_directory = "\${path.root}/http"
  iso_urls = [
    "${machine.isoUrl}"
  ]
  memory           = ${machine.memory}
  output_directory = "parallels_${machine.vmName}"
  shutdown_command = "echo 'vagrant'|sudo -S shutdown -P now"
  shutdown_timeout = "${machine.shutdownTimeout}"
  ssh_password     = "${machine.sshPassword}"
  ssh_port         = ${machine.sshPort}
  ssh_timeout      = "${machine.sshTimeout}"
  ssh_username     = "${machine.sshUsername}"
  ssh_wait_timeout = "${machine.sshWaitTimeout}"
  vm_name          = "${machine.vmName}"
}

`;
  }

  getBuilderConfig(machine: VirtualMachineSpecs): string {
    const result = `
locals {
    enable_desktop = ${machine.addons.find(addon => addon === "enable_desktop") ? "true" : "false"}
    enable_vscode = ${machine.addons.find(addon => addon === "enable_vscode") ? "true" : "false"}
    enable_vscode_server = ${machine.addons.find(addon => addon === "enable_vscode_Server") ? "true" : "false"}
}
${this.getPackerConfig()}

build {
    name = "${machine.distro.toLowerCase()}"
    sources = [
    "source.parallels-iso.${machine.distro.toLowerCase()}"
    ]
    
    provisioner "shell" {
        environment_vars = [
            "HOME_DIR=/home/${machine.user}"
        ]
            
        scripts = [

${this.getScriptsName("base", machine)
  .map(script => `            "\${path.root}/scripts/base/${script}"`)
  .join(",\n")}
        ]
            
        execute_command   = "echo 'vagrant' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
        expect_disconnect = true
    }
    
    provisioner "file" {
        destination = "/parallels-tools/scripts/"
        source      = "\${path.root}/scripts/addons/"
        direction = "upload"
    }
    
    provisioner "file" {
        destination = "/parallels-tools/files/"
        source      = "\${path.root}/files/"
        direction = "upload"
    }
    
    provisioner "shell" {
        environment_vars = [
            "HOME_DIR=/home/vagrant"
        ]
        scripts = [
            "\${path.root}/scripts/addons/desktop.sh",
        ]
            
        execute_command   = "echo 'vagrant' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
        expect_disconnect = true
        except = local.enable_desktop ? [] : ["parallels-iso.${machine.distro.toLowerCase()}"]
    }
    
    provisioner "shell" {
        environment_vars = [
            "HOME_DIR=/home/vagrant"
        ]
        
        scripts = [
            "\${path.root}/scripts/addons/visual_studio_code.sh",
        ]
        
        execute_command   = "echo 'vagrant' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
        expect_disconnect = true
        except = local.enable_vscode || local.enable_vscode_server ? [] : ["parallels-iso.${machine.distro.toLowerCase()}"]
    }
    
    provisioner "shell" {
        environment_vars = [
            "HOME_DIR=/home/vagrant"
        ]
        
        scripts = [
            "\${path.root}/scripts/addons/visual_studio_code.sh",
        ]
        
        execute_command   = "echo 'vagrant' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
        expect_disconnect = true
        except = local.enable_vscode_server ? [] : ["parallels-iso.${machine.distro.toLowerCase()}"]
    }
    
    post-processor "vagrant" {
        compression_level    = 9
        keep_input_artifact  = false
        output               = "./builds/{{ .Provider }}_${machine.vmName}.box"
        vagrantfile_template = null
    }
}
`;
    return result;
  }

  getVirtualMachineSpecsPath(machine: VirtualMachineSpecs): string {
    const config = vscode.workspace.getConfiguration("parallels-desktop");
    const basePath = config.get<string>("output_path");
    return `${basePath}/${machine.vmName}`;
  }

  getScriptsName(type: string, machine: VirtualMachineSpecs): string[] {
    const result = [];
    const extensionPath = this.context.extensionPath;
    const scriptsBasePath = `${extensionPath}/packer/scripts/${machine.base.toLowerCase()}/${machine.platform.toLowerCase()}/${machine.distro.toLowerCase()}/${type}/`;
    const files = fs.readdirSync(scriptsBasePath);

    for (const file of files) {
      result.push(file);
    }

    return result;
  }

  copyScripts(type: string, machine: VirtualMachineSpecs) {
    const extensionPath = this.context.extensionPath;
    const machineBasePath = this.getVirtualMachineSpecsPath(machine);
    const scriptsBasePath = `${extensionPath}/packer/scripts/${machine.base.toLowerCase()}/${machine.platform.toLowerCase()}/${machine.distro.toLowerCase()}/${type}/`;

    fs.mkdirSync(`${machineBasePath}/scripts/${type}`, {recursive: true});
    const files = fs.readdirSync(scriptsBasePath);
    for (const file of files) {
      const srcFile = `${scriptsBasePath}/${file}`;
      const destFile = `${machineBasePath}/scripts/${type}/${file}`;
      if (!fs.lstatSync(srcFile).isDirectory()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  copyAddonsFiles(machine: VirtualMachineSpecs) {
    const extensionPath = this.context.extensionPath;
    const machineBasePath = this.getVirtualMachineSpecsPath(machine);
    const scriptsBasePath = `${extensionPath}/packer/files/`;

    fs.mkdirSync(`${machineBasePath}/files`, {recursive: true});
    const files = fs.readdirSync(scriptsBasePath);
    for (const file of files) {
      const srcFile = `${scriptsBasePath}/${file}`;
      const destFile = `${machineBasePath}/files/${file}`;
      if (!fs.lstatSync(srcFile).isDirectory()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  generateHttpFiles(machine: VirtualMachineSpecs) {
    const extensionPath = this.context.extensionPath;
    const machineBasePath = this.getVirtualMachineSpecsPath(machine);
    const scriptsBasePath = `${extensionPath}/packer/http/`;

    fs.mkdirSync(`${machineBasePath}/http`, {recursive: true});
    copy.copyFiles(scriptsBasePath, `${machineBasePath}/http/`);
  }

  generatePackerFile(machine: VirtualMachineSpecs) {
    const destinationFolder = this.getVirtualMachineSpecsPath(machine);
    fs.mkdirSync(this.getVirtualMachineSpecsPath(machine), {recursive: true});
    const builderConfig = this.getBuilderConfig(machine);
    const sourcesConfig = this.getSourcesConfig(machine);
    this.copyScripts("base", machine);
    this.copyScripts("addons", machine);
    this.copyAddonsFiles(machine);
    this.generateHttpFiles(machine);

    fs.writeFileSync(`${destinationFolder}/packer.builder.pkr.hcl`, builderConfig);
    fs.writeFileSync(`${destinationFolder}/packer.sources.pkr.hcl`, sourcesConfig);
  }

  async build(machine: VirtualMachineSpecs): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      this.generatePackerFile(machine);
      const destinationFolder = this.getVirtualMachineSpecsPath(machine);
      const result = await copy.executeCommandInTerminal(
        `cd ${destinationFolder} && PYTHONPATH=/Library/Frameworks/ParallelsVirtualizationSDK.framework/Versions/Current/Libraries/Python/3.7 packer build .`
      );
      if (result) {
        resolve(true);
      } else {
        reject(false);
      }
    });
  }
}
