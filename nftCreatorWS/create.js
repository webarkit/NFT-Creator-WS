const path = require("path");
const fs = require('fs');
const glob = require('glob');
const readlineSync = require('readline-sync');
const inkjet = require('inkjet');
const PNG = require('pngjs').PNG;
var artoolkit_wasm_url = './libs/NftMarkerCreator_wasm.wasm';
var Module = {};
require('dotenv').config()
const Client = require('ftp');
const uuidv4 = require('uuid/v4');
const { parentPort, workerData } = require("worker_threads");

let ftpReady = false

const client = new Client();
client.on('ready', () => {
  console.log('ftp ready')
  ftpReady = true
})

client.on('error', (err) => {
  console.error(err)
})
client.connect({
  host: process.env.FTP_SERVER,
  user: process.env.FTP_USER,
  password: process.env.FTP_PW
})

//Setup emailing
const nodemailer = require('nodemailer');
console.warn(process.env.EMAIL)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PW
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
},
});

transporter.verify().then(() => {
  console.log("Email success")
}).catch(err => {
  console.error("Email err:" + err)
})

var imageData = {
    sizeX: 0,
    sizeY: 0,
    nc: 0,
    dpi: 0,
    array: [],
    email: process.env.DEFAULT_EMAIL
}

function runtime() {
  let fileName = imageData.fileName || 'nft-' + uuidv4()
    let heapSpace = Module._malloc(imageData.array.length * imageData.array.BYTES_PER_ELEMENT);
    Module.HEAPU8.set(imageData.array, heapSpace);
    Module._createImageSet(heapSpace, imageData.dpi, imageData.sizeX, imageData.sizeY, imageData.nc)
    Module._free(heapSpace);

    let filenameIset = "asa.iset";
    let filenameFset = "asa.fset";
    let filenameFset3 = "asa.fset3";

    let ext = ".iset";
    let ext2 = ".fset";
    let ext3 = ".fset3";

    let content = Module.FS.readFile(filenameIset);
    let contentFset = Module.FS.readFile(filenameFset);
    let contentFset3 = Module.FS.readFile(filenameFset3);
    const nftPath = `/nft/${imageData.email}`
    const dir = path.join(__dirname, '/output/')
    const filePath = dir + fileName
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(filePath + ext, content);
    fs.writeFileSync(filePath + ext2, contentFset);
    fs.writeFileSync(filePath + ext3, contentFset3);

    if(ftpReady) {
      console.log('start upload')
      client.mkdir(nftPath, true, (err) => {
        client.put(filePath + ext,`${nftPath}/${fileName}${ext}`,(err) => {
          if (err) {
            console.log(err)
            return
          }
          else {
            client.put(filePath + ext2,`${nftPath}/${fileName}${ext2}`,(err) => {
              if (err) {
                console.log(err)
                return
              }
              else {
                client.put(filePath + ext3,`${nftPath}/${fileName}${ext3}`,(err) => {
                  if (err) {
                    console.log(err)
                    return
                  }
                  else {
                    //Write the jpg
                    client.put(imageData.filePath,`${nftPath}/${imageData.fileNameExt}`,(err) => {
                      console.log('Success: Uploaded 3 files')
                      sendEmail(nftPath+'/'+fileName).then(() => {
                        console.log('Mail sent')
                        //TODO cleanup temp files

                      }).catch(err => {
                        console.error(err)
                      })
                    })
                  }
                });
              }
            });
          }
        });
      })

    }
}

function sendEmail(nftPath) {
    // include nodemailer
    const toMail = imageData.email
    const fromMail = 'nft@tripod-digital.co.nz';
    const subject = 'Link to your NFT marker';
    const nftLink = `https://nft.tripod-digital.co.nz${nftPath}`
    const text = `Use this link ${nftLink} inside webARStudio https://webarstudio.tripod-digital.co.nz for your NFT markers or download the markers for usage with jsartoolkit` 
  
      // email options
    const mailOptions = {
      from: fromMail,
      to: toMail,
      subject: subject,
      text: text
    };
  
    // send email
    return transporter.sendMail(mailOptions)
}

function create(globalData) {
  imageData = globalData;
  imageData.sizeX = globalData.sizeX;
  imageData.sizeY = globalData.sizeY;
  imageData.array = Uint8Array.from(globalData.array);
  imageData.email = imageData.email || process.env.DEFAULT_EMAIL
  if (!Module.onRuntimeInitialized) {
    Module = require('./libs/NftMarkerCreator_wasm.js');
    Module.onRuntimeInitialized = runtime
  } else {
    // drop the module
    Module = undefined
    delete require.cache[require.resolve('./libs/NftMarkerCreator_wasm.js')]
    Module = require('./libs/NftMarkerCreator_wasm.js');
    Module.onRuntimeInitialized = runtime
  }
}

parentPort.on("message", (param) => { 
  create(param)
  parentPort.postMessage("done");
})

exports.create = create;