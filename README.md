# resourcefork

Read and parse classic Mac OS resource forks in node. Implemented with file descriptors to avoid reading the entire resource fork into memory.

## Usage
```
import { ResourceFork } from 'resourcefork'

const fork = new ResourceFork('/path/to/file')

// Get a map of all resources
const resourceMap = fork.resourceMap()
const resource1 = resourceMap['PICT'][1001]

// Get a single resource
const resource2 = fork.getResource('PICT', 1002)

// Resource data is only read from disk when calling buffer or other instance methods
const buffer = resource1.buffer()
const hexStr = resource2.toHexString()
```

## License
MIT
