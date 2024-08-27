import Resource from "./Resource";
import { BufferLike, ResourceHeader, ResourceMap } from "./types";
import { decodeMacRoman } from "./utils";

export default class ResourceFork {
  protected _header?: ResourceHeader;
  protected _resourceMap?: ResourceMap;

  constructor(readonly buffer: BufferLike) {}

  /**
   * Returns the resource fork header.
   */
  header(): ResourceHeader {
    if (!this._header) {
      const dataOffset = this.buffer.readUInt32BE(0);
      const mapOffset = this.buffer.readUInt32BE(4);
      const dataLength = this.buffer.readUInt32BE(8);
      const mapLength = this.buffer.readUInt32BE(12);
      this._header = {
        dataOffset,
        mapOffset,
        dataLength,
        mapLength,
      };

      if (
        dataOffset !== this.buffer.readUInt32BE(mapOffset) ||
        mapOffset !== this.buffer.readUInt32BE(mapOffset + 4) ||
        dataLength !== this.buffer.readUInt32BE(mapOffset + 8) ||
        mapLength !== this.buffer.readUInt32BE(mapOffset + 12)
      ) {
        throw Error("Not a valid resource fork");
      }
    }
    return this._header;
  }

  /**
   * Returns a map of all resources in the resource fork.
   */
  resourceMap(): ResourceMap {
    if (!this._resourceMap) {
      const resourceMap: ResourceMap = {};
      const { dataOffset, mapOffset } = this.header();
      const typesOffset = this.buffer.readUInt16BE(mapOffset + 24) + mapOffset;
      const namesOffset = this.buffer.readUInt16BE(mapOffset + 26) + mapOffset;

      const typesView = this.buffer.subarray(typesOffset);
      const namesView = this.buffer.subarray(namesOffset);
      const dataView = this.buffer.subarray(dataOffset);

      // Count is stored as the number of resource types in the map minus 1
      const typesCount = typesView.readUInt16BE(0);
      for (let i = 0; i <= typesCount; i++) {
        const byteArray = [
          typesView.readUInt8(2 + 8 * i),
          typesView.readUInt8(3 + 8 * i),
          typesView.readUInt8(4 + 8 * i),
          typesView.readUInt8(5 + 8 * i),
        ];

        const type = decodeMacRoman(byteArray);
        resourceMap[type] = {};

        const typeCount = typesView.readUInt16BE(6 + 8 * i);
        const typeOffset = typesView.readUInt16BE(8 + 8 * i);

        for (let j = 0; j <= typeCount; j++) {
          const id = typesView.readUInt16BE(typeOffset + 12 * j);
          const nameVal = typesView.readUInt16BE(typeOffset + 12 * j + 2);

          let name: string;
          if (nameVal === 0xffff) {
            name = "";
          } else {
            const nameLen = namesView.readUInt8(nameVal);
            const curNameList = [];
            for (let k = 0; k < nameLen; k++) {
              curNameList.push(namesView.readUInt8(nameVal + 1 + k));
            }
            name = decodeMacRoman(curNameList);
          }

          const tmsb = typesView.readUInt8(typeOffset + 12 * j + 5);
          const t = typesView.readUInt16BE(typeOffset + 12 * j + 6);

          const dataOffset = (tmsb << 16) + t;
          const dataLength = dataView.readUInt32BE(dataOffset);
          const buf = dataView.subarray(
            dataOffset + 4,
            dataOffset + 4 + dataLength,
          );
          if (buf.byteLength !== dataLength) {
            throw new Error(
              `Buffer length ${buf.byteLength} does not match resource length ${dataLength}`,
            );
          }
          const res = new Resource(buf, type, id, name);
          resourceMap[type][res.id] = res;
        }
      }
      this._resourceMap = resourceMap;
    }
    return this._resourceMap;
  }

  /**
   * Returns a resource by type and id.
   */
  getResource(type: string, id: number): Resource | undefined {
    return this.resourceMap()[type]?.[id];
  }
}
