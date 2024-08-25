import ResourceFork from "../src/ResourceFork";

describe("ResourceFork", () => {
  let rf: ResourceFork;

  beforeAll(() => {
    rf = new ResourceFork("./test/test.ndat", false);
  });

  describe("header", () => {
    it("should parse the header of the resource fork", () => {
      expect(rf.header()).toEqual({
        dataLength: 146,
        dataOffset: 256,
        mapLength: 78,
        mapOffset: 402,
      });
    });
  });

  describe("resourceMap", () => {
    it("should parse the resource map", () => {
      const resourceMap = rf.resourceMap();
      expect(Object.keys(resourceMap)).toEqual(["dsïg", "wëap"]);
      expect(resourceMap["wëap"]?.[128]?.name).toBe("blaster");
    });
  });

  describe("getResource", () => {
    it("should return a resource by type and ID", () => {
      const resource = rf.getResource("wëap", 128);
      expect(resource).toBeDefined();
      expect(resource?.name).toBe("blaster");
      expect(resource?.type).toBe("wëap");
      expect(resource?.id).toBe(128);
      expect(resource?.toHexString()).toBe(
        "ff ff 00 1e 00 ea 00 7b ff ff 00 01 ff ff ff ff 00 00 ff ff 01 59 ff ff 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff",
      );
    });
  });
});
