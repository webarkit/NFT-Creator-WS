const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require("path");
const app = new express();

process.title = "nftCreatorLambda";

app.use(cors())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

// parse application/json
app.use(bodyParser.json({limit: '50mb', extended: true}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/create', (req, res) => {
  console.log(req.body.globalObj.dpi);
  createNFT(req.body.globalObj)
  return res.send('Received a POST HTTP method');
});

app.get('/', function(request, response){
    response.sendFile(path.join(__dirname + '/nft.html'));
});

app.listen(3000)

console.log("Demo running at http://localhost:3000/");

function createNFT(globalObj) {
  const {create} = require('./app')
  create(globalObj)
}