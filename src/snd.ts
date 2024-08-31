import {
  mace_table_1,
  mace_table_2,
  mace_table_3,
  mace_table_4,
} from "./mace_tables";

enum LoopType {
  NORMAL = 0,
  ALTERNATE = 1,
  REVERSE = 2,
}

class DecodedSoundResource {
  constructor(
    public is_mp3 = false,
    public sample_rate = 0,
    public base_note = 0,
    public num_channels = 0,
    public bits_per_sample = 0,
    public loop_start_sample_offset = 0,
    public loop_end_sample_offset = 0,
    public loop_repeat_count = 0, // 0 = loop forever size_t
    public loop_type = LoopType.NORMAL,
    // This string contains a raw WAV or MP3 file (determined by is_mp3); in
    // the WAV case, the actual samples start at sample_start_offset within the
    // data string
    public sample_start_offset = 0,
    public data = Buffer.alloc(0),
  ) {}
}

class SoundResourceHeaderMohawkChunkHeader {
  static sizeOf = 8;

  constructor(
    public type: number,
    public size: number, // not including this header
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceHeaderMohawkChunkHeader(
      buffer.readUInt32BE(offset),
      buffer.readUInt32BE(offset + 4),
    );
  }
}

class SoundResourceHeaderMohawkFormat {
  static sizeOf = 20;

  // Used when header.type = 'Data' or 'Cue#'
  constructor(
    public sample_rate: number,
    public num_samples: number, // could be sample bytes, could also be uint16_t
    public sample_bits: number,
    public num_channels: number,
    public unknown: [number, number, number],
    // Sample data immediately follows
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceHeaderMohawkFormat(
      buffer.readUInt16BE(offset),
      buffer.readUInt32BE(offset + 2),
      buffer.readUInt8(offset + 6),
      buffer.readUInt8(offset + 7),
      [
        buffer.readUInt32BE(offset + 8),
        buffer.readUInt32BE(offset + 12),
        buffer.readUInt32BE(offset + 16),
      ],
    );
  }
}

class WaveFileLoopHeader {
  static sizeOf = 68;

  constructor(
    // uint32le unless noted
    public smplMagic: number, // uint32be
    public smplSize: number,
    public manufacturer: number,
    public product: number,
    public samplePeriod: number,
    public baseNote: number,
    public pitchFraction: number,
    public smpteFormat: number,
    public smpteOffset: number,
    public numLoops: number,
    public samplerData: number,
    // Can be zero? We'll only have at most one loop in this context
    public loopCuePointId: number,
    public loopType: number, // 0 = normal, 1 = ping-pong, 2 = reverse
    public loopStart: number, // Start and end are byte offsets into the wave data, not sample indexes
    public loopEnd: number,
    public loopFraction: number, // Fraction of a sample to loop (0)
    public loopPlayCount: number, // 0 = loop forever
  ) {}

  toBuffer(): Buffer {
    const buffer = Buffer.alloc(WaveFileLoopHeader.sizeOf);
    buffer.writeUInt32BE(this.smplMagic, 0);
    buffer.writeUInt32LE(this.smplSize, 4);
    buffer.writeUInt32LE(this.manufacturer, 8);
    buffer.writeUInt32LE(this.product, 12);
    buffer.writeUInt32LE(this.samplePeriod, 16);
    buffer.writeUInt32LE(this.baseNote, 20);
    buffer.writeUInt32LE(this.pitchFraction, 24);
    buffer.writeUInt32LE(this.smpteFormat, 28);
    buffer.writeUInt32LE(this.smpteOffset, 32);
    buffer.writeUInt32LE(this.numLoops, 36);
    buffer.writeUInt32LE(this.samplerData, 40);
    buffer.writeUInt32LE(this.loopCuePointId, 44);
    buffer.writeUInt32LE(this.loopType, 48);
    buffer.writeUInt32LE(this.loopStart, 52);
    buffer.writeUInt32LE(this.loopEnd, 56);
    buffer.writeUInt32LE(this.loopFraction, 60);
    buffer.writeUInt32LE(this.loopPlayCount, 64);
    return buffer;
  }
}

class WaveFileHeader {
  riffMagic: number; // 0x52494646 ('RIFF')
  fileSize: number; // size of file - 8
  waveMagic: number; // 0x57415645

  fmtMagic: number; // 0x666d7420 ('fmt ')
  fmtSize: number; // 16
  format: number; // 1 = PCM
  numChannels: number;
  sampleRate: number;
  byteRate: number; // num_channels * sample_rate * bits_per_sample / 8
  blockAlign: number; // num_channels * bits_per_sample / 8
  bitsPerSample: number;

  loop?: WaveFileLoopHeader;

  dataMagic: number; // uint32be - 0x64617461 ('data')
  dataSize: number; // uint32le - num_samples * num_channels * bits_per_sample / 8

