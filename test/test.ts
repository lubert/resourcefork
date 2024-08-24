import ResourceMap from "../src/ResourceMap";
import { readResourceFork } from "../src/resourceFork";

let resources: ResourceMap;

beforeAll(async () => {
  // Pretend data fork is a resource fork for compatibility with other OSes
  resources = await readResourceFork("./test/test.ndat", false);
});

describe("resourceFork", () => {
  describe("readResourceFork()", () => {
    it("should get the types of resources", () => {
      expect(resources).toHaveProperty("wëap");
    });

    it("should get the names of resources", () => {
      expect(resources["wëap"]?.[128].name).toBe("blaster");
    });

    it("should get the data from the resources", () => {
      const data =
        "ff ff 00 1e 00 ea 00 7b ff ff 00 01 ff ff ff ff 00 00 ff ff 01 59 ff ff 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff";

      expect(resources["wëap"]?.[128].hexString).toBe(data);
    });
  });
});
