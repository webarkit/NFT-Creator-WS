// var imageLoader = document.getElementById('imageLoader');
// imageLoader.addEventListener('change', handleImage, false);
// var canvas = document.getElementById('imageCanvas');
// var hideCanvas = document.getElementById('hideCanvas');
// hideCanvas.style.display = "none";
// var ctx = canvas.getContext('2d');
// ctx.fillStyle = "#949494";
// ctx.fillRect(0, 0, canvas.width, canvas.height);
// var ctxHide = hideCanvas.getContext('2d');

var reader = new FileReader()

var name
var nameWithExt

var globalObj = {
  dpi: 0,
  nc: 0,
  w: 0,
  h: 0,
  arr: [],
  ext: '.jpg',
  fileName: ''
}

// function handleImage(e) {
//     nameWithExt = e.target.files[0].name;
//     console.log("Image uploaded: " + nameWithExt);
//     name = nameWithExt.substr(0, nameWithExt.lastIndexOf('.'));
//     document.getElementById('nftName').value = name;

//     let extJpg = nameWithExt.substr(nameWithExt.lastIndexOf('.'));

//     let confidenceEl = document.getElementById("confidenceLevel");
//     let childEls = confidenceEl.getElementsByClassName("confidenceEl");
//     for(let i = 0; i < childEls.length; i++){
//         childEls[i].src = "./icons/star2.svg";
//     }

//     if (extJpg == '.jpg' || extJpg == '.jpeg' || extJpg == '.JPG' || extJpg == '.JPEG') {
//         globalObj.ext = '.jpg'
//         useJpeg(e);
//     } else if (extJpg == '.png' || extJpg == '.PNG') {
//         globalObj.ext = '.png'
//         globalObj.dpi = 150;
//         readImage(e)
//     } else {
//         console.log("Invalid image format!");
//     }

//     document.getElementById("generateBt").disabled = false;
// }

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function generate () {
  globalObj.email = document.getElementById('email').value
  if (!validateEmail(globalObj.email)) {
    globalObj.email = undefined
  }
  if (!globalObj.email) {
    alert(
      'Please enter a valid email address. We use this address to send you a link to your NFTs once they have been created.'
    )
    return
  }
  if (!document.getElementById('uploadBt').files[0]) {
    alert('Please select an image to create a marker')
    return
  }
  globalObj.fileName = document.getElementById('nftName').value
  // var imageCanvas = document.querySelector('#imageCanvas');
  // imageCanvas.style.opacity = 0.25;
  var spinner = document.querySelector('.spinner-container')
  spinner.style.display = 'block'
  const url = window.location.href + 'create'
  // const url = 'http://nftcreator.tripod-digital.co.nz/create'
  // console.log(globalObj)
  var formData = new FormData()
  formData.append('upload', document.getElementById('uploadBt').files[0])
  formData.append('email', globalObj.email)
  formData.append('fileName', globalObj.fileName)
  axios
    .post(
      url,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
      // axios.post(url,
      // {
      //   globalObj: globalObj,
      // }
    )
    .then(function (response) {
      // imageCanvas.style.opacity = 1;
      // spinner.style.display = 'none'
      alert('Success, we will sent you an email with the link to your marker')
      window.location.href= window.location.href + 'test.html'
      console.log(response)
    })
    .catch(function (error) {
      spinner.style.display = 'none'
      alert('Sorry, something went wrong' + error.message)
      console.log(error)
    })
}

// function detectColorSpace(arr) {
//     let target = parseInt(arr.length / 4);

//     let counter = 0;

//     for (let j = 0; j < arr.length; j += 4) {
//         let r = arr[j];
//         let g = arr[j + 1];
//         let b = arr[j + 2];

//         if (r == g && r == b) {
//             counter++;
//         }
//     }

//     if (target == counter) {
//         return 1;
//     } else {
//         return 3;
//     }
// }

// function useJpeg(e) {
//   var parser = require('exif-parser').create(

//     EXIF.getData(e.target.files[0], function () {
//         var dpi1 = parseFloat(EXIF.getTag(this, "XResolution"));

