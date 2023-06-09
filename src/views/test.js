document.addEventListener("alpine:init", () => {
  Alpine.data("vms", () => ({
    os: "undefined",
    platform: "undefined",
    distro: "undefined",
    image: "undefined",
    vmName: "undefined",
    isPosting: false,
    itemData: {
      cpu: 1,
      memory: 2048,
      disk: 65536,
      username: "parallels",
      password: "parallels",
      options: {
        startHeadless: false
      }
    },
    options: [
      {
        id: "windows",
        name: "Windows",
        platforms: [
          {
            id: "arm64",
            name: "ARM64",
            distros: [],
            images: [
              {
                id: "win-11",
                name: "Windows 11",
                distro: "",
                type: "internal",
                isoUrl: "",
                addons: [
                  {
                    id: "winget",
                    name: "WinGet",
                    deploy: false
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "linux",
        name: "Linux",
        platforms: [
          {
            id: "arm64",
            name: "ARM64",
            distros: [
              {
                id: "ubuntu",
                name: "Ubuntu",
                images: [
                  {
                    id: "ubuntu-20.04",
                    name: "Ubuntu 20.04",
                    distro: "ubuntu",
                    type: "packer",
                    isoUrl: "",
                    addons: [
                      {
                        id: "ui",
                        name: "User Interface",
                        deploy: false
                      },
                      {
                        id: "docker",
                        name: "Docker",
                        deploy: false
                      },
                      {
                        id: "vscode",
                        name: "Visual Studio Code",
                        deploy: false
                      }
                    ]
                  },
                  {
                    id: "ubuntu-server-22.04",
                    name: "Ubuntu Server 22.04 LTS",
                    distro: "ubuntu",
                    type: "packer",
                    isoUrl: "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04.2-live-server-arm64.iso",
                    addons: [
                      {
                        id: "ui",
                        name: "User Interface",
                        deploy: false
                      },
                      {
                        id: "docker",
                        name: "Docker",
                        deploy: false
                      },
                      {
                        id: "vscode",
                        name: "Visual Studio Code",
                        deploy: false
                      }
                    ]
                  },
                  {
                    id: "ubuntu-server-23.04",
                    name: "Ubuntu Server 22.04 LTS",
                    distro: "ubuntu",
                    type: "packer",
                    isoUrl: "https://cdimage.ubuntu.com/releases/23.04/release/ubuntu-23.04-live-server-arm64.iso",
                    addons: [
                      {
                        id: "ui",
                        name: "User Interface",
                        deploy: false
                      },
                      {
                        id: "docker",
                        name: "Docker",
                        deploy: false
                      },
                      {
                        id: "vscode",
                        name: "Visual Studio Code",
                        deploy: false
                      }
                    ]
                  }
                ]
              },
              {
                id: "kali",
                name: "Kali Linux",
                images: [
                  {
                    id: "kali-2021.2",
                    name: "Kali Linux 2021.2",
                    distro: "kiali",
                    type: "internal",
                    isoUrl: "",
                    addons: []
                  }
                ]
              },
              {
                id: "photon",
                name: "Photon OS",
                images: [
                  {
                    id: "photon-5.0",
                    name: "Photon OS 5.0 GA",
                    distro: "linux",
                    type: "iso",
                    isoUrl: "https://packages.vmware.com/photon/5.0/GA/iso/photon-5.0-dde71ec57.aarch64.iso",
                    addons: []
                  }
                ]
              }
            ],
            images: []
          },
          {
            id: "x86",
            name: "x86",
            distros: [],
            images: []
          }
        ]
      },
      {
        id: "macos",
        name: "MacOS",
        platforms: [
          {
            id: "arm64",
            name: "ARM64",
            distros: [],
            images: [
              {
                id: "macos13_22F66",
                name: "MacOS 13.4",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2023SpringFCS/fullrestores/032-84884/F97A22EE-9B5E-4FD5-94C1-B39DCEE8D80F/UniversalMac_13.4_22F66_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22E261",
                name: "MacOS 13.3.1",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-66602/418BC37A-FCD9-400A-B4FA-022A19576CD4/UniversalMac_13.3.1_22E261_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22E252",
                name: "MacOS 13.3",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2023WinterSeed/fullrestores/002-75537/8250FA0E-0962-46D6-8A90-57A390B9FFD7/UniversalMac_13.3_22E252_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22D68",
                name: "MacOS 13.2.1",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-48346/EFF99C1E-C408-4E7A-A448-12E1468AF06C/UniversalMac_13.2.1_22D68_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22C65",
                name: "MacOS 13.1",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2022FallFCS/fullrestores/012-60270/0A7F49BA-FC31-4AD9-8E45-49B1FB9128A6/UniversalMac_13.1_22C65_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22C65",
                name: "MacOS 13.0.1",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2022FallFCS/fullrestores/012-93802/A7270B0F-05F8-43D1-A9AD-40EF5699E82C/UniversalMac_13.0.1_22A400_Restore.ipsw",
                addons: []
              },
              {
                id: "macos13_22A380",
                name: "MacOS 13.0",
                distro: "",
                type: "macos",
                isoUrl:
                  "https://updates.cdn-apple.com/2022FallFCS/fullrestores/012-92188/2C38BCD1-2BFF-4A10-B358-94E8E28BE805/UniversalMac_13.0_22A380_Restore.ipsw",
                addons: []
              }
            ]
          }
        ]
      }
    ]
  }));
});
// const item = {
//   os: document.querySelector("#itemData__os")?.value ?? "undefined",
//   platform: document.querySelector("#itemData__platform")?.value ?? "undefined",
//   distro: document.querySelector("#itemData__distro")?.value ?? "undefined",
//   image: document.querySelector("#itemData__image").value ?? "undefined",
//   specs: {
//     cpu: document.querySelector("#itemData__specs__cpu")?.value ?? "undefined",
//     memory: document.querySelector("#itemData__specs__memory")?.value ?? "undefined",
//     disk: document.querySelector("#itemData__specs__disk")?.value ?? "undefined"
//   },
//   options: {
//     startHeadless: document.querySelector("#itemData__options__startHeadless").checked ?? false
//   },
//   addons: []
// };

// function handleButtonAction() {
//   // Get form inputs
//   const input = document.querySelector("#inputField").value;

//   // Send a message to the extension
//   vscode.postMessage({
//     command: "buttonAction",
//     text: input
//   });

//   // Clear input field
//   document.querySelector("#inputField").value = "";
// }

// function sendPdCommand(id, flag) {
//   console.log(item);
//   console.log("sendPdCommand", id, flag);
//   const input = document.querySelector("#" + id).value;
//   // Send a message to the extension
//   vscode.postMessage({
//     command: "setFlag",
//     text: `{"flag": "${flag}", "value": "${input}"}`
//   });
//   const v = document.querySelector("#" + id + "Value");
//   v.innerHTML = input;
// }

// function addAddon(id, state) {
//   console.log("addAddon: ", id, state);
//   if (item.addons.length === 0) {
//     item.addons.push({id: id, deploy: state});
//     return;
//   }

//   for (let i = 0; i < item.addons.length; i++) {
//     let found = false;
//     if (item.addons[i].id === id) {
//       console.log("found");
//       if (!state) {
//         item.addons.splice(i, 1);
//       }
//       found = true;
//       return;
//     }

//     if (!found) {
//       console.log("not found");
//       item.addons.push({id: id, deploy: state});
//     }
//   }
// }

// function post() {
//   console.log("post");
//   item.os = document.querySelector("#itemData__os")?.value ?? "undefined";
//   item.platform = document.querySelector("#itemData__platform")?.value ?? "undefined";
//   item.distro = document.querySelector("#itemData__distro")?.value ?? "undefined";
//   item.image = document.querySelector("#itemData__image").value ?? "undefined";
//   item.specs.cpu = document.querySelector("#itemData__specs__cpu")?.value ?? "undefined";
//   item.specs.memory = document.querySelector("#itemData__specs__memory")?.value ?? "undefined";
//   item.specs.disk = document.querySelector("#itemData__specs__disk")?.value ?? "undefined";
//   item.options.startHeadless = document.querySelector("#itemData__options__startHeadless").checked ?? false;

//   console.log(item);
// }
