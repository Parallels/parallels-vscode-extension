import * as vscode from "vscode";
import {DockerContainer as DockerContainer} from "../models/docker/dockerContainer";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {LogService} from "./logService";
import {DockerImage} from "../models/docker/dockerImage";

export enum DockerContainerOperation {
  Start = "start",
  Stop = "stop",
  Restart = "restart",
  Pause = "pause",
  Resume = "unpause",
  Remove = "rm"
}

export enum DockerImageOperation {
  Remove = "rm"
}

export class DockerService {
  constructor(private context: vscode.ExtensionContext) {}

  static getVmContainers(vmId: string): Promise<DockerContainer[]> {
    return new Promise(async (resolve, reject) => {
      try {
        LogService.info(`Getting Docker docker from VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, "sudo docker ps -a --no-trunc --format '{{ json . }}'")
          .then((imagesOut: string) => {
            const containerLines = imagesOut.split("\n");
            const containers: DockerContainer[] = [];
            containerLines.forEach((line: string) => {
              if (line === "") {
                return;
              }
              const container = JSON.parse(line.replace(/\\\\/g, "\\"));
              containers.push({
                Command: container.Command,
                CreatedAt: container.CreatedAt,
                ID: container.ID,
                Image: container.Image,
                Labels: container.Labels,
                LocalVolumes: container.LocalVolumes,
                Mounts: container.Mounts,
                Names: container.Names,
                Networks: container.Networks,
                Ports: container.Ports,
                RunningFor: container.RunningFor,
                Size: container.Size,
                State: container.State,
                Status: container.Status
              });
            });
            LogService.info(`Got ${containers.length} Docker containers from VM ${vmId}`, "DockerService");
            return resolve(containers);
          })
          .catch((error: any) => {
            LogService.error(
              `Error getting Docker containers from VM ${vmId}, either docker is not enabled or machine is not started`,
              "DockerService"
            );
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  static getVmDockerImages(vmId: string): Promise<DockerImage[]> {
    return new Promise(async (resolve, reject) => {
      try {
        LogService.info(`Getting Docker images from VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, "sudo docker image ls -a --format '{{ json . }}'")
          .then((imagesOut: string) => {
            const imageLines = imagesOut.split("\n");
            const images: DockerImage[] = [];
            imageLines.forEach((line: string) => {
              if (line === "") {
                return;
              }
              const container = JSON.parse(line.replace(/\\\\/g, "\\"));
              const existingImage = images.find(img => img.ID === container.ID);
              if (existingImage) {
                // just add the tag to the existing image
                existingImage.Tag += `, ${container.Tag}`;
                return;
              }
              images.push({
                Containers: container.Container,
                CreatedAt: container.CreatedAt,
                CreatedSince: container.CreatedSince,
                Digest: container.Digest,
                ID: container.ID,
                Repository: container.Repository,
                SharedSize: container.SharedSize,
                Size: container.Size,
                Tag: container.Tag,
                UniqueSize: container.UniqueSize,
                VirtualSize: container.VirtualSize
              });
            });
            LogService.info(`Got ${images.length} Docker images from VM ${vmId}`, "DockerService");
            return resolve(images);
          })
          .catch((error: any) => {
            LogService.error(
              `Error getting Docker images from VM ${vmId}, either docker is not enabled or machine is not started`,
              "DockerService"
            );
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  static imageOp(operation: DockerImageOperation, vmId: string, imageId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        if (imageId === "") {
          return resolve(false);
        }
        LogService.info(`${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, `sudo docker image ${operation} ${imageId}`)
          .then(() => {
            LogService.info(`${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
            return resolve(true);
          })
          .catch((error: any) => {
            LogService.error(`Error ${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  static containerOp(operation: DockerContainerOperation, vmId: string, imageId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        if (imageId === "") {
          return resolve(false);
        }
        LogService.info(`${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, `sudo docker ${operation} ${imageId}`)
          .then(() => {
            LogService.info(`${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
            return resolve(true);
          })
          .catch((error: any) => {
            LogService.error(`Error ${operation} Docker container ${imageId} on VM ${vmId}`, "DockerService");
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  static runContainer(vmId: string, command: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        if (command === "") {
          return resolve(false);
        }
        if (vmId === "") {
          return resolve(false);
        }
        LogService.info(`Running Docker container ${command} on VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, command)
          .then(() => {
            LogService.info(`Container ${command} started on VM ${vmId}`, "DockerService");
            return resolve(true);
          })
          .catch((error: any) => {
            LogService.error(`Error starting container ${command} on VM ${vmId}`, "DockerService");
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }
}
