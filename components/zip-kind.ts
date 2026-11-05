// Which registry kind a .zip is, from the names in its central directory (read from the end of the file, so a big
// pack isn't read whole): a shaders/ folder at the root is a shader pack, pack.mcmeta with data/ a data pack, with
// assets/ a resource pack. null when it can't tell (both data/ and assets/, a zip64 file, not a zip): the submitter picks.
export type ZipKind = "resourcepack" | "datapack" | "shaderpack";

const EOCD = 0x06054b50;
const ENTRY = 0x02014b50;
const MAX_DIRECTORY = 8 << 20;

export async function zipKind(file: Blob): Promise<ZipKind | null> {
  try {
    const tailStart = Math.max(0, file.size - (0xffff + 22));
    const tail = new DataView(await file.slice(tailStart).arrayBuffer());
    let end = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) {
      if (tail.getUint32(i, true) === EOCD) {
        end = i;
        break;
      }
    }
    if (end < 0) return null;
    const size = tail.getUint32(end + 12, true);
    const offset = tail.getUint32(end + 16, true);
    if (size > MAX_DIRECTORY || offset + size > file.size) return null;
    const dir = new DataView(await file.slice(offset, offset + size).arrayBuffer());
    const utf8 = new TextDecoder();
    const names: string[] = [];
    for (let at = 0; at + 46 <= dir.byteLength && dir.getUint32(at, true) === ENTRY; ) {
      const nameLength = dir.getUint16(at + 28, true);
      const rest = nameLength + dir.getUint16(at + 30, true) + dir.getUint16(at + 32, true);
      names.push(utf8.decode(new Uint8Array(dir.buffer, dir.byteOffset + at + 46, Math.min(nameLength, dir.byteLength - at - 46))));
      at += 46 + rest;
    }
    const has = (prefix: string) => names.some((n) => n.replace(/\\/g, "/").startsWith(prefix));
    if (has("shaders/")) return "shaderpack";
    if (!names.includes("pack.mcmeta")) return null;
    const data = has("data/");
    const assets = has("assets/");
    if (data && !assets) return "datapack";
    if (assets && !data) return "resourcepack";
    return null;
  } catch {
    return null;
  }
}