  constructor(
    numSamples: number,
    numChannels: number,
    sampleRate: number,
    bitsPerSample: number,
    loopStart: number = 0,
    loopEnd: number = 0,
    baseNote: number = 0x3c,
  ) {
    this.riffMagic = 0x52494646; // 'RIFF'
    this.waveMagic = 0x57415645; // 'WAVE'
    this.fmtMagic = 0x666d7420; // 'fmt '
    this.fmtSize = 16;
    this.format = 1;
    this.numChannels = numChannels;
    this.sampleRate = sampleRate;
    this.byteRate = (numChannels * sampleRate * bitsPerSample) / 8;
    this.blockAlign = (numChannels * bitsPerSample) / 8;
    this.bitsPerSample = bitsPerSample;

    if ((loopStart > 0 && loopEnd > 0) || baseNote !== 0x3c) {
      this.fileSize =
        (numSamples * numChannels * bitsPerSample) / 8 + this.sizeOf() - 8;

      this.loop = new WaveFileLoopHeader(
        0x736d706c, // 'smpl'
        0x3c,
        0,
        0,
        Math.floor(1000000000 / sampleRate),
        baseNote,
        0,
        0,
        0,
        1,
        0x18, // includes the loop struct below

        0,
        0, // 0 = normal, 1 = ping-pong, 2 = reverse
        loopStart * (bitsPerSample >> 3),
        loopEnd * (bitsPerSample >> 3),
        0,
        0, // 0 = loop forever
      );

      this.dataMagic = 0x64617461; // 'data'
      this.dataSize = (numSamples * numChannels * bitsPerSample) / 8;
    } else {
      const headerSize = this.sizeOf() - 0x3c + 8;
      this.fileSize =
        (numSamples * numChannels * bitsPerSample) / 8 + headerSize - 8;

      this.dataMagic = 0x64617461; // 'data'
      this.dataSize = (numSamples * numChannels * bitsPerSample) / 8;
    }
  }

  sizeOf(): number {
    return (
      44 + (this.loop?.smplMagic === 0x736d706c ? WaveFileLoopHeader.sizeOf : 0)
    );
  }

  toBuffer(): Buffer {
    const buffer = Buffer.alloc(this.sizeOf());
    buffer.writeUInt32BE(this.riffMagic, 0);
    buffer.writeUInt32LE(this.fileSize, 4);
    buffer.writeUInt32BE(this.waveMagic, 8);

    buffer.writeUInt32BE(this.fmtMagic, 12);
    buffer.writeUInt32LE(this.fmtSize, 16);
    buffer.writeUInt16LE(this.format, 20);
    buffer.writeUInt16LE(this.numChannels, 22);
    buffer.writeUInt32LE(this.sampleRate, 24);
    buffer.writeUInt32LE(this.byteRate, 28);
    buffer.writeUInt16LE(this.blockAlign, 32);
    buffer.writeUInt16LE(this.bitsPerSample, 34);
    if (this.loop) {
      const loopBuffer = this.loop.toBuffer();
      loopBuffer.copy(buffer, 36);
      buffer.writeUInt32BE(this.dataMagic, 36 + WaveFileLoopHeader.sizeOf);
      buffer.writeUInt32LE(this.dataSize, 40 + WaveFileLoopHeader.sizeOf);
    } else {
      buffer.writeUInt32BE(this.dataMagic, 36);
      buffer.writeUInt32LE(this.dataSize, 40);
    }
    return buffer;
  }
}

class SoundResourceHeaderFormat1 {
  static sizeOf = 4;

  constructor(
    public format_code: number, // = 1
    public data_format_count: number, // we only support 0 or 1 here
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceHeaderFormat1(
      buffer.readUInt16BE(offset),
      buffer.readUInt16BE(offset + 2),
    );
  }
}

class SoundResourceHeaderFormat2 {
  static sizeOf = 6;

  constructor(
    public format_code: number, // = 2
    public reference_count: number,
    public num_commands: number,
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceHeaderFormat2(
      buffer.readUInt16BE(offset),
      buffer.readUInt16BE(offset + 2),
      buffer.readUInt16BE(offset + 4),
    );
  }
}

// 3 is not a standard header format; it's used by Beatnik for MPEG-encoded
// samples. This format is only parsed when the ResourceFile's index format is
// HIRF.
class SoundResourceHeaderFormat3 {
  static sizeOf = 132;

