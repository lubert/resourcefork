"use strict";

var path = require('path');
var fs = require('fs');

// see https://developer.apple.com/legacy/library/documentation/mac/pdf/MoreMacintoshToolbox.pdf#page=151
// for info on resource fork
class resourceFork {
    constructor(p, read_resource_fork = true) {
	if (read_resource_fork) {
	    this.path = path.normalize(p + "/..namedfork/rsrc");
	}
	else {
	    this.path = path.normalize(p);
	}
	
	
    }

    async read() {
	this.buffer = await this.readFile();
	//this.u8 = new Uint8Array(this.buffer);
	//this.u32 = new Uint32Array(this.buffer);
	this.dataView = new DataView(this.buffer);


	// Offset and length of resource data and resource map
	var o_data = this.dataView.getUint32(0);
	var o_map = this.dataView.getUint32(1*4);
	var l_data = this.dataView.getUint32(2*4);
	var l_map = this.dataView.getUint32(3*4);

	this.resource_data = new DataView(this.buffer, o_data, l_data);
	this.resource_map = new DataView(this.buffer, o_map, l_map);
	
	// Parse resource map
	var o_type_list = this.dataView.getUint16(24);
	var o_name_list = this.dataView.getUint16(26);
	
    }
    
    readFile() {
	return new Promise(function(fulfill, reject) {
	    var f = fs.readFile(this.path, function(err, data) {
		if (err) {
		    reject(err);
		    return;
		}

		fulfill(data.buffer);
		
	    }.bind(this));
	    
	}.bind(this));
    }


    


}

exports.resourceFork = resourceFork;
