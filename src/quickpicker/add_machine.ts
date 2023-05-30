import {stat} from "fs";
import {
  QuickPickItem,
  window,
  Disposable,
  CancellationToken,
  QuickInputButton,
  QuickInput,
  ExtensionContext,
  QuickInputButtons,
  Uri
} from "vscode";
import {VirtualMachineSpecs} from "../hashicorp/virtual_machine_specs";
import {Packer} from "../hashicorp/packer";
import * as vscode from "vscode";
import {Vagrant} from "../hashicorp/vagrant";
import * as fs from "fs";
import {rejects} from "assert";

export interface VirtualMachineImage {
  base: "linux" | "windows";
  distro: string;
  platform: "x86_64" | "arm64" | string;
  title: string;
  isoUrl: string;
  isoChecksum?: string;
  bootCommand?: string[];
  bootWait?: string;
  cpuCount?: number;
  memorySize?: number;
  diskSize?: number;
  shutdownCommand?: string;
  shutdownTimeout?: string;
  defaultUsername?: string;
  defaultPassword?: string;
}

export async function addVirtualMachineInput(guestOs: string, context: ExtensionContext) {
  class MyButton implements QuickInputButton {
    constructor(public iconPath: {light: Uri; dark: Uri}, public tooltip: string) {}
  }
  const title = "Create Virtual Machine";

  // TODO: add more distros
  const availableImages: VirtualMachineImage[] = [
    {
      base: "windows",
      distro: "Windows 11",
      title: "Windows 11",
      platform: "x86_64",
      isoUrl: "https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img"
    },
    {
      base: "windows",
      distro: "Windows 11",
      title: "Windows 11 ARM",
      platform: "arm64",
      isoUrl: "https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img"
    },
    {
      base: "linux",
      distro: "Ubuntu",
      title: "Ubuntu Server 20.04 LTS",
      platform: "x86_64",
      isoUrl: "https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img"
    },
    {
      base: "linux",
      distro: "Ubuntu",
      title: "Ubuntu Server 22.04 LTS",
      platform: "arm64",
      isoUrl: "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04.2-live-server-arm64.iso",
      isoChecksum: "file:https://cdimage.ubuntu.com/releases/22.04/release/SHA256SUMS",
      bootCommand: [
        "<wait>e<wait><down><down><down><end><wait> autoinstall ds=nocloud-net\\\\;s=http://{{.HTTPIP}}:{{.HTTPPort}}/ubuntu/<f10><wait>"
      ],
      bootWait: "10s",
      cpuCount: 2,
      memorySize: 4092,
      diskSize: 65535,
      shutdownCommand: "echo 'vagrant'|sudo -S shutdown -P now",
      shutdownTimeout: "15m"
    },
    {
      base: "linux",
      distro: "Ubuntu",
      title: "Ubuntu Server 22.10",
      platform: "arm64",
      isoUrl: "https://cdimage.ubuntu.com/releases/22.10/release/ubuntu-22.10-live-server-arm64.iso",
      isoChecksum: "file:https://cdimage.ubuntu.com/releases/22.10/release/SHA256SUMS",
      bootCommand: [
        "<wait>e<wait><down><down><down><end><wait> autoinstall ds=nocloud-net\\\\;s=http://{{.HTTPIP}}:{{.HTTPPort}}/ubuntu/<f10><wait>"
      ],
      bootWait: "10s",
      cpuCount: 2,
      memorySize: 4092,
      diskSize: 35655,
      shutdownCommand: "echo 'vagrant'|sudo -S shutdown -P now",
      shutdownTimeout: "15m"
    },
    {
      base: "linux",
      distro: "Fedora",
      title: "Some Fedora",
      platform: "arm64",
      isoUrl: "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04.2-live-server-arm64.iso"
    }
  ];

  const availableDistributions = [
    ...new Set(availableImages.filter(image => image.base === guestOs).map(image => image.distro))
  ];

  const memoryOptions: QuickPickItem[] = [
    {label: "1024", description: "1 GB"},
    {label: "2048", description: "2 GB"},
    {label: "4096", description: "4 GB"},
    {label: "8192", description: "8 GB"}
  ];

  const availableAddons: QuickPickItem[] = [
    {label: "GUI", detail: "enable_desktop"},
    {label: "Visual Studio Code", detail: "enable_vscode"},
    {label: "Visual Studio Code Server", detail: "enable_vscode_server"},
    {label: "Go", detail: "enable_go"}
  ];

  interface State {
    title: string;
    step: number;
    totalSteps: number;
    base: string;
    vm: VirtualMachineImage | undefined;
    distro: QuickPickItem | string;
    platform: QuickPickItem | string;
    cpus: number;
    memory: number;
    diskSize: number;
    username: string;
    password: string;
    addons: QuickPickItem[];
    isoUrl: string;
    name: string;
    vmName: string;
    runtime: QuickPickItem;
  }

  async function collectInputs() {
    const state = {
      base: guestOs
    } as Partial<State>;
    await MultiStepInput.run(input => pickDistro(input, state));
    return state as State;
  }

  async function pickDistro(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showQuickPick({
      title,
      step: 1,
      totalSteps: 5,
      placeholder: "Pick distro",
      items: availableDistributions.map(distro => ({label: distro})),
      activeItem: typeof state.platform !== "string" ? state.platform : undefined,
      shouldResume: shouldResume
    });

    state.distro = pick;
    console.log(state);
    return (input: MultiStepInput) => pickPlatform(input, state);
  }

  async function pickPlatform(input: MultiStepInput, state: Partial<State>) {
    const distro = typeof state.distro === "string" ? state.distro : state.distro?.label;

    const platforms = availableImages
      .filter(image => image.distro === distro && image.base === guestOs)
      .map(image => ({label: image.platform}));
    const pick = await input.showQuickPick({
      title,
      step: 2,
      totalSteps: 5,
      placeholder: "Pick a platform",
      items: platforms,
      activeItem: typeof state.platform !== "string" ? state.platform : undefined,
      shouldResume: shouldResume
    });

    state.platform = pick;
    console.log(state);
    return (input: MultiStepInput) => pickImage(input, state);
  }

  async function pickImage(input: MultiStepInput, state: Partial<State>) {
    const platform = typeof state.platform === "string" ? state.platform : state.platform?.label;
    const distro = typeof state.distro === "string" ? state.distro : state.distro?.label;
    const images = availableImages.filter(image => image.platform === platform && image.distro === distro);

    const pick = await input.showQuickPick({
      title,
      step: 3,
      totalSteps: 5,
      placeholder: "Pick an image",
      items: images.map(image => ({label: image.title, description: image.distro, detail: image.isoUrl})),
      activeItem: typeof state.platform !== "string" ? state.platform : undefined,
      shouldResume: shouldResume
    });

    state.isoUrl = pick.detail;
    state.name = pick.label;
    state.vm = availableImages.find(image => image.title === pick.label);

    console.log(state);
    return (input: MultiStepInput) => pickCpu(input, state);
  }

  async function pickCpu(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showInputBox({
      title,
      step: 4,
      totalSteps: 5,
      value: state.vm?.cpuCount?.toString() ?? "2",
      prompt: "How many CPUs?",
      validate: validateIsNumber,
      shouldResume: shouldResume
    });

    state.cpus = parseInt(pick);
    console.log(state);
    return (input: MultiStepInput) => pickMemory(input, state);
  }

  async function pickMemory(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showQuickPick({
      title,
      step: 5,
      totalSteps: 5,
      placeholder: "How much memory?",
      items: memoryOptions,
      activeItem: memoryOptions.find(item => item.label === state.vm?.memorySize?.toString() ?? "2048"),
      validate: validateIsNumber,
      shouldResume: shouldResume
    });

    state.memory = parseInt(pick.label);
    console.log(state);
    return (input: MultiStepInput) => pickDiskSize(input, state);
  }

  async function pickDiskSize(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showInputBox({
      title,
      step: 6,
      totalSteps: 5,
      value: state.vm?.diskSize?.toString() ?? "65536",
      prompt: "What is the size of the disk?",
      validate: validateIsNumber,
      shouldResume: shouldResume
    });

    state.diskSize = parseInt(pick);
    console.log(state);
    return (input: MultiStepInput) => pickUsername(input, state);
  }

  async function pickUsername(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showInputBox({
      title,
      step: 7,
      totalSteps: 5,
      value: state.vm?.defaultUsername?.toString() ?? "vagrant",
      prompt: "What is the username?",
      validate: validateAlwaysTrue,
      shouldResume: shouldResume
    });

    state.username = pick;
    console.log(state);
    return (input: MultiStepInput) => pickPassword(input, state);
  }

  async function pickPassword(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showInputBox({
      title,
      step: 8,
      totalSteps: 5,
      value: state.vm?.defaultPassword?.toString() ?? "vagrant",
      prompt: "What is the password?",
      validate: validateAlwaysTrue,
      shouldResume: shouldResume
    });

    state.password = pick;
    console.log(state);
    return (input: MultiStepInput) => pickAddons(input, state);
  }

  async function pickAddons(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showQuickMultiPick({
      title,
      step: 9,
      totalSteps: 5,
      placeholder: "What addons do you want?",
      items: availableAddons,
      canSelectMany: true,
      shouldResume: shouldResume
    });

    (pick as any).forEach((addon: QuickPickItem) => {
      if (state.addons === undefined) {
        state.addons = [];
      }
      state.addons.push(addon);
    });
    console.log(pick);
    console.log(state);
    return (input: MultiStepInput) => pickImageName(input, state);
  }

  async function pickImageName(input: MultiStepInput, state: Partial<State>) {
    const platform = typeof state.platform === "string" ? state.platform : state.platform?.label;
    const defaultName = `${state.name}_${platform}`.replace(/ /g, "_").toLowerCase();
    const pick = await input.showInputBox({
      title,
      step: 10,
      totalSteps: 5,
      value: defaultName,
      prompt: "What is the Virtual Machine Name?",
      validate: validateAlwaysTrue,
      shouldResume: shouldResume
    });

    state.vmName = pick;
    console.log(state);
  }

  function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((resolve, reject) => {
      // noop
    });
  }

  async function validateIsNumber(value: string) {
    // ...validate...
    await new Promise(resolve => setTimeout(resolve, 1000));
    return isNaN(Number(value)) ? "Must be a number" : undefined;
  }

  async function validateAlwaysTrue(value: string) {
    // ...validate...
    await new Promise(resolve => setTimeout(resolve, 1000));
    return undefined;
  }

  function getToolsFlavor(state: State): string {
    const platform = typeof state.platform === "string" ? state.platform : state.platform?.label;
    let result = "";
    switch (state.base) {
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
      case "mac":
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

  const state = await collectInputs();

  console.log("done");
  console.log(state);
  const toolsFlavor = getToolsFlavor(state);
  const distro = typeof state.distro === "string" ? state.distro : state.distro?.label;

  const result: VirtualMachineSpecs = {
    guestOs: distro,
    base: state.base,
    toolsFlavor: toolsFlavor,
    name: state.vmName,
    memory: state.memory,
    diskSize: state.diskSize,
    bootCommand: state.vm?.bootCommand ?? [],
    bootWait: state.vm?.bootWait ?? "10s",
    cpus: state.vm?.cpuCount ?? 1,
    isoUrl: state.vm?.isoUrl ?? "",
    isoChecksum: state.vm?.isoChecksum ?? "",
    shutdownCommand: state.vm?.shutdownCommand ?? "",
    shutdownTimeout: state.vm?.shutdownTimeout ?? "15m",
    sshPassword: "vagrant",
    sshPort: 22,
    sshTimeout: "60m",
    sshUsername: "vagrant",
    sshWaitTimeout: "10000s",
    vmName: state.vmName,
    user: state.username,
    password: state.password,
    platform: typeof state.platform === "string" ? state.platform : state.platform?.label,
    distro: typeof state.distro === "string" ? state.distro : state.distro?.label,
    addons: state.addons === undefined ? [] : state.addons.map(addon => addon.detail ?? "unknown")
  };

  const svc = new Packer(context);
  const vagrant = new Vagrant(context);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Packing Virtual Machine"
    },
    async (progress, token) => {
      let runResult = false;
      progress.report({message: "Running Hashicorp Packer"});
      if (token.isCancellationRequested) {
        return Promise.reject("Operation canceled by user.");
      }
      runResult = await svc.build(result).catch(err => {
        console.log(err);
        return Promise.reject("Failed to pack");
      });

      if (!runResult) {
        return Promise.reject("Failed to pack");
      }
      const basePath = svc.getVirtualMachineSpecsPath(result);
      const boxPath = `${basePath}/builds/parallels_${result.vmName}.box`;
      if (!fs.existsSync(boxPath)) {
        return Promise.reject(`Box file not found at ${boxPath}`);
      }

      progress.report({message: "Adding Virtual Machine to Vagrant"});
      runResult = await vagrant.init(boxPath, `parallels_${result.vmName}.box`).catch(err => {
        console.log(err);
        return Promise.reject("Failed to add box to Vagrant");
      });
      if (!runResult) {
        return Promise.reject("Failed to add box to Vagrant");
      }

      progress.report({message: "Starting Virtual Machine"});
      runResult = await vagrant.up(boxPath).catch(err => {
        console.log(err);
        return Promise.reject("Failed to start Virtual Machine");
      });
      if (!runResult) {
        return Promise.reject("Failed to start Virtual Machine");
      }

      return Promise.resolve();
    }
  );

  window.showInformationMessage(`Creating Application Service '${state.vmName}'`);
}

// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------

class InputFlowAction {
  static back = new InputFlowAction();
  static cancel = new InputFlowAction();
  static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
  title: string;
  step: number;
  totalSteps: number;
  items: T[];
  activeItem?: T;
  ignoreFocusOut?: boolean;
  placeholder: string;
  canSelectMany?: boolean;
  buttons?: QuickInputButton[];
  shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
  title: string;
  step: number;
  totalSteps: number;
  value: string;
  prompt: string;
  validate: (value: string) => Promise<string | undefined>;
  buttons?: QuickInputButton[];
  ignoreFocusOut?: boolean;
  placeholder?: string;
  shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {
  static async run<T>(start: InputStep) {
    const input = new MultiStepInput();
    return input.stepThrough(start);
  }

  private current?: QuickInput;
  private steps: InputStep[] = [];

  private async stepThrough<T>(start: InputStep) {
    let step: InputStep | void = start;
    while (step) {
      this.steps.push(step);
      if (this.current) {
        this.current.enabled = false;
        this.current.busy = true;
      }
      try {
        step = await step(this);
      } catch (err) {
        if (err === InputFlowAction.back) {
          this.steps.pop();
          step = this.steps.pop();
        } else if (err === InputFlowAction.resume) {
          step = this.steps.pop();
        } else if (err === InputFlowAction.cancel) {
          step = undefined;
        } else {
          throw err;
        }
      }
    }
    if (this.current) {
      this.current.dispose();
    }
  }

  async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({
    title,
    step,
    totalSteps,
    items,
    canSelectMany,
    activeItem,
    ignoreFocusOut,
    placeholder,
    buttons,
    shouldResume
  }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<T | (P extends {buttons: (infer I)[]} ? I : never)>((resolve, reject) => {
        const input = window.createQuickPick<T>();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.ignoreFocusOut = ignoreFocusOut ?? false;
        input.placeholder = placeholder;
        input.items = items;
        input.canSelectMany = canSelectMany ?? false;
        if (activeItem) {
          input.activeItems = [activeItem];
        }
        input.buttons = [...(this.steps.length > 1 ? [QuickInputButtons.Back] : []), ...(buttons || [])];
        disposables.push(
          input.onDidTriggerButton(item => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(<any>item);
            }
          }),
          input.onDidChangeSelection(items => resolve(items[0])),
          input.onDidHide(() => {
            (async () => {
              reject(shouldResume && (await shouldResume()) ? InputFlowAction.resume : InputFlowAction.cancel);
            })().catch(reject);
          })
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }

  async showQuickMultiPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({
    title,
    step,
    totalSteps,
    items,
    canSelectMany,
    activeItem,
    ignoreFocusOut,
    placeholder,
    buttons,
    shouldResume
  }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<T | (P extends {buttons: (infer I)[]} ? I : never)>((resolve, reject) => {
        const input = window.createQuickPick<T>();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.ignoreFocusOut = ignoreFocusOut ?? false;
        input.placeholder = placeholder;
        input.items = items;
        input.canSelectMany = canSelectMany ?? false;
        if (activeItem) {
          input.activeItems = [activeItem];
        }
        input.buttons = [...(this.steps.length > 1 ? [QuickInputButtons.Back] : []), ...(buttons || [])];
        disposables.push(
          input.onDidTriggerButton(item => {
            console.log(item);
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(<any>item);
            }
          }),
          input.onDidAccept(() => {
            console.log("testing");
            resolve(<any>input.selectedItems);
          }),
          input.onDidHide(() => {
            (async () => {
              reject(shouldResume && (await shouldResume()) ? InputFlowAction.resume : InputFlowAction.cancel);
            })().catch(reject);
          })
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }

  async showInputBox<P extends InputBoxParameters>({
    title,
    step,
    totalSteps,
    value,
    prompt,
    validate,
    buttons,
    ignoreFocusOut,
    placeholder,
    shouldResume
  }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<string | (P extends {buttons: (infer I)[]} ? I : never)>((resolve, reject) => {
        const input = window.createInputBox();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.value = value || "";
        input.prompt = prompt;
        input.ignoreFocusOut = ignoreFocusOut ?? false;
        input.placeholder = placeholder;
        input.buttons = [...(this.steps.length > 1 ? [QuickInputButtons.Back] : []), ...(buttons || [])];
        let validating = validate("");
        disposables.push(
          input.onDidTriggerButton(item => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(<any>item);
            }
          }),
          input.onDidAccept(async () => {
            const value = input.value;
            input.enabled = false;
            input.busy = true;
            if (!(await validate(value))) {
              resolve(value);
            }
            input.enabled = true;
            input.busy = false;
          }),
          input.onDidChangeValue(async text => {
            const current = validate(text);
            validating = current;
            const validationMessage = await current;
            if (current === validating) {
              input.validationMessage = validationMessage;
            }
          }),
          input.onDidHide(() => {
            (async () => {
              reject(shouldResume && (await shouldResume()) ? InputFlowAction.resume : InputFlowAction.cancel);
            })().catch(reject);
          })
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }
}
