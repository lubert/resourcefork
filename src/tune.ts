class MidiChunkHeader {
  magic: number;
  size: number;
  constructor(magic: number, size: number) {
    this.magic = magic;
    this.size = size;
  }

  toBuffer() {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(this.magic, 0);
    buffer.writeUInt32BE(this.size, 4);
    return buffer;
  }
}

class MidiHeader {
  header: MidiChunkHeader;
  format: number;
  track_count: number;
  division: number;

  constructor(
    header: MidiChunkHeader,
    format: number,
    track_count: number,
    division: number,
  ) {
    this.header = header;
    this.format = format;
    this.track_count = track_count;
    this.division = division;
  }

  toBuffer() {
    const buffer = Buffer.alloc(14);
    buffer.writeUInt32BE(this.header.magic, 0);
    buffer.writeUInt32BE(this.header.size, 4);
    buffer.writeUInt16BE(this.format, 8);
    buffer.writeUInt16BE(this.track_count, 10);
    buffer.writeUInt16BE(this.division, 12);
    return buffer;
  }
}

class MidiEvent {
  when: bigint; //uint64
  status: number; //uint8
  data: number[];

  constructor(when: bigint, status: number, param1: number, param2?: number) {
    this.when = when;
    this.status = status;
    this.data = [param1];
    if (param2 !== undefined) {
      this.data.push(param2);
    }
  }
}

