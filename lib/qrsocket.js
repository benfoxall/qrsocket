const { href } = document.location
const { src } = document.currentScript


const defaultMap = generator => {
  const map = new Map

  return key =>
    map.has(key) ? map.get(key) :
    map.set(key, generator()).get(key)
}

class Listenable {
  constructor() {
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
}


class QRSocket extends Listenable {
  constructor() {
    super()

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

  send(data) {
    // TODO
    this.display(data)
  }
}


class QRStream extends Listenable {

  constructor() {
    super()

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
    const video = document.createElement('video')
    video.style.transform = 'scaleX(-1)'

    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user'}, audio: false
    })

    await new Promise(r => video.onloadedmetadata = r)

    document.body.appendChild(video)
    video.play()

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    Object.assign(this, {video, canvas, ctx})
  }

  async init_worker () {
    const worker = new Worker(src.replace(
      /\.js$/, '.worker.js'
    ))

    await new Promise(resolve =>
      worker.addEventListener(
        'message', resolve, { once: true }
      )
    )

    worker.addEventListener('message', ({data}) => {
      if(data.type == 'processed') {
        if(data.value) this.fire('qr', data.value)
        requestAnimationFrame(this.send)
      }
    })

    Object.assign(this, {worker})
  }

  send() {
    const {ctx, canvas, worker, video} = this

    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(
      0,0, canvas.width, canvas.height
    )

    worker.postMessage({
      type: 'process',
      imageData
    }, [imageData.data.buffer])
  }

}
