require('dotenv').config()
const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require("path");
const app = new express();
const {create} = require('./create')

process.title = "nftCreatorWS";

app.use(cors())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

// parse application/json
app.use(bodyParser.json({limit: '50mb', extended: true}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'docs')));

app.post('/create', (req, res) => {
  createNFT(req.body.globalObj)
  return res.send('Received a POST HTTP method');
});

const PORT = process.env.PORT || 3000
app.listen(PORT)

console.log(`Demo running at http://localhost:${PORT}/`);

function createNFT(globalObj) {
  create(globalObj)
}