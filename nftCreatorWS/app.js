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
const transporter = nodemailer.createTransport({
  pool: true,
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PW
  }
});

transporter.verify().then(() => {
  console.log("Email success")
}).catch(err => {
  console.error("Email err:" + err)
})

// GLOBAL VARs
var params = [
    0,
    0
];

var validImageExt = [".jpg",".jpeg",".png"];

var srcImage;

var buffer;

var foundInputPath = {
    b: false,
    i: -1
}

var noConf = false;
var noDemo = false;

var imageData = {
    sizeX: 0,
    sizeY: 0,
    nc: 0,
    dpi: 0,
    array: [],
    ext: '',
    email: process.env.DEFAULT_EMAIL
}

let local = true;

function runtime() {
  let fileName = imageData.fileName || 'nft-' + uuidv4()
  console.log('calculateQuality')
    let confidence = calculateQuality();

    let txt = " - - - - - ";
    if(confidence.l != 0){
        let str = txt.split(" ");
        str.pop();
        str.shift();
        for(let i = 0; i < parseInt(confidence.l); i++){
            str[i] = " *";
        }
        str.push(" ");
        txt = str.join("");
    }

    console.log("\nConfidence level: [" + txt + "] %f/5 || Entropy: %f || Current max: 5.17 min: 4.6", confidence.l, confidence.e)

    if(local && !noConf){
        const answer = readlineSync.question(`\nDo you want to continue? (Y/N)\n`);

        if( answer == "n"){
            console.log("\nProcess finished by the user! \n");
            process.exit(1);
        }
    }
    
    let heapSpace = Module._malloc(imageData.array.length * imageData.array.BYTES_PER_ELEMENT);
    Module.HEAPU8.set(imageData.array, heapSpace);
    Module._createImageSet(heapSpace, imageData.dpi, imageData.sizeX, imageData.sizeY, imageData.nc, fileName, params.length, params)
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
                    console.log('Success: Uploaded 3 files')
                    sendEmail(nftPath+'/'+fileName)
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
    const fromMail = 'nft@webarstudio.tripod-digital.co.nz';
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
  local = false
  imageData = globalData;
  imageData.sizeX = globalData.w;
  imageData.sizeY = globalData.h;
  imageData.array = globalData.arr;
  imageData.ext = globalData.ext;
  imageData.email = imageData.email || process.env.DEFAULT_EMAIL
  noDemo = true
  Module = require('./libs/NftMarkerCreator_wasm.js');
  Module.onRuntimeInitialized = runtime
}

Module.onRuntimeInitialized = runtime

function useJPG(buf) {
    inkjet.decode(buf, function (err, decoded) {
        if (err) {
            console.log("\n" + err + "\n");
            process.exit(1);
        } else {
            let newArr = [];

            let verifyColorSpace = detectColorSpace(decoded.data);

            if (verifyColorSpace == 1) {
                for (let j = 0; j < decoded.data.length; j += 4) {
                    newArr.push(decoded.data[j]);
                }
            } else if (verifyColorSpace == 3) {
                for (let j = 0; j < decoded.data.length; j += 4) {
                    newArr.push(decoded.data[j]);
                    newArr.push(decoded.data[j + 1]);
                    newArr.push(decoded.data[j + 2]);
                }
            }

            let uint = new Uint8Array(newArr);
            imageData.nc = verifyColorSpace;
            imageData.array = uint;
        }
    });

    inkjet.exif(buf, function (err, metadata) {
        if (err) {
            console.log("\n" + err + "\n");
            process.exit(1);
        } else {
            if (metadata == null || metadata == undefined || metadata.length == undefined) {
                var answer = readlineSync.question('The EXIF info of this image is empty or it does not exist. Do you want to inform its properties manually?[y/n]\n');

                if (answer == "y") {
                    var answerWH = readlineSync.question('Inform the width and height: e.g W=200 H=400\n');

                    let valWH = getValues(answerWH, "wh");
                    imageData.sizeX = valWH.w;
                    imageData.sizeY = valWH.h;

                    // var answerNC = readlineSync.question('Inform the number of channels(nc):(black and white images have NC=1, colored images have NC=3) e.g NC=3 \n');

                    // let valNC = getValues(answerNC, "nc");
                    // imageData.nc = valNC;

                    var answerDPI = readlineSync.question('Inform the DPI: e.g DPI=220 [Default = 72](Press enter to use default)\n');

                    if (answerDPI == "") {
                        imageData.dpi = 72;
                    } else {
                        let val = getValues(answerDPI, "dpi");
                        imageData.dpi = val;
                    }
                } else {
                    console.log("Exiting process!")
                    process.exit(1);
                }
            } else {
                let dpi = Math.min(parseInt(metadata.XResolution.value), parseInt(metadata.YResolution.value));
                if (dpi == null || dpi == undefined || dpi == NaN) {
                    console.log("\nWARNING: No DPI value found! Using 72 as default value!\n")
                    dpi = 72;
                }

                if (metadata.ImageWidth == null || metadata.ImageWidth == undefined) {
                    if (metadata.PixelXDimension == null || metadata.PixelXDimension == undefined) {
                        var answer = readlineSync.question('The image does not contain any width or height info, do you want to inform them?[y/n]\n');
                        if (answer == "y") {
                            var answer2 = readlineSync.question('Inform the width and height: e.g W=200 H=400\n');

                            let vals = getValues(answer2, "wh");
                            imageData.sizeX = vals.w;
                            imageData.sizeY = vals.h;
                        } else {
                            console.log("It's not possible to proceed without width or height info!")
                            process.exit(1);
                        }
                    } else {
                        imageData.sizeX = metadata.PixelXDimension.value;
                        imageData.sizeY = metadata.PixelYDimension.value;
                    }
                } else {
                    imageData.sizeX = metadata.ImageWidth.value;
                    imageData.sizeY = metadata.ImageLength.value;
                }

                if (metadata.SamplesPerPixel == null || metadata.ImageWidth == undefined) {
                    // var answer = readlineSync.question('The image does not contain the number of channels(nc), do you want to inform it?[y/n]\n');

                    // if(answer == "y"){
                    //     var answer2 = readlineSync.question('Inform the number of channels(nc):(black and white images have NC=1, colored images have NC=3) e.g NC=3 \n');

                    //     let vals = getValues(answer2, "nc");
                    //     imageData.nc = vals;
                    // }else{
                    //     console.log("It's not possible to proceed without the number of channels!")
                    //     process.exit(1);
                    // }
                } else {
                    imageData.nc = metadata.SamplesPerPixel.value;
                }
                imageData.dpi = dpi;
            }
        }
    });
}

