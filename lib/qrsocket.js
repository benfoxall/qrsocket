console.log("hello qrsocket")

const workerSrc = document.currentScript.src.replace(
  /\.js$/, '.worker.js'
)

const worker = new Worker(workerSrc)

const defaultMap = generator => {
  const map = new Map

  return key =>
    map.has(key) ?
      map.get(key) :
      map.set(key, generator()).get(key)
}


class QRSocket {
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

  send(data) {
    console.log(">>", data)
  }
}
