import { readFileSync } from "fs";
import FileBuffer from "../src/FileBuffer";
import ResourceFork from "../src/ResourceFork";

describe("ResourceFork", () => {
  let rfFile: ResourceFork;
  let rfBuffer: ResourceFork;

  beforeAll(() => {
    const buffer = FileBuffer.fromFilePath("./test/test.ndat", false);
    rfFile = new ResourceFork(buffer);
    rfBuffer = new ResourceFork(readFileSync("./test/test.ndat"));
  });

  describe("header", () => {
    it("should parse the header of the resource fork", () => {
      const header = rfFile.header();
      expect(header).toEqual({
        dataLength: 146,
        dataOffset: 256,
        mapLength: 78,
        mapOffset: 402,
      });
      expect(rfBuffer.header()).toEqual(header);
    });
  });

  describe("resourceMap", () => {
    it("should parse the resource map", () => {
      const resourceMap = rfFile.resourceMap();
      const resourceMapBuffer = rfBuffer.resourceMap();
      const keys = Object.keys(resourceMap);
      const keysBuffer = Object.keys(resourceMapBuffer);
      expect(keys).toEqual(["dsïg", "wëap"]);
      expect(keysBuffer).toEqual(keys);
      expect(resourceMap["wëap"]?.[128]?.name).toBe("blaster");
      expect(resourceMapBuffer["wëap"]?.[128]?.name).toBe("blaster");
    });
  });

  describe("getResource", () => {
    it("should return a resource by type and ID", () => {
      const resource = rfFile.getResource("wëap", 128);
      const resourceBuffer = rfBuffer.getResource("wëap", 128);
      expect(resource).toBeDefined();
      expect(resourceBuffer).toBeDefined();
      expect(resource?.name).toBe("blaster");
      expect(resourceBuffer?.name).toBe(resource?.name);
      expect(resource?.type).toBe("wëap");
      expect(resourceBuffer?.type).toBe(resource?.type);
      expect(resource?.id).toBe(128);
      expect(resourceBuffer?.id).toBe(resource?.id);
      const hexString =
        "ff ff 00 1e 00 ea 00 7b ff ff 00 01 ff ff ff ff 00 00 ff ff 01 59 ff ff 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff";
      expect(resource?.toHexString()).toBe(hexString);
      expect(resourceBuffer?.toHexString()).toBe(hexString);
    });
  });
});
