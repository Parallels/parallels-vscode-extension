export class OperatingSystemUser {
  username: string;
  password: string;
  encryptedPassword: string;

  constructor(username: string, password: string, encryptedPassword: string) {
    this.username = username;
    this.password = password;
    this.encryptedPassword = encryptedPassword;
  }

  toString() {
    return `{
      username: '${this.username}',
      password: '${this.password}',
      encryptedPassword: '${this.encryptedPassword}'
    }`;
  }

  static fromJson(json: string): OperatingSystemUser {
    const obj = JSON.parse(json);
    return new OperatingSystemUser(obj.username, obj.password, obj.encryptedPassword);
  }
}
