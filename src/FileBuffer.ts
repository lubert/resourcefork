import { openSync, closeSync, readSync, fstatSync } from "fs";
import { normalize } from "path";
import { BufferLike } from "./types";

/**
 * Buffer-like class for reading data from a file descriptor.
 */
export default class FileBuffer implements BufferLike {
  protected buf = Buffer.alloc(8);

  readonly fd: number;

  readonly byteOffset: number;

  readonly byteLength: number;

  static fromFilePath(filePath: string, readResourceFork = true) {
    if (readResourceFork) {
      filePath = normalize(filePath + "/..namedfork/rsrc");
    } else {
      filePath = normalize(filePath);
    }
    const fd = openSync(filePath, "r");
    return new FileBuffer(fd);
  }

  constructor(fd: number, offset?: number, length?: number) {
    this.fd = fd;
    this.byteOffset = offset || 0;
    this.byteLength = length || fstatSync(fd).size;
  }

  protected baseRead(offset: number, size: number) {
    readSync(this.fd, this.buf, 0, size, this.byteOffset + offset);
  }

  copy(
    buffer: Uint8Array,
    targetStart = 0,
    sourceStart = 0,
    sourceEnd = this.byteLength,
  ) {
    return readSync(
      this.fd,
      buffer,
      targetStart,
      sourceEnd - sourceStart,
      this.byteOffset + sourceStart,
    );
  }

  subarray(start = 0, end = this.byteLength) {
    return new FileBuffer(this.fd, this.byteOffset + start, end - start);
  }

  readInt8(offset = 0) {
    this.baseRead(offset, 1);
    return this.buf.readInt8(0);
  }

  readUInt8(offset = 0) {
    this.baseRead(offset, 1);
    return this.buf.readUInt8(0);
  }

  readInt16LE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buf.readInt16LE(0);
  }

  readInt16BE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buf.readInt16BE(0);
  }

  readUInt16LE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buf.readUInt16LE(0);
  }

  readUInt16BE(offset = 0) {
    this.baseRead(offset, 2);
    return this.buf.readUInt16BE(0);
  }

  readInt32LE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buf.readInt32LE(0);
  }

  readInt32BE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buf.readInt32BE(0);
  }

  readUInt32LE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buf.readUInt32LE(0);
  }

  readUInt32BE(offset = 0) {
    this.baseRead(offset, 4);
    return this.buf.readUInt32BE(0);
  }

  close() {
    closeSync(this.fd);
  }
}
