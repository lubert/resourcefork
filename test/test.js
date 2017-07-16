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


    
    describe("#constructor()", function() {
	it('should properly append the resource fork to the given path', function() {
	    var rf = new resourceFork("some/example/path");
	    assert.equal("some/example/path/..namedfork/rsrc", rf.path);
	});

    });


});
