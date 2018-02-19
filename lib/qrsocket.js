

const workerSrc = document.currentScript.src.replace(
  /\.js$/, '.worker.js'
)

const worker = new Worker(workerSrc)

const loaded = new Promise(resolve => {
  worker.addEventListener('message', handle)
  function handle() {
    worker.removeEventListener('message', handle)
    resolve()
  }
})


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

    QRStream(qr => {
      console.log("got QR", qr)
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




// TODO cleanup
const QRStream = (() => {
  const listeners = new Set
  let stream

  return callback => {
    listeners.add(callback)

    if(!stream) {
      stream = navigator.mediaDevices
        .getUserMedia({
          video: {facingMode: 'user'}, audio: false
        })
        .then(stream => {
          console.log("got stream", stream)

          const video = document.createElement('video')
          video.srcObject = stream
          // video.style.width = '256px'
          // video.style.marginTop = '16px'
          video.style.transform = 'scaleX(-1)'

          return new Promise(r =>
            video.onloadedmetadata = r.bind(this, video)
          )
        })
        .then(video => {
          document.body.appendChild(video)
          video.play()
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')

          const post = () => {
            ctx.drawImage(video, 0, 0)
            const id = ctx.getImageData(
              0,0, canvas.width, canvas.height
            )

            worker.postMessage({
              type: 'process',
              imageData: id
            }, [id.data.buffer])
          }

          worker.addEventListener('message',
            ({data}) => {
            if(data.type == 'processed') {
              if(data.value) {
                listeners.forEach(l => l(data.value))
              }
              requestAnimationFrame(post)
            }
          })

          loaded.then(post)

        })
        .catch(err => console.error(err));
    }
  }
})()
