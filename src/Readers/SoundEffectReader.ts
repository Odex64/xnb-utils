import BinaryReader from '../Buffer/BinaryReader.js';
import BinaryWriter from '../Buffer/BinaryWriter.js';
import { ReaderWithExports, Type } from '../Type.js';
import ReaderManager from '../TypeReader.js';
import XnbError from '../XnbError.js';

interface SoundEffect {
  formatSize: number;
  format: Uint8Array;
  dataSize: number;
  data: Uint8Array;
  loopStart: number;
  loopLength: number;
  duration: number;
}

interface SoundEffectExport {
  filename: string;
  format: Uint8Array;
  loopStart: number;
  loopLength: number;
  duration: number;
}

export default class SoundEffectReader extends ReaderWithExports<SoundEffect, SoundEffectExport> {
  public constructor() {
    super(new Type({ name: 'Microsoft.Xna.Framework.Content.SoundEffectReader' }), true);
  }

  public override readFrom(buffer: BinaryReader, resolver: ReaderManager): SoundEffect {
    const formatSize = buffer.readUInt32();
    const format = buffer.readBytes(formatSize);
    const dataSize = buffer.readUInt32();
    const data = buffer.readBytes(dataSize);
    const loopStart = buffer.readInt32();
    const loopLength = buffer.readInt32();
    const duration = buffer.readInt32();

    if (formatSize !== 18) {
      throw new XnbError('Audio format not supported.');
    }

    return {
      formatSize,
      format,
      dataSize,
      data,
      loopStart,
      loopLength,
      duration
    }
  }

  public override writeTo(buffer: BinaryWriter, content: SoundEffect, manager: ReaderManager): void {
    buffer.writeUInt32(content.formatSize);
    buffer.writeBytes(content.format);
    buffer.writeUInt32(content.dataSize);
    buffer.writeBytes(content.data);
    buffer.writeInt32(content.loopStart);
    buffer.writeInt32(content.loopLength);
    buffer.writeInt32(content.duration);
  }

  public override export(value: SoundEffect, exportFile: (data: Uint8Array, extension: string) => string): SoundEffectExport {
    // For more information about the specifications, consider visiting:
    // https://isip.piconepress.com/projects/speech/software/tutorials/production/fundamentals/v1.0/section_02/s02_01_p05.html.

    const size = value.data.length + value.format.length + 5 * 4; // File size.
    const binaryWriter = new BinaryWriter(0);
    binaryWriter.writeString('RIFF'); // RIFF file description header.
    binaryWriter.writeInt32(size - 8); // The file size LESS 8 bytes.
    binaryWriter.writeString('WAVE'); // The ascii text string WAVE.
    binaryWriter.writeString('fmt '); // The ascii text string 'fmt ' (note the trailing space).

    // Get more info from format header.
    const binaryReader = new BinaryReader(Buffer.from(value.format));
    const wavTypeFormat = binaryReader.readBytes(2);
    const flags = binaryReader.readBytes(2);
    const sampleRate = binaryReader.readInt32();
    const bytesPerSec = binaryReader.readInt32();
    const blockAlignment = binaryReader.readBytes(2);
    const bitsPerSample = binaryReader.readBytes(2);

    binaryWriter.writeInt32(16); // The size of the WAV type format, usually 16.
    binaryWriter.writeBytes(wavTypeFormat); // This is a PCM header, or a value of 0x01.
    binaryWriter.writeBytes(flags); // Mono or Stereo flags.
    binaryWriter.writeInt32(sampleRate); // Self-explanatory
    binaryWriter.writeInt32(bytesPerSec);// Self-explanatory
    binaryWriter.writeBytes(blockAlignment);// Self-explanatory
    binaryWriter.writeBytes(bitsPerSample);// Self-explanatory
    binaryWriter.writeString('data'); // Start of audio data
    binaryWriter.writeInt32(value.dataSize); // Size of audio data
    binaryWriter.writeBytes(value.data); // Audio data

    return {
      filename: exportFile(binaryWriter.buffer, '.wav'),
      format: value.format,
      loopStart: value.loopStart,
      loopLength: value.loopLength,
      duration: value.duration
    }
  }

  public override import(value: SoundEffectExport, importFile: (filename: string) => Uint8Array): SoundEffect {
    const audio = new BinaryReader(Buffer.from(importFile(value.filename)));
    audio.bytePosition += 40;
    const dataSize = audio.readInt32();
    const data = audio.readBytes(dataSize);

    return {
      data: data,
      dataSize: dataSize,
      duration: value.duration,
      format: Buffer.from(value.format),
      formatSize: 18,
      loopLength: value.loopLength,
      loopStart: value.loopStart
    }
  }
}