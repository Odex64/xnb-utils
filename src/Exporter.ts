import * as fs from 'fs';
import * as path from 'path';
import XnbError from './XnbError.js';
import Log from './Log.js';
import { Reader, ReaderWithExports } from './Type.js';
import { getReader, Parsed } from './Worker.js';
import { containsKey, isObject } from './Utils.js'

/**
 * Checks if our reader can export/import data.
 * @param reader The reader to check.
 * @returns Returns ReaderWithExports if the reader can export/import, otherwise undefined.
 */
function hasExports<T, E>(reader: Reader<T>): reader is ReaderWithExports<T, E> {
  return typeof (reader as ReaderWithExports<T, E>).export !== 'undefined';
}

// Saves a parsed XNB file and its exports. 
export async function saveXnb(filename: string, xnb: Parsed<unknown>): Promise<boolean> {
  // Get the directory name for the file.
  const dirname = path.dirname(filename);

  // Get the name for the file.
  const basename = path.basename(filename, '.json');

  // Create folder if directory doesn't exist.
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  // Get current reader and check if it can export files.
  const reader = getReader(xnb.readers[0].type);
  if (hasExports(reader)) {
    xnb.content = reader.export(xnb.content, (data, extname) => {
      const filename = `${basename}${extname}`;

      // Export file.
      Log.info(`Exporting ${filename}...`);
      fs.writeFileSync(path.resolve(dirname, filename), data);

      return filename;
    });
  }

  // Save the XNB object as JSON.
  fs.writeFileSync(filename, JSON.stringify(xnb, null, 2));

  // File successfully exported.
  return true;
}

// Reads an unpacked XNB file and its exports into parsed XNB. 
export async function readXnb(filename: string): Promise<Parsed<unknown> | undefined> {
  // Get the directory name.
  const dirname = path.dirname(filename);

  // Get file extension.
  let json: Parsed<unknown>;
  const extension = path.extname(filename).toLocaleLowerCase();

  // Get the JSON and the contents.
  if (extension !== '.json') {
    json = {
      header: {
        target: 'w',
        formatVersion: 5,
        hidef: false,
        compressed: false
      },
      readers: [
        {
          type: 'BLANK',
          version: 0
        }
      ],
      content: {
        filename: path.basename(filename)
      }
    }
    switch (extension) {
      case '.wav':
        json.readers[0].type = 'Microsoft.Xna.Framework.Content.SoundEffectReader';
        break;

      case '.png':
        json.readers[0].type = 'Microsoft.Xna.Framework.Content.Texture2DReader';
        break;

      default:
        Log.error(`Couldn't recognize the given file.`);
        return undefined;
    }
  } else {
    json = JSON.parse(fs.readFileSync(filename, 'utf8'));
  }

  if (!checkParsed(json)) {
    throw new XnbError(`Invalid XNB json ${filename}`);
  }

  // Get current reader and check if it can import files.
  const reader = getReader(json.readers[0].type);
  if (hasExports(reader)) {
    json.content = reader.import(
      json.content,
      (filename) => fs.readFileSync(path.resolve(dirname, filename)),
    );
  }

  return json;
}

/**
 * Check if object has all the required fields before packing.
 */
function checkParsed(xnb: unknown): boolean {
  return isObject(xnb) &&
    containsKey(xnb, 'header') &&
    isObject(xnb.header) &&
    containsKey(xnb.header, 'target') &&
    typeof xnb.header.target === 'string' &&
    containsKey(xnb.header, 'formatVersion') &&
    typeof xnb.header.formatVersion === 'number' &&
    containsKey(xnb.header, 'hidef') &&
    typeof xnb.header.hidef === 'boolean' &&
    containsKey(xnb.header, 'compressed') &&
    typeof xnb.header.compressed === 'boolean' &&
    containsKey(xnb, 'readers') &&
    xnb.readers instanceof Array &&
    xnb.readers.every((reader) =>
      isObject(reader) &&
      containsKey(reader, 'type') &&
      typeof reader.type === 'string' &&
      containsKey(reader, 'version') &&
      typeof reader.version === 'number'
    ) && 'content' in xnb;
}
