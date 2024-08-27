/**
 * See https://developer.apple.com/legacy/library/documentation/mac/pdf/MoreMacintoshToolbox.pdf#page=151
 * for more information on resource forks.
 */
import Resource from "./Resource";

export type ResourceMap = Partial<
  Record<string, Partial<Record<string, Resource>>>
>;

export type ResourceHeader = {
  dataOffset: number;
  mapOffset: number;
  dataLength: number;
  mapLength: number;
};

export interface BufferLike {
  readonly byteLength: number;
  readonly byteOffset: number;
  copy(
    target: Uint8Array,
    targetStart?: number,
    sourceStart?: number,
    sourceEnd?: number,
  ): number;
  subarray(start?: number, end?: number): BufferLike;
  readInt8(offset?: number): number;
  readUInt8(offset?: number): number;
  readInt16LE(offset?: number): number;
  readInt16BE(offset?: number): number;
  readUInt16LE(offset?: number): number;
  readUInt16BE(offset?: number): number;
  readInt32LE(offset?: number): number;
  readInt32BE(offset?: number): number;
  readUInt32LE(offset?: number): number;
  readUInt32BE(offset?: number): number;
}
