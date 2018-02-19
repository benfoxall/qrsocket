console.log("hello worker")

importScripts('modules/zxing.js')

console.log("hello zxing")

self.addEventListener('message', e => {
  const data = e.data;
  if(data.type == 'process') {
    console.log("TODO: worker process", data)
  } else {
    console.log("IN WORKER", e.data)
  }
})
