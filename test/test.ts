var assert = require('assert');

import { readResourceFork, Resource, ResourceMap } from "../src/resourceFork";

import * as chai from "chai";
import "mocha";
import * as chaiAsPromised from "chai-as-promised";

before(function() {
    chai.should();
    chai.use(chaiAsPromised);
});



describe("resourceFork", function() {
    var resources: ResourceMap;
    before(function(done) {
        // pretend data fork is resource fork for compatability with other OSes
        readResourceFork("./test/test.ndat", false).then((result) => {
            resources = result;
            done();
        });
    });

    // describe("constructor()", function() {
    //     it('should properly append the resource fork to the given path', function() {
    //         var test_rf = new resourceFork("some/example/path");
    //         assert.equal("some/example/path/..namedfork/rsrc", test_rf.path);
    //     });

    // });

    describe("readResourceFork()", function() {
        it("should get the types of resources", function() {
            assert(resources.hasOwnProperty("wëap"));
        });

        it("should get the names of resources", function() {
            assert.equal('blaster', resources['wëap'][128].name);
        });

        it("should get the data from the resources", function() {
            var data = 'ff ff 00 1e 00 ea 00 7b ff ff 00 01 ff ff ff ff 00 00 ff ff 01 59 ff ff 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 ff ff ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff 00 00 ff ff 00 00 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff';

            assert.equal(data, resources['wëap'][128].hexString);
        });

    });
});

