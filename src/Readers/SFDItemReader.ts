import BinaryReader from '../Buffer/BinaryReader.js';
import BinaryWriter from '../Buffer/BinaryWriter.js';
import ReaderManager from '../TypeReader.js';
import Color from '../Color.js';
import { encode } from 'fast-png';
import { ReaderWithExports, Type } from '../Type.js';

interface ItemPart {
  textures: Texture[] | undefined[];
  type: number;
}

interface Texture {
  width: number;
  height: number;
  data: Uint8Array;
}

interface SFDItem {
  gameName: string;
  fileName: string;
  equipmentLayer: number;
  id: string;
  jacketUnderBelt: boolean;
  canEquip: boolean;
  canScript: boolean;
  colorPalette: string;
  parts: ItemPart[];
}

interface SFDItemExport {

}

export default class SFDItemReader extends ReaderWithExports<SFDItem, SFDItemExport> {
  public constructor() {
    super(new Type({ name: 'SFD.Content.ItemsContentTypeReader' }), true);
  }

  public override readFrom(buffer: BinaryReader, manager: ReaderManager): SFDItem {
    const fileName = buffer.readString();
    const gameName = buffer.readString();
    const equipmentLayer = buffer.readInt32();
    const id = buffer.readString();
    const jacketUnderBelt = buffer.readBoolean();
    const canEquip = buffer.readBoolean();
    const canScript = buffer.readBoolean();
    const colorPalette = buffer.readString();
    const width = buffer.readInt32();
    const height = buffer.readInt32();

    const colorsCount = buffer.readByte();
    const dynamicColorTable: Color[] = [];

    for (let i = 0; i < colorsCount; i++) {
      dynamicColorTable.push(Color.fromBuffer(buffer));
    }

    const outerLoop = buffer.readInt32();
    buffer.readChar();
    const parts: ItemPart[] = [];

    for (let i = 0; i < outerLoop; i++) {
      const type = buffer.readInt32();
      const innerLoop = buffer.readInt32();
      const size = width * height;
      const textures: Texture[] | undefined[] = [];

      for (let j = 0; j < innerLoop; j++) {
        if (buffer.readBoolean()) {
          const data: Color[] = [];
          let emptyImage = true;

          for (let k = 0; k < size; k++) {
            if (buffer.readBoolean()) {
              data[k] = new Color(0, 0, 0, 0);
            } else {
              data[k] = dynamicColorTable[buffer.readByte()];
              emptyImage = false;
            }
          }

          buffer.readChar();

          if (emptyImage) {
            textures[j] = undefined;
          } else {
            textures[j] = { data: Color.toArray(data), height, width }
          }
        } else {
          textures[j] = undefined;
        }
      }

      parts[i] = {
        textures,
        type
      }
    }

    return {
      canEquip,
      canScript,
      colorPalette,
      equipmentLayer,
      fileName,
      gameName,
      id,
      jacketUnderBelt,
      parts
    }
  }

  public override writeTo(buffer: BinaryWriter, content: SFDItem, manager: ReaderManager): void {
    throw new Error('Method not implemented.');
  }

  public override export(value: SFDItem, exportFile: (data: Uint8Array, extension: string) => string): SFDItemExport {
    let count = 0;
    for (const part of value.parts) {
      for (const texture of part.textures) {
        if (!texture) continue;

        const png = encode(texture);
        exportFile(png, `_${part.type}_${++count}.png`);
      }
    }

    return {}
  }

  public override import(value: SFDItemExport, importFile: (filename: string) => Uint8Array): SFDItem {
    throw new Error('Method not implemented.');
  }
}