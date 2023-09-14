import { VagrantCloudBoxCurrentVersion } from "./VagrantCloudBoxCurrentVersion";


export class VagrantCloudBox {
  tag: string;
  username: string;
  name: string;
  private: boolean;
  downloads: number;
  created_at: string;
  updated_at: string;
  short_description: string;
  description_markdown: null | string;
  description_html: null | string;
  current_version: VagrantCloudBoxCurrentVersion;

  constructor(
    tag: string,
    username: string,
    name: string,
    privateBox: boolean,
    downloads: number,
    createdAt: string,
    updatedAt: string,
    shortDescription: string,
    descriptionMarkdown: null | string,
    descriptionHtml: null | string,
    currentVersion: VagrantCloudBoxCurrentVersion
  ) {
    this.tag = tag;
    this.username = username;
    this.name = name;
    this.private = privateBox;
    this.downloads = downloads;
    this.created_at = createdAt;
    this.updated_at = updatedAt;
    this.short_description = shortDescription;
    this.description_markdown = descriptionMarkdown;
    this.description_html = descriptionHtml;
    this.current_version = currentVersion;
  }

  static fromJson(json: any): VagrantCloudBox {
    return new VagrantCloudBox(
      json.tag,
      json.username,
      json.name,
      json.private,
      json.downloads,
      json.created_at,
      json.updated_at,
      json.short_description,
      json.description_markdown,
      json.description_html,
      VagrantCloudBoxCurrentVersion.fromJson(json.current_version)
    );
  }
}
