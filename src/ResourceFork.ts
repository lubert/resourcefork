import { openSync } from "fs";
import FileDataView from "./FileDataView";
import { decodeMacRoman } from "./utils";
import { ResourceForkHeader, ResourceMap } from "./types";
import Resource from "./Resource";

export default class ResourceFork {
  fd: number;
  view: FileDataView;

  protected _header?: ResourceForkHeader;
  protected _types?: string[];
  protected _resourceMap?: ResourceMap;

  constructor(readonly filePath: string) {
    this.fd = openSync(filePath, "r");
    this.view = new FileDataView(this.fd);
  }

  get header(): ResourceForkHeader {
    if (!this._header) {
      const dataOff = this.view.readUInt32BE(0);
      const mapOff = this.view.readUInt32BE(4);
      const dataLen = this.view.readUInt32BE(8);
      const mapLen = this.view.readUInt32BE(12);
      this._header = { dataOff, mapOff, dataLen, mapLen };

      if (
        dataOff !== this.view.readUInt32BE(mapOff) ||
        mapOff !== this.view.readUInt32BE(mapOff + 4) ||
        dataLen !== this.view.readUInt32BE(mapOff + 8) ||
        mapLen !== this.view.readUInt32BE(mapOff + 12)
      ) {
        throw Error("Not a valid resource fork");
      }
    }
    return this._header;
  }

  get dataView() {
    const { dataOff } = this.header;
    return this.view.withOffset(dataOff);
  }

  get typesView() {
    const { mapOff } = this.header;
    const typesOff = this.view.readUInt16BE(mapOff + 24) + mapOff;
    return this.view.withOffset(typesOff);
  }

  get namesView() {
    const { mapOff } = this.header;
    const namesOff = this.view.readUInt16BE(mapOff + 26) + mapOff;
    return this.view.withOffset(namesOff);
  }

  get resourceMap(): ResourceMap {
    if (!this._resourceMap) {
      const resourceMap: ResourceMap = {};

      const { typesView, namesView, dataView } = this;
      // Count is stored as the number of resource types in the map minus 1
      const typesCount = typesView.readUInt16BE(0);

      for (let i = 0; i <= typesCount; i++) {
        const byteArray = [
          typesView.readUInt8(2 + 8 * i),
          typesView.readUInt8(3 + 8 * i),
          typesView.readUInt8(4 + 8 * i),
          typesView.readUInt8(5 + 8 * i),
        ];

        const resType = decodeMacRoman(byteArray);
        resourceMap[resType] = {};

        const typeCount = typesView.readUInt16BE(6 + 8 * i);
        const offset = typesView.readUInt16BE(8 + 8 * i);

        for (let j = 0; j <= typeCount; j++) {
          const resId = typesView.readUInt16BE(offset + 12 * j);
          const name = typesView.readUInt16BE(offset + 12 * j + 2);

          let resName: string;
          if (name === 0xffff) {
            resName = "";
          } else {
            const nameLen = namesView.readUInt8(name);
            const curNameList = [];
            for (let k = 0; k < nameLen; k++) {
              curNameList.push(namesView.readUInt8(name + 1 + k));
            }
            resName = decodeMacRoman(curNameList);
          }

          const tmsb = typesView.readUInt8(offset + 12 * j + 5);
          const t = typesView.readUInt16BE(offset + 12 * j + 6);

          const resDataOff = (tmsb << 16) + t;
          const resDataLen = dataView.readUInt32BE(resDataOff);
          const res = new Resource(
            dataView,
            resType,
            resId,
            resName,
            resDataOff + 4,
            resDataLen,
          );
          resourceMap[resType][res.id] = res;
        }
      }
      this._resourceMap = resourceMap;
    }
    return this._resourceMap;
  }
}
