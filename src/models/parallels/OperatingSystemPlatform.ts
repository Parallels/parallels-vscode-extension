import {OperatingSystemImage} from "./OperatingSystemImage";
import {OperatingSystemPlatformDistros} from "./OperatingSystemPlatformDistros";

export class OperatingSystemPlatform {
  id: string;
  name: string;
  distros: OperatingSystemPlatformDistros[];
  images: OperatingSystemImage[];

  constructor(
    id: string,
    name: string,
    distros: OperatingSystemPlatformDistros[] = [],
    images: OperatingSystemImage[] = []
  ) {
    this.id = id;
    this.name = name;
    this.distros = distros;
    this.images = images;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      distros: [
        ${this.distros.map(distro => distro.toString()).join(",\n")}
      ],
      images: [
        ${this.images.map(image => image.toString()).join(",\n")}
      ]
    }`;
  }

  static fromJson(json: string): OperatingSystemPlatform {
    const obj = JSON.parse(json);
    const distros: OperatingSystemPlatformDistros[] = [];
    for (const distro of obj.distros ?? []) {
      distros.push(OperatingSystemPlatformDistros.fromJson(JSON.stringify(distro)));
    }
    const images: OperatingSystemImage[] = [];
    for (const image of obj.images ?? []) {
      images.push(OperatingSystemImage.fromJson(JSON.stringify(image)));
    }
    return new OperatingSystemPlatform(obj.id, obj.name, distros, images);
  }
}
