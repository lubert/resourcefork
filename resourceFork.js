"use strict";

var Promise = require("bluebird");
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

	// Verify that the file is actually in resource fork format
	if (o_data !== this.dataView.getUint32(o_map) ||
	    o_map !== this.dataView.getUint32(o_map + 4) ||
	    l_data !== this.dataView.getUint32(o_map + 8) ||
	    l_map !== this.dataView.getUint32(o_map + 12)) {
	    throw("Not a valid resourceFork file");
	}

	
	// Get resource map
	this.resource_data = new DataView(this.buffer, o_data, l_data);
	this.resource_map = new DataView(this.buffer, o_map, l_map);
	
	// Get type and name list
	// Make sure to account for the resource map's byteOffset
	var o_type_list = this.resource_map.getUint16(24) + this.resource_map.byteOffset;
	var o_name_list = this.resource_map.getUint16(26) + this.resource_map.byteOffset;
	this.type_list = new DataView(this.buffer, o_type_list, o_name_list - o_type_list);
	this.name_list = new DataView(this.buffer, o_name_list); // continues to end of buffer

	// Type List
	// 2 bytes: Number of resource types in the map minus 1 (no one uses resource fork without using at
	// least one resource, so they get an extra type by doing this)
	this.n_types = (this.type_list.getUint16(0) + 1) & 0xffff; // keep within uint16


	this.resources = {};
	
	// read each resource
	for (var i = 0; i < this.n_types; i++) {
	    var resource_type_array = [this.type_list.getUint8(2 + 8*i),
				       this.type_list.getUint8(3 + 8*i),
				       this.type_list.getUint8(4 + 8*i),
				       this.type_list.getUint8(5 + 8*i)];
	    var resource_type = this.decode_macroman(resource_type_array);

	    var quantity = this.type_list.getUint16(6 + 8*i) + 1;
	    var offset = this.type_list.getUint16(8 + 8*i);


	    if (this.resources.hasOwnProperty(resource_type)) {
		throw "Duplicate resource type " + resource_type;
	    }
	    this.resources[resource_type] = [];

	    for (var j = 0; j < quantity; j++) {
		var res = new resource();
		res.type = resource_type;
		res.id = this.type_list.getUint16(offset + 12*j);


		var o_name = this.type_list.getUint16(offset + 12*j + 2);
		if (o_name == 0xffff) {
		    res.name = "";
		}
		else {
		    var name_len = this.name_list.getUint8(o_name);
		    var name_list = [];
		    for (var k = 0; k < name_len; k++) {
			name_list.push(this.name_list.getUint8(o_name + 1 + k));
		    }
		    res.name = this.decode_macroman(name_list);
		}

		
		//var attrs = this.type_list.getUint8(offset + 12*j + 4);
		
		var tmsb = this.type_list.getUint8(offset + 12*j + 5);
		var t = this.type_list.getUint16(offset + 12*j + 6);

		var o_rdat = (tmsb << 16) + t;
		var l_rdat = this.resource_data.getUint32(o_rdat);
		res.data = new DataView(this.buffer,
					this.resource_data.byteOffset + o_rdat + 4,
					l_rdat);

		

		this.resources[resource_type][res.id] = res;
	    }
	    

	    

	}
	
	
	
	
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

    // see https://gist.github.com/jrus/3113240
    decode_macroman(mac_roman_bytearray) {
	var byte, char_array, idx;
	var high_chars_unicode = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü\n†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø\n¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ\n‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ'.replace(/\n/g, '');

	char_array = (function() {
            var i, ref, results;
            results = [];
            for (idx = i = 0, ref = mac_roman_bytearray.length; 0 <= ref ? i < ref : i > ref; idx = 0 <= ref ? ++i : --i) {
		byte = mac_roman_bytearray[idx];
		if (byte < 0x80) {
		    results.push(String.fromCharCode(byte));
		} else {
		    results.push(high_chars_unicode.charAt(byte - 0x80));
		}
            }
            return results;
	})();
	return char_array.join('');
    }


}

class resource {
    constructor() {
	
    }
    get dataArray() {
	var arr = [];
	for (var i = 0; i < this.data.byteLength; i++) {
	    arr.push(this.data.getUint8(i));
	}
	return arr;
    }
    get dataString() {
	// for conveniently viewing the data
	var hexArr = this.dataArray.map(function(n) {
	    var hex = n.toString(16);
	    if (hex.length === 1) {
		hex = "0" + hex;
	    }
	    return hex;

	});
	return hexArr.join(" ");
	
	
    }
}

exports.resourceFork = resourceFork;
