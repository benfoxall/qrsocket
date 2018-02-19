const defaultMap = generator => {
  const map = new Map

  return key =>
    map.has(key) ? map.get(key) :
    map.set(key, generator()).get(key)
}

const { href } = document.location

class QRSocket {
  constructor() {

    const root = document.createElement('div')
    document.body.appendChild(root)

    const output = new QRCode(root, href)
    this.display = message => output.makeCode(message)

    let i = 0

    const input = new QRStream()

    input.addEventListener('qr', qr => {
      console.log("got QR", qr)

      debug.innerText = `${qr} - ${i++}`

      window.navigator.vibrate(20)
    })

    this.listeners = defaultMap(() => new Set)
  }

  addEventListener(name, fn) {
    this.listeners(name).add(fn)
  }

  removeEventListener(name, fn) {
    this.listeners(name).delete(fn)
  }

  fire(name, data) {
    this.listeners(name).forEach(fn => fn(data))
  }

  send(data) {
    // TODO
    this.display(data)
  }
}

const workerSrc = document.currentScript.src.replace(
  /\.js$/, '.worker.js'
)


class QRStream {

  constructor() {
    this.listeners = defaultMap(() => new Set)

    this.send = this.send.bind(this)
    this.start()
  }

  async start() {
    await Promise.all([
      this.init_video(),
      this.init_worker()
    ])

    this.send()
  }


  async init_video () {
    const video = this.video = document.createElement('video')
    video.style.transform = 'scaleX(-1)'

    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user'}, audio: false
    })

    await new Promise(r => video.onloadedmetadata = r)

    document.body.appendChild(video)
    video.play()

    const canvas = this.canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    this.ctx = canvas.getContext('2d')


  }

  async init_worker () {
    this.worker = new Worker(workerSrc)

    await new Promise(resolve =>
      this.worker.addEventListener(
        'message', resolve, { once: true }
      )
    )

    this.worker.addEventListener('message', ({data}) => {
      if(data.type == 'processed') {
        if(data.value) this.fire('qr', data.value)
        requestAnimationFrame(this.send)
      }
    })
  }

  send() {
    this.ctx.drawImage(this.video, 0, 0)
    const imageData = this.ctx.getImageData(
      0,0, this.canvas.width, this.canvas.height
    )

    this.worker.postMessage({
      type: 'process',
      imageData
    }, [imageData.data.buffer])
  }


  addEventListener(name, fn) {
    this.listeners(name).add(fn)
  }

  removeEventListener(name, fn) {
    this.listeners(name).delete(fn)
  }

  fire(name, data) {
    this.listeners(name).forEach(fn => fn(data))
  }
}
