export class VagrantCloudBoxProvider {
  name: string;
  hosted: boolean;
  hosted_token: null;
  original_url: null | string;
  created_at: string;
  updated_at: string;
  download_url: string;
  checksum: null | string;
  checksum_type: null | string;

  constructor(
    name: string,
    hosted: boolean,
    hostedToken: null,
    originalUrl: null | string,
    createdAt: string,
    updatedAt: string,
    downloadUrl: string,
    checksum: null | string,
    checksumType: null | string
  ) {
    this.name = name;
    this.hosted = hosted;
    this.hosted_token = hostedToken;
    this.original_url = originalUrl;
    this.created_at = createdAt;
    this.updated_at = updatedAt;
    this.download_url = downloadUrl;
    this.checksum = checksum;
    this.checksum_type = checksumType;
  }

  static fromJson(json: any): VagrantCloudBoxProvider {
    return new VagrantCloudBoxProvider(
      json.name,
      json.hosted,
      json.hosted_token,
      json.original_url,
      json.created_at,
      json.updated_at,
      json.download_url,
      json.checksum,
      json.checksum_type
    );
  }
}
