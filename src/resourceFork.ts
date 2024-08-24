import { normalize } from "path";
import ResourceMap from "./ResourceMap";
import Resource from "./Resource";
import { decodeMacRoman, readFilePromise } from "./utils";

export async function readResourceFork(
  filePath: string,
  readResourceFork = true,
): Promise<ResourceMap> {
  if (readResourceFork) {
    filePath = normalize(filePath + "/..namedfork/rsrc");
  } else {
    filePath = normalize(filePath);
  }
  const resources: ResourceMap = {};

  const buffer = await readFilePromise(filePath);
  const dataView = new DataView(buffer);

  // Offset and length of resource data and resource map
  const oData = dataView.getUint32(0);
  const oMap = dataView.getUint32(1 * 4);
  const lData = dataView.getUint32(2 * 4);
  const lMap = dataView.getUint32(3 * 4);

  // Verify that the file is actually in resource fork format
  if (
    oData !== dataView.getUint32(oMap) ||
    oMap !== dataView.getUint32(oMap + 4) ||
    lData !== dataView.getUint32(oMap + 8) ||
    lMap !== dataView.getUint32(oMap + 12)
  ) {
    throw "Not a valid resourceFork file";
  }

  // Get resource map
  const resData = new DataView(buffer, oData, lData);
  const resourceMap = new DataView(buffer, oMap, lMap);

  // Get type and name list
  // Make sure to account for the resource map's byteOffset
  const oTypeList = resourceMap.getUint16(24) + resourceMap.byteOffset;
  const oNameList = resourceMap.getUint16(26) + resourceMap.byteOffset;
  const typeList = new DataView(buffer, oTypeList, oNameList - oTypeList);
  const nameList = new DataView(buffer, oNameList); // continues to end of buffer

  // Type List
  // 2 bytes: Number of resource types in the map minus 1 (no one uses resource fork without using at
  // least one resource, so they get an extra type by doing this)
  var nTypes = (typeList.getUint16(0) + 1) & 0xffff; // keep within uint16

  // read each resource
  for (let i = 0; i < nTypes; i++) {
    const byteArray = [
      typeList.getUint8(2 + 8 * i),
      typeList.getUint8(3 + 8 * i),
      typeList.getUint8(4 + 8 * i),
      typeList.getUint8(5 + 8 * i),
    ];

    const resourceType = decodeMacRoman(byteArray);

    const quantity = typeList.getUint16(6 + 8 * i) + 1;
    var offset = typeList.getUint16(8 + 8 * i);

    if (resources.hasOwnProperty(resourceType)) {
      throw Error("Duplicate resource type " + resourceType);
    }
    resources[resourceType] = [];

    for (let j = 0; j < quantity; j++) {
      const resId = typeList.getUint16(offset + 12 * j);
      const oName = typeList.getUint16(offset + 12 * j + 2);
      let resName: string;
      if (oName === 0xffff) {
        resName = "";
      } else {
        const nameLen = nameList.getUint8(oName);
        const curNameList = [];
        for (let k = 0; k < nameLen; k++) {
          curNameList.push(nameList.getUint8(oName + 1 + k));
        }
        resName = decodeMacRoman(curNameList);
      }

      const tmsb = typeList.getUint8(offset + 12 * j + 5);
      const t = typeList.getUint16(offset + 12 * j + 6);

      const oRdat = (tmsb << 16) + t;
      const lRdat = resData.getUint32(oRdat);
      const curResData = new DataView(
        buffer,
        resData.byteOffset + oRdat + 4,
        lRdat,
      );

      const res = new Resource(resourceType, resId, resName, curResData);
      resources[resourceType][res.id] = res;
    }
  }
  return resources;
}