  constructor(
    public format_code: number,
    public type: number, // 'none', 'ima4', 'imaW', 'mac3', 'mac6', 'ulaw', 'alaw', or 'mpga'-'mpgn'
    public sample_rate: number, // actually a Fixed16
    public decoded_bytes: number,
    public frame_count: number, // If MPEG, the number of blocks
    public encoded_bytes: number,
    public unused: number,
    public start_frame: number,
    public channel_loop_start_frame: [
      number,
      number,
      number,
      number,
      number,
      number,
    ], // If MPEG, the number of uint16_ts to skip
    public channel_loop_end_frame: [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    public name_resource_type: number,
    public name_resource_id: number,
    public base_note: number,
    public channel_count: number, // up to 6
    public bits_per_sample: number, // 8 or 16
    public is_embedded: number,
    public is_encrypted: number,
    public is_little_endian: number,
    public reserved1: [number, number],
    public reserved2: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceHeaderFormat3(
      buffer.readUInt16BE(offset),
      buffer.readUInt32BE(offset + 2),
      buffer.readUInt32BE(offset + 6),
      buffer.readUInt32BE(offset + 10),
      buffer.readUInt32BE(offset + 14),
      buffer.readUInt32BE(offset + 18),
      buffer.readUInt32BE(offset + 22),
      buffer.readUInt32BE(offset + 26),
      [
        buffer.readUInt32BE(offset + 30),
        buffer.readUInt32BE(offset + 34),
        buffer.readUInt32BE(offset + 38),
        buffer.readUInt32BE(offset + 42),
        buffer.readUInt32BE(offset + 46),
        buffer.readUInt32BE(offset + 50),
      ],
      [
        buffer.readUInt32BE(offset + 54),
        buffer.readUInt32BE(offset + 58),
        buffer.readUInt32BE(offset + 62),
        buffer.readUInt32BE(offset + 66),
        buffer.readUInt32BE(offset + 70),
        buffer.readUInt32BE(offset + 74),
      ],
      buffer.readUInt32BE(offset + 78),
      buffer.readUInt32BE(offset + 82),
      buffer.readUInt8(offset + 86),
      buffer.readUInt8(offset + 87),
      buffer.readUInt8(offset + 88),
      buffer.readUInt8(offset + 89),
      buffer.readUInt8(offset + 90),
      buffer.readUInt8(offset + 91),
      [buffer.readUInt32BE(offset + 92), buffer.readUInt32BE(offset + 96)],
      [
        buffer.readUInt32BE(offset + 100),
        buffer.readUInt32BE(offset + 104),
        buffer.readUInt32BE(offset + 108),
        buffer.readUInt32BE(offset + 112),
        buffer.readUInt32BE(offset + 116),
        buffer.readUInt32BE(offset + 120),
        buffer.readUInt32BE(offset + 124),
        buffer.readUInt32BE(offset + 128),
      ],
    );
  }
}

class SoundResourceDataFormatHeader {
  static sizeOf = 6;

  constructor(
    public data_format_id: number, // we only support 5 here (sampled sound)
    public flags: number, // 0x40 = stereo
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceDataFormatHeader(
      buffer.readUInt16BE(offset),
      buffer.readUInt32BE(offset + 2),
    );
  }
}

class SoundResourceCommand {
  static sizeOf = 8;

  constructor(
    public command: number,
    public param1: number,
    public param2: number,
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceCommand(
      buffer.readUInt16BE(offset),
      buffer.readUInt16BE(offset + 2),
      buffer.readUInt32BE(offset + 4),
    );
  }
}

class SoundResourceSampleBuffer {
  static sizeOf = 22;

  constructor(
    public data_offset: number,
    public data_bytes: number,
    public sample_rate: number,
    public loop_start: number,
    public loop_end: number,
    public encoding: number,
    public base_note: number,
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceSampleBuffer(
      buffer.readUInt32BE(offset),
      buffer.readUInt32BE(offset + 4),
      buffer.readUInt32BE(offset + 8),
      buffer.readUInt32BE(offset + 12),
      buffer.readUInt32BE(offset + 16),
      buffer.readUInt8(offset + 20),
      buffer.readUInt8(offset + 21),
    );
  }
}

class SoundResourceCompressedBuffer {
  static sizeOf = 42;

  constructor(
    public num_frames: number,
    public sample_rate: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ], // TODO: This could be a long double
    public marker_chunk: number,
    public format: number,
    public reserved1: number,
    public state_vars: number, // High word appears to be sample size
    public left_over_block_ptr: number,
    public compression_id: number,
    public packet_size: number,
    public synth_id: number,
    public bits_per_sample: number,
  ) {}

  static fromBuffer(buffer: Buffer, offset: number) {
    return new SoundResourceCompressedBuffer(
      buffer.readUInt32BE(offset),
      [
        buffer.readUInt8(offset + 4),
        buffer.readUInt8(offset + 5),
        buffer.readUInt8(offset + 6),
        buffer.readUInt8(offset + 7),
        buffer.readUInt8(offset + 8),
        buffer.readUInt8(offset + 9),
        buffer.readUInt8(offset + 10),
        buffer.readUInt8(offset + 11),
        buffer.readUInt8(offset + 12),
        buffer.readUInt8(offset + 13),
      ],
      buffer.readUInt32BE(offset + 14),
      buffer.readUInt32BE(offset + 18),
      buffer.readUInt32BE(offset + 22),
      buffer.readUInt32BE(offset + 26),
      buffer.readUInt32BE(offset + 30),
      buffer.readUInt16BE(offset + 34),
      buffer.readUInt16BE(offset + 36),
      buffer.readUInt16BE(offset + 38),
      buffer.readUInt16BE(offset + 40),
    );
  }
}

