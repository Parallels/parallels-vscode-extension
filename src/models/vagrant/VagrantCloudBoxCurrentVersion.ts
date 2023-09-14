import { VagrantCloudBoxProvider } from "./VagrantCloudBoxProvider";


export class VagrantCloudBoxCurrentVersion {
  version: string;
  status: string;
  description_html: null | string;
  description_markdown: null | string;
  created_at: string;
  updated_at: string;
  number: string;
  release_url: string;
  revoke_url: string;
  providers: VagrantCloudBoxProvider[];

  constructor(
    version: string,
    status: string,
    descriptionHtml: null | string,
    descriptionMarkdown: null | string,
    createdAt: string,
    updatedAt: string,
    number: string,
    releaseUrl: string,
    revokeUrl: string,
    providers: VagrantCloudBoxProvider[]
  ) {
    this.version = version;
    this.status = status;
    this.description_html = descriptionHtml;
    this.description_markdown = descriptionMarkdown;
    this.created_at = createdAt;
    this.updated_at = updatedAt;
    this.number = number;
    this.release_url = releaseUrl;
    this.revoke_url = revokeUrl;
    this.providers = providers;
  }

  static fromJson(json: any): VagrantCloudBoxCurrentVersion {
    return new VagrantCloudBoxCurrentVersion(
      json.version,
      json.status,
      json.description_html,
      json.description_markdown,
      json.created_at,
      json.updated_at,
      json.number,
      json.release_url,
      json.revoke_url,
      json.providers.map((provider: any) => VagrantCloudBoxProvider.fromJson(provider))
    );
  }
}
