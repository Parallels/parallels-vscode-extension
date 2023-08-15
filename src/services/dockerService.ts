import * as vscode from "vscode";
import {DockerImage as DockerContainer} from "../models/docker-image";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {LogService} from "./logService";

export enum DockerContainerOperation {
  Start = "start",
  Stop = "stop",
  Restart = "restart",
  Pause = "pause",
  Resume = "unpause",
  Remove = "rm"
}

export class DockerService {
  constructor(private context: vscode.ExtensionContext) {}

  static getVmContainers(vmId: string): Promise<DockerContainer[]> {
    return new Promise(async (resolve, reject) => {
      try {
        LogService.info(`Getting Docker images from VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, "sudo docker ps -a --no-trunc --format json")
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

  static containerOp(operation: DockerContainerOperation, vmId: string, containerId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        if (containerId === "") {
          return resolve(false);
        }
        LogService.info(`Starting Docker container ${containerId} on VM ${vmId}`, "DockerService");
        ParallelsDesktopService.executeOnVm(vmId, `sudo docker ${operation} ${containerId}`)
          .then(() => {
            LogService.info(`Started Docker container ${containerId} on VM ${vmId}`, "DockerService");
            return resolve(true);
          })
          .catch((error: any) => {
            LogService.error(`Error starting Docker container ${containerId} on VM ${vmId}`, "DockerService");
            return reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }
}
