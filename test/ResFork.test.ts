import ResFork from "../src/ResFork";

describe("ResourceFork", () => {
  describe("header", () => {
    it("should parse the header of the resource fork", () => {
      const rf = new ResFork("./test/test.ndat");
      expect(rf.header).toEqual({
        dataLen: 146,
        dataOff: 256,
        mapLen: 78,
        mapOff: 402,
      });
    });
  });

  describe("resourceMap", () => {
    it("should parse the resource map", () => {
      const rf = new ResFork("./test/test.ndat");
      const resourceMap = rf.resourceMap;
      expect(Object.keys(resourceMap)).toEqual(["dsïg", "wëap"]);
      expect(resourceMap["wëap"]?.[128]?.name).toBe("blaster");

      const data =
        "ff ff 00 1e 00 ea 00 7b ff ff 00 01 ff ff ff ff 00 00 ff ff 01 59 ff ff 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff";
      expect(resourceMap["wëap"]?.[128]?.toHexString()).toBe(data);
    });
  });
});
