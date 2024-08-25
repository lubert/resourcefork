import { readSync } from "fs";

export default class FileSyncDataView {
  protected buffer = Buffer.alloc(8);

  constructor(
    readonly fd: number,
    readonly byteOffset = 0,
    readonly byteLength = -1,
  ) {}

  protected baseRead(offset: number, size: number) {
    readSync(this.fd, this.buffer, 0, size, this.byteOffset + offset);
  }

  withOffset(offset: number, length = -1) {
    return new FileSyncDataView(this.fd, this.byteOffset + offset, length);
  }

  readInt8(offset = 0) {
    this.baseRead(offset, 1);
    return this.buffer.readInt8(0);
  }

  readUInt8(offset = 0) {
    this.baseRead(offset, 1);
    return this.buffer.readUInt8(0);
  }

  readInt16LE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buffer.readInt16LE(0);
  }

  readInt16BE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buffer.readInt16BE(0);
  }

  readUInt16LE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buffer.readUInt16LE(0);
  }

  readUInt16BE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buffer.readUInt16BE(0);
  }

  readInt32LE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buffer.readInt32LE(0);
  }

  readInt32BE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buffer.readInt32BE(0);
  }

  readUInt32LE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buffer.readUInt32LE(0);
  }

  readUInt32BE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buffer.readUInt32BE(0);
  }
}
