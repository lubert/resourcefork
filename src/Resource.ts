import FileDataView from "./FileDataView";

/**
 * Represents a resource in a resource fork. Data is not loaded into memory
 * until requested.
 */
export default class Resource {
  constructor(
    readonly data: FileDataView,
    readonly type: string,
    readonly id: number,
    readonly name: string,
    readonly offset: number,
    readonly length: number,
  ) {}

  buffer() {
    return this.data.readBytes(this.length, this.offset);
  }

  toByteArray() {
    return Array.from(this.buffer());
  }

  toShortArray() {
    const buffer = this.buffer();
    const shortArray = [];
    for (let i = 0; i < buffer.length; i += 2) {
      shortArray.push(buffer.readUInt16BE(i));
    }
    return shortArray;
  }

  toIntArray() {
    const buffer = this.buffer();
    const intArray = [];
    for (let i = 0; i < buffer.length; i += 4) {
      intArray.push(buffer.readUInt32BE(i));
    }
    return intArray;
  }

  toShortString() {
    return this.toShortArray().join(" ");
  }

  toIntString() {
    return this.toIntArray().join(" ");
  }

  toHexString() {
    const bytes = this.toByteArray();
    return bytes
      .map((n) => {
        let hex = n.toString(16);
        if (hex.length === 1) {
          hex = "0" + hex;
        }
        return hex;
      })
      .join(" ");
  }
}
