import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function readZip(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Файл не похож на xlsx (zip)');

  const count = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16);
  const files = new Map();

  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) throw new Error('Повреждён каталог zip');
    const method = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buffer.subarray(start, start + compressedSize);
    files.set(name, () => (method === 0 ? raw : inflateRawSync(raw)).toString('utf8'));

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decodeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&amp;/g, '&');

const textOf = (xml) => decodeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));

function columnIndex(ref) {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function readXlsx(path) {
  const zip = readZip(readFileSync(path));
  const get = (name) => zip.get(name)?.() ?? '';

  const shared = [...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  const rels = new Map(
    [...get('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [
      m[1],
      m[2].replace(/^\/?(xl\/)?/, 'xl/')
    ])
  );
  const sheets = {};
  for (const m of get('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const xml = get(rels.get(m[2]));
    const rows = [];
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const [, col, attrs, inner = ''] = c;
        const type = (attrs.match(/\st="(\w+)"/) || [])[1];
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let value = null;
        if (type === 's') value = shared[Number(v)] ?? null;
        else if (type === 'inlineStr') value = textOf(inner);
        else if (type === 'str') value = v === undefined ? null : decodeXml(v);
        else if (type === 'b') value = v === '1';
        else if (v !== undefined) value = Number(v);
        row[columnIndex(col)] = value;
      }
      rows.push(row);
    }
    sheets[decodeXml(m[1])] = rows;
  }
  return sheets;
}
