# qrsocket
Transferring stuff over QR Codes


```js
const socket = new QRSocket()

socket.addEventListener('message', event => {
  console.log(event.data)
})

socket.send("Hello world")
```