class ChannelData {
  // int16_t index = 0;
  // int16_t factor = 0;
  // int16_t prev2 = 0;
  // int16_t previous = 0;
  // int16_t level = 0;
  constructor(
    public index = 0,
    public factor = 0,
    public prev2 = 0,
    public previous = 0,
    public level = 0,
  ) {}
}

const tables = [
  { table1: mace_table_1, table2: mace_table_2[0], stride: 4 },
  { table1: mace_table_3, table2: mace_table_4[0], stride: 2 },
  { table1: mace_table_1, table2: mace_table_2[0], stride: 4 },
];

function clip_int16(x: number) {
  if (x > 0x7fff) {
    return 0x7fff;
  }
  if (x < -0x8000) {
    return -0x7fff;
  }
  return x;
}

function read_table(channel: ChannelData, value: number, table_index: number) {
  let current;

  let entry_index = ((channel.index & 0x7f0) >> 4) * tables[table_index].stride;
  if (value < tables[table_index].stride) {
    entry_index += value;
    current = tables[table_index].table2[entry_index];
  } else {
    entry_index += 2 * tables[table_index].stride - value - 1;
    current = -1 - tables[table_index].table2[entry_index];
  }

  if (
    (channel.index +=
      tables[table_index].table1[value] - (channel.index >> 5)) < 0
  ) {
    channel.index = 0;
  }

  return current;
}

function decode_mace(
  vdata: Buffer,
  offset: number,
  size: number,
  stereo: boolean,
  is_mace3: boolean,
): number[] {
  const data = vdata.subarray(offset, offset + size);

  const channel_data: ChannelData[] = Array.from({
    length: stereo ? 2 : 1,
  }).map(() => new ChannelData());
  const result_data: number[] = Array.from({
    length: size * (is_mace3 ? 3 : 6),
  });

  let bytes_per_frame = (is_mace3 ? 2 : 1) * channel_data.length;
  let output_offset = 0;
  for (let input_offset = 0; input_offset < size; ) {
    if (input_offset + bytes_per_frame > size) {
      throw new Error("odd number of bytes remaining");
    }

    for (
      let which_channel = 0;
      which_channel < channel_data.length;
      which_channel++
    ) {
      const channel = channel_data[which_channel];

      if (is_mace3) {
        for (let k = 0; k < 2; k++) {
          const value = data[input_offset++];
          const values = [value & 7, (value >> 3) & 3, value >> 5];

          for (let l = 0; l < 3; l++) {
            const current = read_table(
              channel_data[which_channel],
              values[l],
              l,
            );

            const sample = clip_int16(current + channel.level);
            result_data[output_offset++] = sample;
            channel.level = sample - (sample >> 3);
          }
        }
      } else {
        const value = data[input_offset++];
        const values = [value >> 5, (value >> 3) & 3, value & 7];
        for (let l = 0; l < 3; l++) {
          let current = read_table(channel, values[l], l);

          if ((channel.previous ^ current) >= 0) {
            if (channel.factor + 506 > 32767) {
              channel.factor = 32767;
            } else {
              channel.factor += 506;
            }
          } else {
            if (channel.factor - 314 < -32768) {
              channel.factor = -32767;
            } else {
              channel.factor -= 314;
            }
          }

          current = clip_int16(current + channel.level);

          channel.level = (current * channel.factor) >> 15;
          current >>= 1;

          result_data[output_offset++] =
            channel.previous + channel.prev2 - ((channel.prev2 - current) >> 2);
          result_data[output_offset++] =
            channel.previous + current + ((channel.prev2 - current) >> 2);

          channel.prev2 = channel.previous;
          channel.previous = current;
        }
      }
    }
  }

  return result_data;
}

class IMA4Packet {
  static sizeOf = 34;

  constructor(
    public header: number,
    public data: number[],
  ) {}

  predictor() {
    // Note: the lack of a shift here is not a bug - these 9 bits actually do
    // store the high bits of the predictor
    return this.header & 0xff80;
  }

  step_index() {
    return this.header & 0x007f;
  }

  static fromBuffer(buffer: Buffer, offset: number) {
    return new IMA4Packet(
      buffer.readUInt16BE(offset),
      Array.from({ length: 32 }).map((_, i) => {
        return buffer.readUInt8(offset + 2 + i);
      }),
    );
  }
}

interface ChannelState {
  predictor: number;
  step_index: number;
  step: number;
}

