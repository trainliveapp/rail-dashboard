import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const logo = await readFile(new URL('../public/StationLive_HandBuilt_Master.svg', import.meta.url), 'utf8')
const favicon = logo.replace('<g fill="#fff">', '<rect width="1536" height="768" fill="#1d4ed8"/><g fill="#fff">')
await writeFile(new URL('../public/favicon.svg', import.meta.url), favicon)
for (const [size, name] of [[96, 'favicon.png'], [48, 'favicon-48.png'], [180, 'apple-touch-icon.png']]) {
  await sharp(Buffer.from(favicon))
    .resize(size, size, { fit: 'contain', background: '#1d4ed8' })
    .png()
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
}
