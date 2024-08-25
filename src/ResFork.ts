import { openSync } from "fs";
import FileSyncDataView from "./FileSyncDataView";
import { decodeMacRoman } from "./utils";

type ResForkHeader = {
  dataOff: number;
  mapOff: number;
  dataLen: number;
  mapLen: number;
};

export default class ResFork {
  fd: number;
  view: FileSyncDataView;

  protected _header?: ResForkHeader;
  protected _types?: string[];

  constructor(readonly filePath: string) {
    this.fd = openSync(filePath, "r");
    this.view = new FileSyncDataView(this.fd);
  }

  get header(): ResForkHeader {
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

  get types(): string[] {
    if (!this._types) {
      this._types = [];
      const { mapOff } = this.header;
      const typesOff = this.view.readUInt16BE(mapOff + 24) + mapOff;
      const typesView = this.view.withOffset(typesOff);
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
        this._types.push(resType);
      }
    }
    return this._types;
  }
}