function decode_ima4(
  vdata: Buffer,
  offset: number,
  size: number,
  stereo: boolean,
): number[] {
  const data = vdata.subarray(offset, offset + size);

  const index_table = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
  const step_table = [
    7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
    50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
    253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
    1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024,
    3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493,
    10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086,
    29794, 32767,
  ];

  if (size % (stereo ? 68 : 34)) {
    throw new Error("ima4 data size must be a multiple of 34 bytes");
  }
  const result_data: number[] = Array.from({
    length: Math.floor((size * 64) / 34),
  });

  const channel_state: ChannelState[] = [];
  const base_packet1 = IMA4Packet.fromBuffer(data, 0);
  channel_state[0] = {
    predictor: base_packet1.predictor(),
    step_index: base_packet1.step_index(),
    step: step_table[base_packet1.step_index()],
  };
  if (stereo) {
    const base_packet = IMA4Packet.fromBuffer(data, 34);
    channel_state[1] = {
      predictor: base_packet.predictor(),
      step_index: base_packet.step_index(),
      step: step_table[base_packet.step_index()],
    };
  }

  for (let packet_offset = 0; packet_offset < size; packet_offset += 34) {
    const packet = IMA4Packet.fromBuffer(data, packet_offset);
    const packet_index = packet_offset / 34;
    const channel = channel_state[stereo ? packet_index & 1 : 0];

    // Interleave stereo samples appropriately
    let output_offset;
    const output_step = stereo ? 2 : 1;
    if (stereo) {
      output_offset = (packet_index & ~1) * 64 + (packet_index & 1);
    } else {
      output_offset = packet_index * 64;
    }

    for (let x = 0; x < 32; x++) {
      let value = packet.data[x];
      for (let y = 0; y < 2; y++) {
        const nybble = value & 0x0f;
        value >>= 4;

        let diff = 0;
        if (nybble & 4) {
          diff += channel.step;
        }
        if (nybble & 2) {
          diff += channel.step >> 1;
        }
        if (nybble & 1) {
          diff += channel.step >> 2;
        }
        diff += channel.step >> 3;
        if (nybble & 8) {
          diff = -diff;
        }

        channel.predictor += diff;

        if (channel.predictor > 0x7fff) {
          channel.predictor = 0x7fff;
        } else if (channel.predictor < -0x8000) {
          channel.predictor = -0x8000;
        }

        result_data[output_offset] = channel.predictor;
        output_offset += output_step;

        channel.step_index += index_table[nybble];
        if (channel.step_index < 0) {
          channel.step_index = 0;
        } else if (channel.step_index > 88) {
          channel.step_index = 88;
        }
        channel.step = step_table[channel.step_index];
      }
    }
  }

  return result_data;
}

function decode_alaw(vdata: Buffer, offset: number, size: number): number[] {
  const data = vdata.subarray(offset, offset + size);

  const ret: number[] = [];
  for (let x = 0; x < size; x++) {
    let sample = ((data[x] << 24) >> 24) ^ 0x55;
    let sign = sample & 0x80 ? -1 : 1;

    if (sign === -1) {
      sample &= 0x7f;
    }

    let shift = ((sample & 0xf0) >> 4) + 4;
    if (shift === 4) {
      ret[x] = sign * ((sample << 1) | 1);
    } else {
      ret[x] =
        sign *
        ((1 << shift) | ((sample & 0x0f) << (shift - 4)) | (1 << (shift - 5)));
    }
  }
  return ret;
}

function decode_ulaw(vdata: Buffer, offset: number, size: number): number[] {
  const data = vdata.subarray(offset, offset + size);
  const ULAW_BIAS = 33;

  const ret: number[] = [];
  for (let x = 0; x < size; x++) {
    let sample = ~((data[x] << 24) >> 24);
    const sign = sample & 0x80 ? -1 : 1;
    if (sign === -1) {
      sample &= 0x7f;
    }
    const shift = ((sample & 0xf0) >> 4) + 5;
    ret[x] =
      sign *
        ((1 << shift) | ((sample & 0x0f) << (shift - 4)) | (1 << (shift - 5))) -
      ULAW_BIAS;
  }
  return ret;
}

function bswap16(value: number): number {
  return ((value & 0xff00) >> 8) | ((value & 0x00ff) << 8);
}

