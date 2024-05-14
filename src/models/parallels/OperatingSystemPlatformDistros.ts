import {OperatingSystemImage} from "./OperatingSystemImage";

export class OperatingSystemPlatformDistros {
  id: string;
  name: string;
  images: OperatingSystemImage[];

  constructor(id: string, name: string, images: OperatingSystemImage[] = []) {
    this.id = id;
    this.name = name;
    this.images = images;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      images: [
        ${this.images.map(image => image.toString()).join(",\n")}
      ]
    }`;
  }

  static fromJson(json: string): OperatingSystemPlatformDistros {
    const obj = JSON.parse(json);
    const images: OperatingSystemImage[] = [];
    for (const image of obj.images ?? []) {
      images.push(OperatingSystemImage.fromJson(JSON.stringify(image)));
    }
    return new OperatingSystemPlatformDistros(obj.id, obj.name, images);
  }
}
