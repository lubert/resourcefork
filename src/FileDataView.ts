import { readSync } from "fs";

export default class FileDataView {
  protected buffer = Buffer.alloc(8);

  readonly fd: number;

  readonly byteOffset: number;

  constructor(fd: number, offset = 0) {
    this.fd = fd;
    this.byteOffset = offset;
  }

  protected baseRead(offset: number, size: number) {
    readSync(this.fd, this.buffer, 0, size, this.byteOffset + offset);
  }

  withOffset(offset: number) {
    return new FileDataView(this.fd, this.byteOffset + offset);
  }

  readBytes(length: number, offset = 0) {
    const buffer = Buffer.alloc(length);
    readSync(this.fd, buffer, 0, length, this.byteOffset + offset);
    return buffer;
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
