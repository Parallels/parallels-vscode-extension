import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import {FLAG_PACKER_PATH, FLAG_PACKER_VERSION} from "../constants/flags";
import {Provider} from "../ioc/provider";
import {PackerVirtualMachineSpecs} from "../models/packerVirtualMachineSpecs";
import {parallelsOutputChannel} from "../helpers/channel";

const parallelsVersion = "1.0.1";
const vagrantVersion = "1.0.2";

export class PackerService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled() {
    return new Promise(resolve => {
      const packerPath = Provider.getCache().get(FLAG_PACKER_PATH);
      if (packerPath) {
        parallelsOutputChannel.appendLine(`Packer was found on path ${packerPath}`);
        return resolve(true);
      }

      cp.exec("which packer", err => {
        if (err) {
          parallelsOutputChannel.appendLine("Packer is not installed");
          parallelsOutputChannel.show();
          return resolve(false);
        }
        parallelsOutputChannel.appendLine(`Packer was found on path ${packerPath}`);
        Provider.getCache().set(FLAG_PACKER_VERSION, packerPath);
        return resolve(true);
      });
    });
  }

  static getVersion(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let version = Provider.getCache().get(FLAG_PACKER_VERSION);
      if (version) {
        parallelsOutputChannel.appendLine(`Packer ${version} was found in the system`);
        return resolve(true);
      }

      cp.exec("packer --version", (err, stdout, stderr) => {
        if (err) {
          parallelsOutputChannel.appendLine("Vagrant is not installed");
          parallelsOutputChannel.show();
          return resolve(false);
        }
        version = stdout.replace("\n", "").trim();
        parallelsOutputChannel.appendLine(`Packer ${version} was found in the system`);
        Provider.getCache().set(FLAG_PACKER_VERSION, version);
        return resolve(true);
      });
    });
  }

  static install(): Promise<boolean> {
    parallelsOutputChannel.show();
    parallelsOutputChannel.appendLine("Installing Packer...");
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`brew tap exited with code ${code}`);
          parallelsOutputChannel.show();
          return resolve(false);
        }
        const packer = cp.spawn("brew", ["install", "hashicorp/tap/packer"]);
        packer.stdout.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        packer.stderr.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        packer.on("close", code => {
          if (code !== 0) {
            parallelsOutputChannel.appendLine(`brew install exited with code ${code}`);
            parallelsOutputChannel.show();
            return resolve(false);
          }
          return resolve(true);
        });
      });
    });
  }

  getPackerConfig(specs: PackerVirtualMachineSpecs): string {
    let result = `
packer {
    required_version = ">= 1.7.0"

    required_plugins {
        parallels = {
        version = ">= ${parallelsVersion}"
        source  = "github.com/hashicorp/parallels"
        }`;
    if (specs.generateVagrantBox) {
      result += `

        vagrant = {
        version = ">= ${vagrantVersion}"
        source  = "github.com/hashicorp/vagrant"
        }`;
    }
    result += `
    }
}`;
    return result;
  }

  getProvisionerConfig(machine: PackerVirtualMachineSpecs): string {
    const hostname = machine.vmName.toLowerCase().replace(/ /g, "_").replace(/\./g, "_").replace(/\n/g, "");
    let result = `
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
  iso_checksum   = "${machine.isoChecksum}"`;
    if (machine.httpContents.length > 0) {
      result += `
  http_content = {`;
      for (const content of machine.httpContents) {
        switch (content) {
          case "user-data":
            result += `
    "/${machine.distro}/user-data" = templatefile("\${path.root}/http/${machine.distro}/user-data.pkrtpl.hcl", { username = "${machine.user}", hostname = "${hostname}", password = "${machine.sshEncryptedPassword}"})`;
            break;
          case "meta-data":
            result += `
    "/${machine.distro}/meta-data" = "instance-id: ${hostname} \\nlocal-hostname: ${hostname}\\n"`;
            break;
          case "preseed-hyperv.cfg":
            result += `
    "/${machine.distro}/perseed-hyperv.cfg" = templatefile("\${path.root}/http/${machine.distro}/preseed-hyperv.cfg.pkrtpl.hcl", { username = "${machine.user}", password = "${machine.password}"})`;
            break;
          case "preseed.cfg":
            result += `
    "/${machine.distro}/perseed.cfg" = templatefile("\${path.root}/http/${machine.distro}/preseed.cfg.pkrtpl.hcl", { username = "${machine.user}", password = "${machine.password}"})\n`;
            break;
        }
      }
      result += `
    }`;
    }

    result += `
  iso_urls = [
    "${machine.isoUrl}"
  ]
  memory           = ${machine.memory}
  output_directory = "${machine.outputFolder}"
  shutdown_command = "echo '${machine.user}'|sudo -S shutdown -P now"
  shutdown_timeout = "${machine.shutdownTimeout}"
  ssh_password     = "${machine.sshPassword}"
  ssh_port         = ${machine.sshPort}
  ssh_timeout      = "${machine.sshTimeout}"
  ssh_username     = "${machine.sshUsername}"
  ssh_wait_timeout = "${machine.sshWaitTimeout}"
  vm_name          = "${machine.vmName}"
}

`;
    return result;
  }

  getBuilderConfig(machine: PackerVirtualMachineSpecs): string {
    let header = `
build {
    name = "${machine.distro.toLowerCase()}"
    sources = [
    "source.parallels-iso.${machine.distro.toLowerCase()}"
    ]`;

    const baseScripts = this.getScriptsName("base", machine);
    if (baseScripts.length > 0) {
      header += `

    provisioner "shell" {
      environment_vars = [
        "HOME_DIR=/home/${machine.user}",
        "USERNAME=${machine.user}"
      ]
      
      scripts = [
${baseScripts
  .filter(f => f.indexOf("vagrant") < 0)
  ?.map(script => `        "\${path.root}/scripts/base/${script}"`)
  .join(",\n")}`;

      if (machine.generateVagrantBox) {
        header += `,
${baseScripts
  .filter(f => f.indexOf("vagrant") >= 0)
  ?.map(script => `          "\${path.root}/scripts/base/${script}"`)
  .join(",\n")}`;
      }
      header += `
      ]
            
        execute_command   = "echo '${machine.user}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
        expect_disconnect = true
    }\n`;
    }

    for (const addon of machine.addons) {
      header += `

    provisioner "shell" {
      environment_vars = [
          "HOME_DIR=/home/${machine.user}"
      ]
      scripts = [
          "\${path.root}/scripts/addons/${addon}.sh",
      ]
          
      execute_command   = "echo '${machine.user}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
      expect_disconnect = true
    }`;
    }

    if (machine.generateVagrantBox) {
      const outputFolder = machine.outputFolder.replace("output", "box");
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, {recursive: true});
      }
      header += `
    post-processor "vagrant" {
      compression_level    = 9
      keep_input_artifact  = false
      output               = "${outputFolder}/{{ .Provider }}_${machine.vmName.replace(/\s/g, "_").toLowerCase()}.box"
      vagrantfile_template = null
    }`;
    }

    header += `
}`;

    return header;
  }

  getScriptsName(type: string, machine: PackerVirtualMachineSpecs): string[] {
    const result: string[] = [];
    const extensionPath = this.context.extensionPath;
    const scriptsBasePath = `${extensionPath}/packer/scripts/${machine.base.toLowerCase()}/${machine.platform.toLowerCase()}/${machine.distro.toLowerCase()}/${type}/`;
    if (!fs.existsSync(scriptsBasePath)) {
      return result;
    }

    const files = fs.readdirSync(scriptsBasePath);

    for (const file of files) {
      result.push(file);
    }

    return result;
  }

  copyScripts(type: string, machine: PackerVirtualMachineSpecs) {
    parallelsOutputChannel.appendLine(`Copying ${type} scripts for ${machine.distro}...`);
    const extensionPath = this.context.extensionPath;
    const scriptsBasePath = `${extensionPath}/packer/scripts/${machine.base.toLowerCase()}/${machine.platform.toLowerCase()}/${machine.distro.toLowerCase()}/${type}/`;
    const machineBasePath = `${machine.folder}/scripts/${type}/`;

    if (fs.existsSync(machineBasePath)) {
      parallelsOutputChannel.appendLine(`Removing existing scripts for ${machine.distro}...`);
      fs.rmSync(machineBasePath, {recursive: true});
    }

    fs.mkdirSync(machineBasePath, {recursive: true});
    const files = fs.readdirSync(scriptsBasePath);
    for (const file of files) {
      parallelsOutputChannel.appendLine(`Copying script ${file}...`);
      const srcFile = `${scriptsBasePath}/${file}`;
      const destFile = `${machineBasePath}/${file}`;
      if (!fs.lstatSync(srcFile).isDirectory()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  copyAddonsFiles(machine: PackerVirtualMachineSpecs) {
    parallelsOutputChannel.appendLine(`Copying addons files for ${machine.distro}...`);
    const extensionPath = this.context.extensionPath;
    const scriptsBasePath = `${extensionPath}/packer/files/`;
    const machineBasePath = `${machine.folder}/files/`;

    if (fs.existsSync(machineBasePath)) {
      fs.rmSync(machineBasePath, {recursive: true});
    }

    fs.mkdirSync(machineBasePath, {recursive: true});
    const files = fs.readdirSync(scriptsBasePath);
    for (const file of files) {
      parallelsOutputChannel.appendLine(`Copying addon file ${file}...`);
      const srcFile = `${scriptsBasePath}/${file}`;
      const destFile = `${machineBasePath}/${file}`;
      if (!fs.lstatSync(srcFile).isDirectory()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  copyHttpContent(machine: PackerVirtualMachineSpecs) {
    parallelsOutputChannel.appendLine(`Copying http content for ${machine.distro}...`);
    const extensionPath = this.context.extensionPath;
    const httpContentBasePath = `${extensionPath}/packer/http/${machine.distro.toLowerCase()}`;
    const machineBasePath = `${machine.folder}/http/${machine.distro.toLowerCase()}`;

    if (fs.existsSync(machineBasePath)) {
      fs.rmSync(machineBasePath, {recursive: true});
    }

    fs.mkdirSync(machineBasePath, {recursive: true});
    for (const file of machine.httpContents) {
      if (fs.existsSync(`${httpContentBasePath}/${file}.pkrtpl.hcl`)) {
        const srcFile = `${httpContentBasePath}/${file}.pkrtpl.hcl`;
        const destFile = `${machineBasePath}/${file}.pkrtpl.hcl`;
        if (!fs.lstatSync(srcFile).isDirectory()) {
          parallelsOutputChannel.appendLine(`Copying http content ${file}...`);
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  }

  generatePackerFile(machine: PackerVirtualMachineSpecs): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (!machine.isoUrl || !machine.isoChecksum) {
          return reject("Error getting iso url or checksum");
        }
        if (fs.existsSync(machine.folder)) {
          parallelsOutputChannel.appendLine(`Deleting folder ${machine.folder}`);
          fs.rmSync(machine.folder, {recursive: true});
        }

        fs.mkdirSync(machine.folder, {recursive: true});

        parallelsOutputChannel.appendLine(`Creating folder ${machine.folder} and generating packer file`);
        const sourcesConfig = this.getProvisionerConfig(machine);
        this.copyScripts("base", machine);
        this.copyScripts("addons", machine);
        this.copyAddonsFiles(machine);
        this.copyHttpContent(machine);

        const packerConfig = this.getPackerConfig(machine);
        if (!packerConfig) {
          return reject("Error getting packer config");
        }

        fs.writeFileSync(path.join(machine.folder, `${machine.imgId}.pkr.hcl`), packerConfig);
        const provisionerConfig = this.getProvisionerConfig(machine);
        if (!provisionerConfig) {
          return reject("Error getting packer provisioner config");
        }
        fs.writeFileSync(path.join(machine.folder, `${machine.imgId}.provisioner.pkr.hcl`), provisionerConfig);
        const builderConfig = this.getBuilderConfig(machine);
        if (!builderConfig) {
          return reject("Error getting packer builder config");
        }
        fs.writeFileSync(path.join(machine.folder, `${machine.imgId}.build.pkr.hcl`), builderConfig);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  buildVm(machine: PackerVirtualMachineSpecs): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const filesResult = await this.generatePackerFile(machine);
        if (!filesResult) {
          return reject("Error generating packer files");
        }

        parallelsOutputChannel.appendLine(`starting to build vm ${machine.name}`);
        const packer = cp.spawn(
          "PYTHONPATH=/Library/Frameworks/ParallelsVirtualizationSDK.framework/Versions/Current/Libraries/Python/3.7",
          ["packer", `build .`],
          {
            cwd: machine.folder,
            shell: true
          }
        );
        packer.stdout.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        packer.stderr.on("data", data => {
          parallelsOutputChannel.appendLine(data);
          reject(data);
        });
        packer.on("close", code => {
          if (code !== 0) {
            parallelsOutputChannel.appendLine(`packer build exited with code ${code}`);
            return resolve(false);
          }
          return resolve(true);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static getToolsFlavor(os: string, platform: string): string {
    let result = "";
    platform = platform.toLowerCase();

    switch (os.toLowerCase()) {
      case "linux":
        if (platform === "arm64") {
          result = "lin-arm";
        } else {
          result = "lin";
        }
        break;
      case "windows":
        if (platform === "arm64") {
          result = "win-arm";
        } else {
          result = "win";
        }
        break;
      case "macos":
        if (platform === "arm64") {
          result = "mac-arm";
        } else {
          result = "mac";
        }
        break;
      default:
        result = "other";
        break;
    }

    return result;
  }
}
