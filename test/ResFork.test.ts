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

  describe("types", () => {
    it("should parse the types of resources", () => {
      const rf = new ResFork("./test/test.ndat");
      expect(rf.types).toEqual(["dsïg", "wëap"]);
    });
  });
});