function usePNG(buf) {
    let data;
    var png = PNG.sync.read(buf);

    var arrByte = new Uint8Array(png.data);
    if (png.alpha) {
        data = rgbaToRgb(arrByte);
    } else {
        data = arrByte;
    }

    let newArr = [];

    let verifyColorSpace = detectColorSpace(data);

    if (verifyColorSpace == 1) {
        for (let j = 0; j < data.length; j += 4) {
            newArr.push(data[j]);
        }
    } else if (verifyColorSpace == 3) {
        for (let j = 0; j < data.length; j += 4) {
            newArr.push(data[j]);
            newArr.push(data[j + 1]);
            newArr.push(data[j + 2]);
        }
    }

    let uint = new Uint8Array(newArr);

    imageData.array = uint;
    imageData.nc = verifyColorSpace;
    imageData.sizeX = png.width;
    imageData.sizeY = png.height;
    imageData.dpi = 72;
}

function getValues(str, type) {
    let values;
    if (type == "wh") {
        let Wstr = "W=";
        let Hstr = "H=";
        var doesContainW = str.indexOf(Wstr);
        var doesContainH = str.indexOf(Hstr);

        let valW = parseInt(str.slice(doesContainW + 2, doesContainH));
        let valH = parseInt(str.slice(doesContainH + 2));

        values = {
            w: valW,
            h: valH
        }
    } else if (type == "nc") {
        let nc = "NC=";
        var doesContainNC = str.indexOf(nc);
        values = parseInt(str.slice(doesContainNC + 3));
    } else if (type == "dpi") {
        let dpi = "DPI=";
        var doesContainDPI = str.indexOf(dpi);
        values = parseInt(str.slice(doesContainDPI + 4));
    }

    return values;
}

function detectColorSpace(arr) {
    let target = parseInt(arr.length / 4);

    let counter = 0;

    for (let j = 0; j < arr.length; j += 4) {
        let r = arr[j];
        let g = arr[j + 1];
        let b = arr[j + 2];

        if (r == g && r == b) {
            counter++;
        }
    }

    if (target == counter) {
        return 1;
    } else {
        return 3;
    }
}

function rgbaToRgb(arr) {
    let newArr = [];
    let BGColor = {
        R: 255,
        G: 255,
        B: 255
    }

    for (let i = 0; i < arr.length; i += 4) {

        let r = parseInt(255 * (((1 - arr[i + 3]) * BGColor.R) + (arr[i + 3] * arr[i])));
        let g = parseInt(255 * (((1 - arr[i + 3]) * BGColor.G) + (arr[i + 3] * arr[i + 1])));
        let b = parseInt(255 * (((1 - arr[i + 3]) * BGColor.B) + (arr[i + 3] * arr[i + 2])));

        newArr.push(r);
        newArr.push(g);
        newArr.push(b);
    }
    return newArr;
}

function calculateQuality(){
    let gray = toGrayscale(imageData.array);
    let hist = getHistogram(gray);
    let ent = 0;
    let totSize = imageData.sizeX * imageData.sizeY;
    for(let i = 0; i < 255; i++){
        if(hist[i] > 0){
            let temp = (hist[i]/totSize)*(Math.log(hist[i]/totSize));
            ent += temp;
        }
    }

    let entropy = (-1 * ent).toFixed(2);
    let oldRange = (5.17 - 4.6);
    let newRange = (5 - 0);
    let level = (((entropy - 4.6) * newRange) / oldRange);

    if(level > 5){
        level = 5;
    }else if(level < 0){
        level = 0;
    }
    return {l:level.toFixed(2), e: entropy};
}

function toGrayscale(arr){
    let gray = [];
    for(let i = 0; i < arr.length; i+=3){
        let avg = (arr[i] + arr[i+1] + arr[i+2])/3;
        gray.push(parseInt(avg));
    }
    return gray;
}

function getHistogram(arr){
    let hist = [256];
    for(let i = 0; i < arr.length; i++){
        hist[i] = 0;
    }
    for(let i = 0; i < arr.length; i++){
        hist[arr[i]]++;
    }
    return hist;
}

function addNewMarker(text, name){
    for(let i = 0; i < text.length; i++){
        if(text[i].trim().includes("<script>MARKER_NAME =")){
            text[i] = "<script>MARKER_NAME = '" + name + "'</script>"
            break;
        }
    }
}

exports.create = create;