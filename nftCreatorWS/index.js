require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const app = new express()
const { create } = require('./create')
const queue = require('express-queue')
const queueMw = queue({ activeLimit: 1, queuedLimit: -1 })
const formidable = require('formidable')
const fs = require('fs')

process.title = 'nftCreatorWS'

app.use(cors())
app.use(queueMw)
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

// parse application/json
app.use(bodyParser.json({ limit: '50mb', extended: true }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'docs')))

// To be moved to other file
function detectColorSpace (arr) {
  let target = parseInt(arr.length / 4)

  let counter = 0

  for (let j = 0; j < arr.length; j += 4) {
    let r = arr[j]
    let g = arr[j + 1]
    let b = arr[j + 2]

    if (r == g && r == b) {
      counter++
    }
  }

  if (target == counter) {
    return 1
  } else {
    return 3
  }
}

function readImage (data) {
  // const imageFileBuffer = fs.readFileSync(path)
  // const ui8 = new Uint8Array(
  //   imageFileBuffer.buffer,
  //   imageFileBuffer.byteOffset,
  //   imageFileBuffer.byteLength / Uint8Array.BYTES_PER_ELEMENT
  // )
  const ui8 = data
  const verifyColorSpace = detectColorSpace(ui8)
  const dataObj = {}

  let newArr = []
  if (verifyColorSpace == 1) {
    for (let j = 0; j < ui8.length; j += 4) {
      newArr.push(ui8.data[j])
    }
  } else if (verifyColorSpace == 3) {
    for (let j = 0; j < ui8.length; j += 4) {
      newArr.push(ui8[j])
      newArr.push(ui8[j + 1])
      newArr.push(ui8[j + 2])
    }
  }

  dataObj.nc = verifyColorSpace

  let uint = new Uint8Array(newArr)
  dataObj.array = uint
  return dataObj

  // reader.onload = function (event) {

  //     var img = new Image();
  //     img.onload = function () {
  //         var canvasEl = document.querySelector('#imageCanvas');
  //         canvas.width = canvasEl.clientWidth;
  //         canvas.height = canvasEl.clientHeight;

  //         hideCanvas.width = img.width;
  //         hideCanvas.height = img.height;

  //         globalObj.w = img.width;
  //         globalObj.h = img.height;

  //         ctxHide.drawImage(img, 0, 0);

  //         ctx.drawImage(img, 0, 0, img.width, img.height,     // source rectangle
  //             0, 0, canvas.width, canvas.height); // destination rectangle

  //         //imageData.data : Uint8ClampedArray
  //         var imgData = ctxHide.getImageData(0, 0, hideCanvas.width, hideCanvas.height);

  //         let newArr = [];

  //         let verifyColorSpace = detectColorSpace(imgData.data);

  //         if (verifyColorSpace == 1) {
  //             for (let j = 0; j < imgData.data.length; j += 4) {
  //                 newArr.push(imgData.data[j]);
  //             }
  //         } else if (verifyColorSpace == 3) {
  //             for (let j = 0; j < imgData.data.length; j += 4) {
  //                 newArr.push(imgData.data[j]);
  //                 newArr.push(imgData.data[j + 1]);
  //                 newArr.push(imgData.data[j + 2]);
  //             }
  //         }

  //         globalObj.nc = verifyColorSpace;

  //         let uint = new Uint8Array(newArr);
  //         globalObj.arr = Array.from(uint);

  //         let confidence = calculateQuality();
  //         let confidenceEl = document.getElementById("confidenceLevel");
  //         let childEls = confidenceEl.getElementsByClassName("confidenceEl");
  //         for(let i = 0; i < parseInt(confidence.l); i++){
  //             childEls[i].src = "./icons/star.svg";
  //         }
  //         confidenceEl.scrollIntoView();
  //     }
  //     img.src = event.target.result;
  // }
  // reader.readAsDataURL(path);
}

function useJpeg (path) {
  return new Promise((resolve, reject) => {
    var ExifImage = require('exif').ExifImage
    var inkjet = require('inkjet');
    const imageFileBuffer = fs.readFileSync(path)

    inkjet.decode(imageFileBuffer, function(err, decoded) {
      if (err) {
        reject(err)
      }
      // TODO read width and height
      try {
        new ExifImage({ image: path }, (error, exifData) => {
          if (error) {
            console.error('Error: ' + error.message)
            resolve(readImage(decoded.data))
          } else {
            const nc1 = exifData.exif.ComponentsConfiguration
            const imageData = readImage(decoded.data)
            if (nc1)
              imageData.nc = nc1
            resolve(imageData)
          }
        })
      } catch (error) {
        console.error('Error: ' + error.message)
        reject(error.message)
      }
    })
  })
}

function handleImage (nameWithExt, type, path) {
  let name = nameWithExt.substr(0, nameWithExt.lastIndexOf('.'))
  let extJpg = type.substr(type.lastIndexOf('/') + 1)
  if (extJpg == 'jpeg') {
    return useJpeg(path)
  } else if (extJpg == 'png' || extJpg == '.PNG') {
    readImage(path)
  } else {
    return 'Invalid image format!'
  }
}
//

app.post('/create', (req, res) => {
  const form = formidable()
  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err)
      console.error(err)
      return
    }
    handleImage(files.upload.name, files.upload.type, files.upload.path).then(
      imageData => {
        imageData.email = fields.email
        imageData.fileName = fields.nftName || files.upload.name.substr(0, nameWithExt.lastIndexOf('.'))
        imageData.fileNameExt = files.upload.name
        imageData.dpi = 200
        const sizeOf = require('image-size');
        const dimensions = sizeOf(files.upload.path);
        imageData.sizeX = dimensions.width
        imageData.sizeY = dimensions.height
        imageData.filePath = files.upload.path
        createNFT(imageData)
        return res.send('Success, we will sent you an email with the link to your marker');
      }
    )
  })
})

app.get('/info', (req, res) => {
  return res.send(`Queue info: ${queueMw.queue.getLength()}`)
})

const PORT = process.env.PORT || 3000
app.listen(PORT)

console.log(`Demo running at http://localhost:${PORT}/`)

async function createNFT (globalObj) {
  create(globalObj)
}
