import assert from 'node:assert/strict'
import test from 'node:test'
import { loadImage } from '../src/lib/imageLoading.js'

test('image preloading shares requests and waits for decoding before switching', async () => {
  const original = globalThis.Image
  const requests = []
  let finishDecode
  globalThis.Image = class {
    constructor() { requests.push(this) }
    decode() { return new Promise((resolve) => { finishDecode = resolve }) }
  }
  try {
    const loaded = loadImage('/slideshow.webp')
    assert.equal(loadImage('/slideshow.webp'), loaded)
    assert.equal(requests.length, 1)
    let ready = false
    loaded.then(() => { ready = true })
    const loading = requests[0].onload()
    await Promise.resolve()
    assert.equal(ready, false)
    finishDecode()
    await loading
    assert.equal(await loaded, '/slideshow.webp')
    assert.equal(ready, true)
  } finally { globalThis.Image = original }
})

test('a failed image can be retried and responsive requests pass their sizes to the browser', async () => {
  const original = globalThis.Image
  const requests = []
  globalThis.Image = class {
    constructor() { requests.push(this) }
    set src(value) { this.request = { src: value, srcSet: this.srcset, sizes: this.sizes } }
    decode() { return Promise.reject(new Error('Decode is unsupported')) }
  }
  try {
    const responsive = { srcSet: '/small.webp 480w, /large.webp 960w', sizes: '50vw' }
    const failed = loadImage('/retry.webp', responsive)
    requests[0].onerror()
    await assert.rejects(failed, /could not be loaded/)
    const retried = loadImage('/retry.webp', responsive)
    assert.equal(requests.length, 2)
    assert.deepEqual(requests[1].request, { src: '/retry.webp', ...responsive })
    await requests[1].onload()
    assert.equal(await retried, '/retry.webp')
  } finally { globalThis.Image = original }
})
