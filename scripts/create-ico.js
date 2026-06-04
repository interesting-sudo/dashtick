import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createIco() {
  const icoBuffer = await pngToIco([
    join(__dirname, '../src-tauri/icons/32x32.png'),
    join(__dirname, '../src-tauri/icons/128x128.png'),
    join(__dirname, '../src-tauri/icons/128x128@2x.png'),
  ]);

  writeFileSync(join(__dirname, '../src-tauri/icons/icon.ico'), icoBuffer);
  console.log('Created icon.ico');
}

createIco().catch(console.error);
