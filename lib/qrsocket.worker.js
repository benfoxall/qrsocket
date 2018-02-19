console.log("hello worker")

importScripts('modules/zxing.js')

const Reader = ZXing();

let isSetup, imageWritePtr, decodePtr, resultString;

const setup = imageData => {
  isSetup = true;

  const decodeCallback = (ptr, len) => {
    const result = new Uint8Array(Reader.HEAPU8.buffer, ptr, len)
    resultString = String.fromCharCode.apply(null, result)
  };

  decodePtr = Reader.Runtime.addFunction(decodeCallback)

  imageWritePtr = Reader._resize(imageData.width, imageData.height)
}

self.addEventListener('message', e => {
  const data = e.data;
  if(data.type == 'process') {

    if(!isSetup) setup(data.imageData)

    for (var i=0; i < data.imageData.data.length/4; i++) {
      Reader.HEAPU8[imageWritePtr + i] = data.imageData.data[i * 4]
    }

    resultString = null

    var err = Reader._decode_qr(decodePtr)

    postMessage({
      type: 'processed',
      value: resultString,
      error: err
    })
  } else {
    console.log("UNHANDLED WORKER MESSAGE", e.data)
  }
})

postMessage({type: 'ready'})
