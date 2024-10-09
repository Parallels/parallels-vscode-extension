export interface ParallelsShortLicense {
  name?: string;
  uuid?: string;
  lic_key?: string;
  product_version?: string;
  is_upgrade?: boolean;
  is_sublicense?: boolean;
  parent_key?: null;
  parent_uuid?: null;
  main_period_ends_at?: Date;
  grace_period_ends_at?: Date;
  is_auto_renewable?: boolean;
  is_nfr?: boolean;
  is_beta?: boolean;
  is_china?: boolean;
  is_suspended?: boolean;
  is_expired?: boolean;
  is_grace_period?: boolean;
  is_purchased_online?: boolean;
  limit?: number;
  usage?: number;
  edition?: string;
  platform?: number;
  product?: string;
  offline?: boolean;
  is_bytebot?: boolean;
  cpu_limit?: number;
  ram_limit?: number;
  is_trial?: boolean;
  started_at?: Date;
  cep_option?: boolean;
  full_edition?: string;
}

export interface ParallelsJSONLicense {
  license: JsonLicense;
  publicCerts: string;
  signature: string;
}

export interface JsonLicense {
  name: string;
  uuid: string;
  lic_key: string;
  product_version: string;
  is_upgrade: boolean;
  is_sublicense: boolean;
  parent_key: null;
  parent_uuid: null;
  main_period_ends_at: Date;
  grace_period_ends_at: Date;
  is_auto_renewable: boolean;
  is_nfr: boolean;
  is_beta: boolean;
  is_china: boolean;
  is_suspended: boolean;
  is_expired: boolean;
  is_grace_period: boolean;
  is_purchased_online: boolean;
  limit: number;
  usage: number;
  edition: number;
  platform: number;
  product: number;
  offline: boolean;
  is_bytebot: boolean;
  cpu_limit: number;
  ram_limit: number;
  is_trial: boolean;
  hosts: Host[];
  started_at: Date;
  cep_option: boolean;
}

export interface Host {
  name: string;
  hw_id: string;
  product_version: string;
  activated_at: Date;
}
