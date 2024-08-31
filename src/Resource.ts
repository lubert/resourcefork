import { decodeSndData } from "./snd";
import { tuneToMidi } from "./tune";
import { BufferLike } from "./types";

/**
 * Represents a resource in a resource fork. Data is not loaded into memory
 * until requested.
 */
export default class Resource {
  constructor(
    readonly buffer: BufferLike,
    readonly type: string,
    readonly id: number,
    readonly name: string,
  ) {}

  toBuffer(): Buffer {
    const buffer = Buffer.alloc(this.buffer.byteLength);
    this.buffer.copy(buffer);
    return buffer;
  }

  toByteArray() {
    return Array.from(this.toBuffer());
  }

  toShortArray() {
    const buffer = this.toBuffer();
    const shortArray = [];
    for (let i = 0; i < buffer.length; i += 2) {
      shortArray.push(buffer.readUInt16BE(i));
    }
    return shortArray;
  }

  toIntArray() {
    const buffer = this.toBuffer();
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

  toMidi() {
    if (this.type.toLowerCase() !== "tune") {
      throw new Error("Resource is not a tune");
    }
    return tuneToMidi(this.toBuffer());
  }

  toWav() {
    if (this.type.toLowerCase() !== "snd ") {
      throw new Error("Resource is not a sound");
    }
    const res = decodeSndData(this.toBuffer());
    return res.data;
  }
}
