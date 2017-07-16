var assert = require('assert');
var resourceFork = require("../resourceFork.js").resourceFork;
/*
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal(-1, [1,2,3].indexOf(4));
    });
  });
});
*/


describe("resourceFork", function() {
    var rf;
    before(function(done) {
	rf = new resourceFork("./test/test.ndat", false);
	// pretend data fork is resource fork for compatability with other OSes
	rf.read().then(function() {done();});
	
    });
    
    describe("#constructor()", function() {
	it('should properly append the resource fork to the given path', function() {
	    var test_rf = new resourceFork("some/example/path");
	    assert.equal("some/example/path/..namedfork/rsrc", test_rf.path);
	});

    });

    describe("read()", function() {
	it("should get the types of resources", function() {
	    assert(rf.resources.hasOwnProperty("wëap"));
	});
	
	it("should get the names of resources", function() {
	    assert.equal('blaster', rf.resources['wëap'][128].name);
	});

    });
});

