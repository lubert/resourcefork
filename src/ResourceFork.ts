import { openSync, closeSync } from "fs";
import FileDataView from "./FileDataView";
import Resource from "./Resource";
import { ResourceHeader, ResourceMap } from "./types";
import { decodeMacRoman } from "./utils";

export default class ResourceFork {
  fd: number;
  view: FileDataView;

  protected _header?: ResourceHeader;
  protected _resourceMap?: ResourceMap;

  constructor(readonly filePath: string) {
    this.fd = openSync(filePath, "r");
    this.view = new FileDataView(this.fd);
  }

  /**
   * Returns the resource fork header.
   */
  header(): ResourceHeader {
    if (!this._header) {
      const dataOffset = this.view.readUInt32BE(0);
      const mapOffset = this.view.readUInt32BE(4);
      const dataLength = this.view.readUInt32BE(8);
      const mapLength = this.view.readUInt32BE(12);
      this._header = {
        dataOffset,
        mapOffset,
        dataLength,
        mapLength,
      };

      if (
        dataOffset !== this.view.readUInt32BE(mapOffset) ||
        mapOffset !== this.view.readUInt32BE(mapOffset + 4) ||
        dataLength !== this.view.readUInt32BE(mapOffset + 8) ||
        mapLength !== this.view.readUInt32BE(mapOffset + 12)
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
      const typesOffset = this.view.readUInt16BE(mapOffset + 24) + mapOffset;
      const namesOffset = this.view.readUInt16BE(mapOffset + 26) + mapOffset;

      const typesView = this.view.withOffset(typesOffset);
      const namesView = this.view.withOffset(namesOffset);
      const dataView = this.view.withOffset(dataOffset);

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
          const res = new Resource(
            dataView,
            type,
            id,
            name,
            dataOffset + 4,
            dataLength,
          );
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

  /**
   * Closes the resource fork file descriptor.
   */
  close() {
    closeSync(this.fd);
  }
}
