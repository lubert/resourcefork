export default class Resource {
  readonly data: DataView;
  readonly type: string;
  readonly id: number;
  readonly name: string;

  constructor(resourceType: string, id: number, name: string, data: DataView) {
    this.type = resourceType;
    this.id = id;
    this.name = name;
    this.data = data;
  }

  get shortArray() {
    const arr = [];
    for (let i = 0; i < this.data.byteLength; i++) {
      arr.push(this.data.getUint8(i));
    }
    return arr;
  }

  get hexString() {
    const hexArr = this.shortArray.map((n) => {
      let hex = n.toString(16);
      if (hex.length === 1) {
        hex = "0" + hex;
      }
      return hex;
    });
    return hexArr.join(" ");
  }

  get shortString() {
    return this.shortArray.map((n) => n.toString()).join(" ");
  }

  get intArray() {
    const arr = [];
    for (let i = 0; i < this.data.byteLength; i += 2) {
      arr.push(this.data.getUint16(i));
    }
    return arr;
  }

  get intString() {
    return this.intArray.map((n) => n.toString()).join(" ");
  }
}