export function decodeSndData(
  buffer: Buffer,
  metadata_only = false,
  hirf_semantics = false,
  decompress_ysnd = false,
): DecodedSoundResource {
  if (buffer.byteLength < 4) {
    throw new Error("snd doesn't even contain a format code");
  }

  const ret = new DecodedSoundResource();
  ret.num_channels = 1;

  // These format codes ('Cue#' or 'Data') are the type codes of the first chunk
  // for a Mohawk-specific chunk-based format - we don't want to consume the
  // format code from r because it's part of the first chunk header
  let offset = 0;
  const format_code32 = buffer.readUInt32BE(offset);
  if (format_code32 === 0x43756523 || format_code32 === 0x44617461) {
    while (buffer.byteLength - offset >= 8) {
      const header = SoundResourceHeaderMohawkChunkHeader.fromBuffer(
        buffer,
        offset,
      );
      offset += SoundResourceHeaderMohawkChunkHeader.sizeOf;
      if (header.type === 0x43756523) {
        offset += header.size;
      } else if (header.type === 0x44617461) {
        const data_header = SoundResourceHeaderMohawkFormat.fromBuffer(
          buffer,
          offset,
        );
        offset += SoundResourceHeaderMohawkFormat.sizeOf;
        // TODO: we should obviously support different values for these fields
        // but I currently don't have any example files with different values so
        // I can't tell how the samples are interleaved, or even if num_samples
        // is actually num_bytes, num_frames, or something else.
        if (data_header.num_channels !== 1) {
          throw new Error("MHK snd does not have exactly 1 channel");
        }
        if (data_header.sample_bits !== 8) {
          throw new Error("MHK snd does not have 8-bit samples");
        }
        ret.sample_rate = data_header.sample_rate;
        ret.bits_per_sample = data_header.sample_bits;
        ret.num_channels = data_header.num_channels;
        if (!metadata_only) {
          const wav = new WaveFileHeader(
            data_header.num_samples,
            data_header.num_channels,
            data_header.sample_rate,
            data_header.sample_bits,
          );
          const wavBuffer = wav.toBuffer();
          ret.sample_start_offset = wavBuffer.byteLength;
          ret.data = Buffer.concat([
            wavBuffer,
            buffer.subarray(offset, offset + data_header.num_samples),
          ]);
        }
        return ret;
      }
    }
    throw new Error("MHK snd does not contain a Data section");
  }

  // Parse the resource header
  let num_commands;
  const format_code16 = buffer.readUint16BE(offset);
  if (format_code16 === 0x0001) {
    const header = SoundResourceHeaderFormat1.fromBuffer(buffer, offset);
    offset += SoundResourceHeaderFormat1.sizeOf;

    // If data format count is 0, assume mono
    if (header.data_format_count === 0) {
      ret.num_channels = 1;
    } else if (header.data_format_count === 1) {
      const data_format = SoundResourceDataFormatHeader.fromBuffer(
        buffer,
        offset,
      );
      offset += SoundResourceDataFormatHeader.sizeOf;
      if (data_format.data_format_id !== 5) {
        throw new Error("snd data format is not sampled");
      }
      ret.num_channels = data_format.flags & 0x40 ? 2 : 1;
    } else {
      throw new Error("snd has multiple data formats");
    }

    num_commands = buffer.readUint16BE(offset);
    offset += 2;
  } else if (format_code16 === 0x0002) {
    const header = SoundResourceHeaderFormat2.fromBuffer(buffer, offset);
    offset += SoundResourceHeaderFormat2.sizeOf;
    num_commands = header.num_commands;
  } else if (format_code16 === 0x0003 && hirf_semantics) {
    const header = SoundResourceHeaderFormat3.fromBuffer(buffer, offset);
    offset += SoundResourceHeaderFormat3.sizeOf;

    if ((header.type & 0xffffff00) !== 0x6d706700) {
      throw new Error("format 3 snd is not mp3");
    }

    // TODO: for little-endian samples, do we just byteswap the entire stream?
    if (header.is_little_endian) {
      throw new Error("format 3 snd is little-endian");
    }
    // TODO: for encrypted samples, do we just call decrypt_soundmusicsys_data
    // on the sample buffer?
    if (header.is_encrypted) {
      throw new Error("format 3 snd is encrypted");
    }
    if (decompress_ysnd) {
      throw new Error("cannot decompress Ysnd-encoded format 3 snd");
    }

    ret.is_mp3 = true;
    ret.sample_rate = header.sample_rate >> 16;
    ret.base_note = (header.base_note ? header.base_note : 0x3c) & 0xff;
    if (!metadata_only) {
      ret.data = buffer.subarray(offset, buffer.byteLength);
    }
    return ret;
  } else {
    throw new Error("snd is not format 1 or 2");
  }

  if (num_commands === 0) {
    throw new Error("snd contains no commands");
  }

  let sample_buffer_offset = 0;
  for (let x = 0; x < num_commands; x++) {
    const command = SoundResourceCommand.fromBuffer(buffer, offset);
    offset += SoundResourceCommand.sizeOf;

    const command_names = new Map<number, string>([
      [0x0003, "quiet"],
      [0x0004, "flush"],
      [0x0005, "reinit"],
      [0x000a, "wait"],
      [0x000b, "pause"],
      [0x000c, "resume"],
      [0x000d, "callback"],
      [0x000e, "sync"],
      [0x0018, "available"],
      [0x0019, "version"],
      [0x001a, "get total cpu load"],
      [0x001b, "get channel cpu load"],
      [0x0028, "note"],
      [0x0029, "rest"],
      [0x002a, "set pitch"],
      [0x002b, "set amplitude"],
      [0x002c, "set timbre"],
      [0x002d, "get amplitude"],
      [0x002e, "set volume"],
      [0x002f, "get volume"],
      [0x003c, "load wave table"],
      [0x0052, "set sampled pitch"],
      [0x0053, "get sampled pitch"],
    ]);

    switch (command.command) {
      case 0x0000: // null (do nothing)
        break;
      case 0x8050: // load sample voice
      case 0x8051: // play sampled sound
        if (sample_buffer_offset) {
          throw new Error("snd contains multiple buffer commands");
        }
        sample_buffer_offset = command.param2;
        break;
      default:
        const name = command_names.get(command.command);
        if (name) {
          throw new Error(
            `command not implemented: ${command.command} (${name}) ${command.param1} ${command.param2}`,
          );
        } else {
          throw new Error(
            `command not implemented: ${command.command} ${command.param1} ${command.param2}`,
          );
        }
    }
  }

  // Some snds have an incorrect sample buffer offset, but they still play! I
  // guess Sound Manager ignores the offset in the command? (We do so here)
  const sample_buffer = SoundResourceSampleBuffer.fromBuffer(buffer, offset);
  offset += SoundResourceSampleBuffer.sizeOf;
  ret.sample_rate = sample_buffer.sample_rate >> 16;
  ret.base_note = sample_buffer.base_note ? sample_buffer.base_note : 0x3c;
  ret.loop_start_sample_offset = sample_buffer.loop_start;
  ret.loop_end_sample_offset = sample_buffer.loop_end;
  ret.loop_repeat_count = 0;
  ret.loop_type = LoopType.NORMAL;

  if (decompress_ysnd) {
    if (sample_buffer.encoding !== 0x00) {
      throw new Error("Ysnd contains doubly-compressed buffer");
    }

    ret.bits_per_sample = 8;

    if (!metadata_only) {
      const wav = new WaveFileHeader(
        sample_buffer.data_bytes,
        ret.num_channels,
        ret.sample_rate,
        ret.bits_per_sample,
        ret.loop_start_sample_offset,
        ret.loop_end_sample_offset,
        ret.base_note,
      );

      const w = Array.from(wav.toBuffer());
      ret.sample_start_offset = w.length;
      const end_size = sample_buffer.data_bytes + w.length;
      let p = 0x80;
      while (w.length < end_size) {
        let x = buffer.readUInt8(offset);
        offset += 1;
        let d1 = (x >> 4) - 8;
        p += d1 * 2;
        d1 += 8;
        if (d1 !== 0 && d1 !== 0x0f) {
          w.push(p);
          if (w.length >= end_size) {
            break;
          }
        }
        x = (x & 0x0f) - 8;
        p += x * 2;
        x += 8;
        if (x !== 0 && x !== 0x0f) {
          w.push(p);
        }
      }

      ret.data = Buffer.from(w);
    }

    return ret;
  }

  // Uncompressed data can be copied verbatim
  if (sample_buffer.encoding === 0x00) {
    if (sample_buffer.data_bytes === 0) {
      throw new Error("snd contains no samples");
    }

    // Some snds have erroneously large values in the data_bytes field, so only
    // trust it if it fits within the resource
    const num_samples = Math.min(
      sample_buffer.data_bytes,
      buffer.byteLength - offset,
    );

    ret.bits_per_sample = 8;

    if (!metadata_only) {
      const wav = new WaveFileHeader(
        num_samples,
        ret.num_channels,
        ret.sample_rate,
        ret.bits_per_sample,
        ret.loop_start_sample_offset,
        ret.loop_end_sample_offset,
        ret.base_note,
      );
      const wavBuffer = wav.toBuffer();
      ret.sample_start_offset = wavBuffer.byteLength;
      ret.data = Buffer.concat([
        wavBuffer,
        buffer.subarray(offset, offset + num_samples),
      ]);
    }
    return ret;
  } else if (
    sample_buffer.encoding === 0xfe ||
    sample_buffer.encoding === 0xff
  ) {
    // Compressed data will need to be decompressed first
    const compressed_buffer = SoundResourceCompressedBuffer.fromBuffer(
      buffer,
      offset,
    );
    offset += SoundResourceCompressedBuffer.sizeOf;

    // Hack: it appears Beatnik archives set the stereo flag even when the snd
    // is mono, so we ignore it in that case. (TODO: Does this also apply to
    // MACE3/6? I'm assuming it does here, but haven't verified this. Also, what
    // about the uncompressed case above?)
    if (hirf_semantics && ret.num_channels === 2) {
      ret.num_channels = 1;
    }

    switch (compressed_buffer.compression_id) {
      case 0xfffe:
        throw new Error("snd uses variable-ratio compression");

      case 3:
      case 4: {
        const is_mace3 = compressed_buffer.compression_id === 3;
        const decoded_samples = decode_mace(
          buffer,
          offset,
          compressed_buffer.num_frames * (is_mace3 ? 2 : 1) * ret.num_channels,
          ret.num_channels === 2,
          is_mace3,
        );
        const loop_factor = is_mace3 ? 3 : 6;

        ret.bits_per_sample = 16;
        ret.loop_start_sample_offset *= loop_factor;
        ret.loop_end_sample_offset *= loop_factor;
        if (!metadata_only) {
          const wav = new WaveFileHeader(
            Math.floor(decoded_samples.length / ret.num_channels),
            ret.num_channels,
            ret.sample_rate,
            ret.bits_per_sample,
            ret.loop_start_sample_offset,
            ret.loop_end_sample_offset,
            ret.base_note,
          );
          if (wav.dataSize !== 2 * decoded_samples.length) {
            throw new Error(
              "computed data size does not match decoded data size",
            );
          }
          const wavBuffer = wav.toBuffer();
          ret.sample_start_offset = wavBuffer.byteLength;
          ret.data = Buffer.concat([wavBuffer, Buffer.from(decoded_samples)]);
        }
        return ret;
      }

      case 0xffff:
        // 'twos' and 'sowt' are equivalent to no compression and fall through
        // to the uncompressed case below. For all others, we'll have to
        // decompress somehow
        if (
          compressed_buffer.format !== 0x74776f73 &&
          compressed_buffer.format !== 0x736f7774
        ) {
          let decoded_samples: number[];

          const num_frames = compressed_buffer.num_frames;
          let loop_factor;
          if (compressed_buffer.format === 0x696d6134) {
            // ima4
            decoded_samples = decode_ima4(
              buffer,
              offset,
              num_frames * 34 * ret.num_channels,
              ret.num_channels === 2,
            );
            loop_factor = 4; // TODO: verify this. I don't actually have any examples right now
          } else if (
            compressed_buffer.format === 0x4d414333 ||
            compressed_buffer.format === 0x4d414336
          ) {
            // MAC3, MAC6
            const is_mace3 = compressed_buffer.format === 0x4d414333;
            decoded_samples = decode_mace(
              buffer,
              offset,
              num_frames * (is_mace3 ? 2 : 1) * ret.num_channels,
              ret.num_channels === 2,
              is_mace3,
            );
            loop_factor = is_mace3 ? 3 : 6;
          } else if (compressed_buffer.format === 0x756c6177) {
            // ulaw
            decoded_samples = decode_ulaw(buffer, offset, num_frames);
            loop_factor = 2;
          } else if (compressed_buffer.format === 0x616c6177) {
            // alaw (guess)
            decoded_samples = decode_alaw(buffer, offset, num_frames);
            loop_factor = 2;
          } else {
            throw new Error(
              `snd uses unknown compression (${compressed_buffer.format})`,
            );
          }

          ret.bits_per_sample = 16;
          ret.loop_start_sample_offset *= loop_factor;
          ret.loop_end_sample_offset *= loop_factor;
          if (!metadata_only) {
            const wav = new WaveFileHeader(
              Math.floor(decoded_samples.length / ret.num_channels),
              ret.num_channels,
              ret.sample_rate,
              ret.bits_per_sample,
              ret.loop_start_sample_offset,
              ret.loop_end_sample_offset,
              ret.base_note,
            );

            if (wav.dataSize !== 2 * decoded_samples.length) {
              throw new Error(
                `computed data size (${wav.dataSize}) does not match decoded data size (${2 * decoded_samples.length})`,
              );
            }
            const wavBuffer = wav.toBuffer();
            ret.sample_start_offset = wavBuffer.byteLength;
            ret.data = Buffer.concat([wavBuffer, Buffer.from(decoded_samples)]);
          }
          return ret;
        }

      // fallthrough;
      case 0: {
        // No compression
        const num_samples = compressed_buffer.num_frames;
        ret.bits_per_sample = compressed_buffer.bits_per_sample;
        if (ret.bits_per_sample === 0) {
          ret.bits_per_sample = compressed_buffer.state_vars >> 16;
        }
        // Hack: if the sound is stereo and the computed data size is exactly
        // twice the available data size, treat it as mono
        if (
          ret.num_channels === 2 &&
          num_samples *
            ret.num_channels *
            Math.floor(ret.bits_per_sample / 8) ===
            2 * (buffer.byteLength - offset)
        ) {
          ret.num_channels = 1;
        }
        if (!metadata_only) {
          const wav = new WaveFileHeader(
            num_samples,
            ret.num_channels,
            ret.sample_rate,
            ret.bits_per_sample,
            ret.loop_start_sample_offset,
            ret.loop_end_sample_offset,
            ret.base_note,
          );
          if (wav.dataSize === 0) {
            throw new Error(
              `computed data size is zero (${num_samples} samples, ${ret.num_channels} channels, ${ret.sample_rate} kHz, ${ret.bits_per_sample} bits per sample)`,
            );
          }
          if (wav.dataSize > buffer.byteLength - offset) {
            throw new Error(
              `computed data size exceeds actual data (${wav.dataSize} computed, ${buffer.byteLength - offset} available)`,
            );
          }
          // Byteswap the samples if it's 16-bit and not 'swot'
          const samples_buf = buffer.subarray(offset, offset + wav.dataSize);
          offset += wav.dataSize;
          if (
            wav.bitsPerSample === 0x10 &&
            compressed_buffer.format !== 0x736f7774
          ) {
            const samples = new Uint16Array(
              samples_buf.buffer,
              samples_buf.byteOffset,
              samples_buf.length / 2,
            );
            for (let x = 0; x < samples_buf.length / 2; x++) {
              samples[x] = bswap16(samples[x]);
            }
          }
          const wavBuffer = wav.toBuffer();
          ret.sample_start_offset = wavBuffer.byteLength;
          ret.data = Buffer.concat([wavBuffer, samples_buf]);
        }
        return ret;
      }

      default:
        throw new Error("snd is compressed using unknown algorithm");
    }
  } else {
    throw new Error(
      `unknown encoding for snd data: %02hhX ${sample_buffer.encoding}`,
    );
  }
}
