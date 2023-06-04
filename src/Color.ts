import BinaryReader from './Buffer/BinaryReader.js';

export default class Color {
  public red: number;
  public green: number;
  public blue: number;
  public alpha: number;
  public packedValue?: number;

  public constructor(red: number, green: number, blue: number, alpha: number = 255, packedValue?: number) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
  }

  public static fromBuffer(buffer: BinaryReader): Color {
    const red = buffer.readByte();
    const green = buffer.readByte();
    const blue = buffer.readByte();
    const alpha = buffer.readByte();

    return new Color(red, green, blue, alpha);
  }

  public static toArray(data: Color[]): Uint8Array {
    const values: number[] = [];
    let i = 0;
    for (const color of data) {
      values[i++] = color.red;
      values[i++] = color.green;
      values[i++] = color.blue;
      values[i++] = color.alpha;
    }

    return Uint8Array.from(values);
  }

  public static fromArray(data: Uint8Array): Color[] {
    let colors: Color[] = [];
    for (let i = 0; i < data.length; i += 4) {
      colors.push(new Color(data[i], data[i + 1], data[i + 2], data[i + 3]));
    }

    return colors;
  }
}