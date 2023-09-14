export class OperatingSystemRequiredVariable {
  id: string;
  text: string;
  value?: string;
  hint: string;

  constructor(id: string, text: string, hint: string) {
    this.id = id;
    this.text = text;
    this.hint = hint;
  }

  toString() {
    return `{
      id: '${this.id}',
      text: '${this.text}',
      value: '${this.value}',
      hint: '${this.hint}'
    }`;
  }

  static fromJson(json: string): OperatingSystemRequiredVariable {
    const obj = JSON.parse(json);
    return new OperatingSystemRequiredVariable(obj.id, obj.text, obj.hint);
  }
}