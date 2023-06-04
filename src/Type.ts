import ReaderManager from './TypeReader.js';
import BinaryReader from './Buffer/BinaryReader.js';
import BinaryWriter from './Buffer/BinaryWriter.js';

export class Type {
  private static readonly subtypeRegex: RegExp = /\[(([a-zA-Z0-9.,=`]+)(\[])?(, |]))+/g;

  // The full name of the type.
  public name: string;

  // The subtypes of the type.
  public subtypes: Type[];

  // Whether the type is an array. Assumed false if not given.
  public isArray: boolean;

  public constructor(opts: { name: string; subtypes?: Type[]; isArray?: boolean }) {
    this.name = opts.name;
    this.subtypes = opts.subtypes ?? [];
    this.isArray = opts.isArray ?? false;
  }

  // Parses a .NET assembly type, which is how they're encoded in XNB. 
  public static fromString(type: string): Type {
    // Split the string after the type.
    const split = type.split('`');
    const name = split[0].split(',')[0];
    const subtypes = split[1]
      ?.slice(2, -1)
      .match(this.subtypeRegex)
      ?.map((e) => Type.fromString(e.slice(1, -1)));

    return new Type({
      name,
      subtypes,
      isArray: name.endsWith('[]'),
    });
  }

  public toString(): string {
    return `${this.name}\`${this.subtypes.length}[${this.subtypes.map((type) => `[${type.toString()}]`).join(',')}]`;
  }

  public equals(other: Type): boolean {
    return this.name === other.name &&
      this.subtypes.every((type, i) => type.equals(other.subtypes[i])) &&
      this.isArray === other.isArray;
  }
}

export abstract class Reader<T> {
  // Whether this type could be substituted by a subclass, or it's this type specifically.
  // This determines whether the reader's index is included in things like `List` and `Dictionary`.
  public readonly isPolymorphic: boolean;

  // The type of the reader (the reader itself, not the type it reads).
  // Used to find its index in ReaderManager.
  public readonly type: Type;

  public constructor(type: Type, isPolymorphic: boolean = false) {
    this.type = type;
    this.isPolymorphic = isPolymorphic;
  }

  /**
   * Reads a value from a buffer.
   * @param buffer The buffer to read from.
   * @param manager The set of readers to resolve readers from, which also allows access to the logger.
   * @returns The type as specified by the type reader.
   */
  public abstract readFrom(buffer: BinaryReader, manager: ReaderManager): T;

  /**
   * Writes into the buffer.
   * @param buffer The buffer to write to.
   * @param content The data to write to the stream.
   * @param manager ReaderManager to write indexes of sub-readers, which also allows access to the logger.
   */
  public abstract writeTo(buffer: BinaryWriter, content: T, manager: ReaderManager): void;
}

export abstract class ReaderWithExports<T, E = T> extends Reader<T> {
  /**
   * Exports read value into a format suitable for JSON serialization. If not provided, JSON.stringify will be used.
   * This is only called on the top-level content, which is then responsible for calling it on its children.
   * So if you're making something like a `ListReader`, make sure to call `export` manually on its children.
   * To export files along with the json, use `exportFile`.
   * @param value
   * @param exportFile
   * Exports a file with given data and extension, and returns the exported filename.
   * You should probably save this in the exported json somewhere, so you can retrieve it in `import`.
   */
  public abstract export(value: T, exportFile: (data: Uint8Array, extension: string) => string): E;

  // Imports value as exported by `export` back into read value. If not provided, JSON.parse will be used.
  public abstract import(value: E, importFile: (filename: string) => Uint8Array): T;
}