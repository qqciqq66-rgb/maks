import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'state.json');
    this.state = { botMarker: null };
    this.writeChain = Promise.resolve();
  }

  async load() {
    await mkdir(this.dataDir, { recursive: true });
    try {
      this.state = { botMarker: null, ...JSON.parse(await readFile(this.file, 'utf8')) };
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('[store] не удалось прочитать состояние:', err.message);
    }
  }

  persist() {
    const snapshot = JSON.stringify(this.state, null, 2);
    this.writeChain = this.writeChain
      .then(async () => {
        const tmp = `${this.file}.tmp`;
        await writeFile(tmp, snapshot, 'utf8');
        await rename(tmp, this.file);
      })
      .catch((err) => console.error('[store] ошибка записи:', err.message));
    return this.writeChain;
  }

  async setBotMarker(marker) {
    this.state.botMarker = marker;
    await this.persist();
  }
}