export function tuneToMidi(buffer: Buffer): Buffer {
  const magic = buffer.readUInt32BE(4);
  const musiStr = 0x6d757369; // 'musi'
  if (magic !== musiStr) {
    throw new Error("Tune identifier is incorrect");
  }

  const events: MidiEvent[] = [];
  const partitionIdToChannel = new Map<number, number>();
  let currentTime = BigInt(0);

  let offset = 20;
  while (offset < buffer.length) {
    const event = buffer.readUInt32BE(offset);
    offset += 4;
    const type = (event >> 28) & 0x0f;
    switch (type) {
      case 0x00:
      case 0x01: // pause
        currentTime += BigInt(event & 0x00ffffff);
        break;
      case 0x02: // simple note event
      case 0x03: // simple note event
      case 0x09: {
        // extended note event
        let key: number;
        let vel: number;
        let partitionId: number;
        let duration: number;
        if (type === 0x09) {
          const options = buffer.readUInt32BE(offset);
          offset += 4;
          partitionId = (event >> 16) & 0xfff;
          key = (event >> 8) & 0xff;
          vel = (options >> 22) & 0x7f;
          duration = options & 0x3fffff;
        } else {
          partitionId = (event >> 24) & 0x1f;
          key = ((event >> 18) & 0x3f) + 32;
          vel = (event >> 11) & 0x7f;
          duration = event & 0x7ff;
        }

        const channel = partitionIdToChannel.get(partitionId);
        if (channel === undefined) {
          throw new Error(
            `Notes produced on uninitialized partition: ${partitionId}`,
          );
        }

        events.push(new MidiEvent(currentTime, 0x90 | channel, key, vel));
        events.push(
          new MidiEvent(
            currentTime + BigInt(duration),
            0x80 | channel,
            key,
            vel,
          ),
        );
        break;
      }

      case 0x04: // simple controller event
      case 0x05: // simple controller event
      case 0x0a: {
        // extended controller event
        let message: number;
        let partitionId: number;
        let value: number;
        if (type === 0x0a) {
          const options = buffer.readUInt32BE(offset);
          offset += 4;
          message = (options >> 16) & 0x3fff;
          partitionId = (event >> 16) & 0xfff;
          value = options & 0xffff;
        } else {
          message = (event >> 16) & 0xff;
          partitionId = (event >> 24) & 0x1f;
          value = event & 0xffff;
        }

        // controller messages can create channels
        if (!partitionIdToChannel.has(partitionId)) {
          partitionIdToChannel.set(partitionId, partitionIdToChannel.size);
        }
        const channel = partitionIdToChannel.get(partitionId)!;
        if (channel >= 0x10) {
          throw new Error("not enough MIDI channels");
        }

        if (message == 0) {
          // bank select (ignore for now)
          break;
        } else if (message == 32) {
          // pitch bend
          // clamp the value and convert to MIDI range (14-bit)
          let sValue: number = (value << 16) >> 16;
          if (sValue < -0x0200) {
            sValue = -0x0200;
          }
          if (sValue > 0x01ff) {
            sValue = 0x01ff;
          }
          sValue = (sValue + 0x200) * 0x10;

          events.push(
            new MidiEvent(
              currentTime,
              0xe0 | channel,
              sValue & 0x7f,
              (sValue >> 7) & 0x7f,
            ),
          );
        } else {
          // some other controller message
          events.push(
            new MidiEvent(currentTime, 0xb0 | channel, message, value >> 8),
          );
        }
        break;
      }

      case 0x0f: {
        // metadata message
        const partitionId = (event >> 16) & 0xfff;
        const messageSize = (event & 0xffff) * 4;
        if (messageSize < 8) {
          throw new Error("metadata message too short for type field");
        }

        const messageData = buffer.subarray(offset, offset + messageSize - 4);
        offset += messageSize - 4;
        if (messageData.length != messageSize - 4) {
          throw new Error("metadata message exceeds track boundary");
        }

        // the second-to-last word is the message type
        const messageType =
          ((messageData[messageData.length - 4] << 8) |
            messageData[messageData.length - 3]) &
          0x3fff;
        // meta messages can create channels
        if (!partitionIdToChannel.has(partitionId)) {
          partitionIdToChannel.set(partitionId, partitionIdToChannel.size);
        }
        const channel = partitionIdToChannel.get(partitionId)!;
        if (channel >= 0x10) {
          throw new Error("not enough MIDI channels");
        }

        switch (messageType) {
          case 1: {
            // instrument definition
            if (messageSize !== 0x5c) {
              throw new Error("message size is incorrect");
            }
            const instrument =
              ((messageData[0x50] << 24) |
                (messageData[0x51] << 16) |
                (messageData[0x52] << 8) |
                messageData[0x53]) >>>
              0;
            events.push(new MidiEvent(currentTime, 0xc0 | channel, instrument));
            events.push(new MidiEvent(currentTime, 0xb0 | channel, 7, 0x7f)); // volume
            events.push(new MidiEvent(currentTime, 0xb0 | channel, 10, 0x40)); // panning
            events.push(new MidiEvent(currentTime, 0xe0 | channel, 0x00, 0x40)); // pitch bend
            break;
          }

          case 6: {
            // extended (?) instrument definition
            if (messageSize !== 0x88) {
              throw new Error("message size is incorrect");
            }
            const instrument =
              ((messageData[0x7c] << 24) |
                (messageData[0x7d] << 16) |
                (messageData[0x7e] << 8) |
                messageData[0x7f]) >>>
              0;
            events.push(new MidiEvent(currentTime, 0xc0 | channel, instrument));
            events.push(new MidiEvent(currentTime, 0xb0 | channel, 7, 0x7f)); // volume
            events.push(new MidiEvent(currentTime, 0xb0 | channel, 10, 0x40)); // panning
            events.push(new MidiEvent(currentTime, 0xe0 | channel, 0x00, 0x40)); // pitch bend
            break;
          }

          case 5: // tune difference
          case 8: // MIDI channel (probably we should use this)
          case 10: // nop
          case 11: // notes used
            break;

          default:
            console.log("offset", offset);
            throw new Error(`Unknown metadata event: ${messageType}`);
        }
        break;
      }

      case 0x08: // reserved (ignored; has 4-byte argument)
      case 0x0c: // reserved (ignored; has 4-byte argument)
      case 0x0d: // reserved (ignored; has 4-byte argument)
      case 0x0e: // reserved (ignored; has 4-byte argument)
        offset += 4;
        break;
      case 0x06: // marker (ignored)
      case 0x07: // marker (ignored)
        break;

      default:
        throw new Error("unsupported event in stream");
    }
  }

  // append the MIDI track end event
  events.push(new MidiEvent(currentTime, 0xff, 0x2f, 0x00));

  // sort the events by time, since there can be out-of-order note off events
  events.sort((a, b) => Number(a.when - b.when));

  // generate the MIDI track
  const midiTrackData: number[] = [];
  currentTime = BigInt(0);

  for (const event of events) {
    let delta = Number(event.when - currentTime);
    currentTime = event.when;

    // write the delay field (encoded as variable-length int)//
    let deltaBytes: number[] = [];
    while (delta > 0x7f) {
      deltaBytes.push(delta & 0x7f);
      delta >>= 7;
    }
    deltaBytes.push(delta);
    for (let x = 1; x < deltaBytes.length; x++) {
      deltaBytes[x] |= 0x80;
    }
    deltaBytes.reverse();
    midiTrackData.push(...deltaBytes);

    // write the event contents
    midiTrackData.push(event.status);
    midiTrackData.push(...event.data);
  }

  // generate the MIDI headers
  const midiHeader = new MidiHeader(
    new MidiChunkHeader(
      0x4d546864, // 'MThd'
      6,
    ),
    0,
    1,
    600, // ticks per quarter note
  );

  const trackHeader = new MidiChunkHeader(
    0x4d54726b, // 'MTrk'
    midiTrackData.length,
  );

  return Buffer.concat([
    midiHeader.toBuffer(),
    trackHeader.toBuffer(),
    Buffer.from(midiTrackData),
  ]);
}
