# resourcefork

Read and parse classic Mac OS resource forks in node.

## Usage
```
import { ResourceFork } from 'resourcefork'

// ResourceFork accepts a 'BufferLike' object which can be a buffer...
import { readFileSync } from 'fs' 
const buf = readFileSync('/path/to/file')
const fork = new ResourceFork(buf)

// ...or a FileBuffer, which uses a file descriptor for lazy reads
import { FileBuffer } from 'resourcefork'
const buf2 = FileBuffer.fromFilePath("/path/to/file")
const fork2 = new ResourceFork(buf2)

// Get a map of all resources
const resourceMap = fork.resourceMap()
const resource1 = resourceMap['PICT'][1001]

// Get a single resource
const resource2 = fork.getResource('PICT', 1002)

// If using a FileBuffer, the resource data is only read from disk when calling 
// instance methods
const buffer = resource1.toBuffer()
const hexStr = resource2.toHexString()

// Convert to useful formats
const resource3 = fork.getResource('Tune', 600)
const midi = resource3.toMidi()
```

## Acknowledgements
The conversion from raw resources to useful formats are predominantly straight ports from C++ to Typescript of functionality from the   [resource_dasm](https://github.com/fuzziqersoftware/resource_dasm) project. Many thanks to their work!

## License
MIT