//         if (isNaN(dpi1) || dpi1 == null) {
//             globalObj.dpi = 150
//         } else {
//             globalObj.dpi = dpi1;
//         }

//         var nc1 = EXIF.getTag(this, "ComponentsConfiguration")

//         if (isNaN(nc1) || nc1 == null) {
//             var nc2 = parseFloat(EXIF.getTag(this, "SamplesPerPixel"));
//             if (isNaN(nc2) || nc2 == null) {
//                 // openModal();
//             } else {
//                 globalObj.nc = nc2;
//             }
//         } else {
//             globalObj.nc = nc1;
//         }

//         readImage(e);
//     });

// }

// function readImage(e) {
//     reader.onload = function (event) {

//         var img = new Image();
//         img.onload = function () {
//             var canvasEl = document.querySelector('#imageCanvas');
//             canvas.width = canvasEl.clientWidth;
//             canvas.height = canvasEl.clientHeight;

//             hideCanvas.width = img.width;
//             hideCanvas.height = img.height;

//             globalObj.w = img.width;
//             globalObj.h = img.height;

//             ctxHide.drawImage(img, 0, 0);

//             ctx.drawImage(img, 0, 0, img.width, img.height,     // source rectangle
//                 0, 0, canvas.width, canvas.height); // destination rectangle

//             //imageData.data : Uint8ClampedArray
//             var imgData = ctxHide.getImageData(0, 0, hideCanvas.width, hideCanvas.height);

//             let newArr = [];

//             let verifyColorSpace = detectColorSpace(imgData.data);

//             if (verifyColorSpace == 1) {
//                 for (let j = 0; j < imgData.data.length; j += 4) {
//                     newArr.push(imgData.data[j]);
//                 }
//             } else if (verifyColorSpace == 3) {
//                 for (let j = 0; j < imgData.data.length; j += 4) {
//                     newArr.push(imgData.data[j]);
//                     newArr.push(imgData.data[j + 1]);
//                     newArr.push(imgData.data[j + 2]);
//                 }
//             }

//             globalObj.nc = verifyColorSpace;

//             let uint = new Uint8Array(newArr);
//             globalObj.arr = Array.from(uint);

//             let confidence = calculateQuality();
//             let confidenceEl = document.getElementById("confidenceLevel");
//             let childEls = confidenceEl.getElementsByClassName("confidenceEl");
//             for(let i = 0; i < parseInt(confidence.l); i++){
//                 childEls[i].src = "./icons/star.svg";
//             }
//             confidenceEl.scrollIntoView();
//         }
//         img.src = event.target.result;
//     }
//     reader.readAsDataURL(e.target.files[0]);
// }

// function calculateQuality(){
//     let gray = toGrayscale(globalObj.arr);
//     let hist = getHistogram(gray);
//     let ent = 0;
//     let totSize = globalObj.w * globalObj.h;
//     for(let i = 0; i < 255; i++){
//         if(hist[i] > 0){
//             let temp = (hist[i]/totSize)*(Math.log(hist[i]/totSize));
//             ent += temp;
//         }
//     }

//     let entropy = (-1 * ent).toFixed(2);
//     let oldRange = (5.17 - 4.6);
//     let newRange = (5 - 0);
//     let level = (((entropy - 4.6) * newRange) / oldRange);

//     if(level > 5){
//         level = 5;
//     }else if(level < 0){
//         level = 0;
//     }
//     return {l:level.toFixed(2), e: entropy};
// }

// function toGrayscale(arr){
//     let gray = [];
//     for(let i = 0; i < arr.length; i+=3){
//         let avg = (arr[i] + arr[i+1] + arr[i+2])/3;
//         gray.push(parseInt(avg));
//     }
//     return gray;
// }

// function getHistogram(arr){
//     let hist = [256];
//     for(let i = 0; i < arr.length; i++){
//         hist[i] = 0;
//     }
//     for(let i = 0; i < arr.length; i++){
//         hist[arr[i]]++;
//     }
//     return hist;
// }
