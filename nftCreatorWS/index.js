require('dotenv').config()
const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require("path");
const app = new express();
const {create} = require('./create')
const queue = require('express-queue');
const queueMw = queue({ activeLimit: 1, queuedLimit: -1 });

process.title = "nftCreatorWS";

app.use(cors())
app.use(queueMw)
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

// parse application/json
app.use(bodyParser.json({limit: '50mb', extended: true}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'docs')));

app.post('/create', (req, res) => {
  console.log(`Queue info: ${queueMw.queue.getLength()}`)
  createNFT(req.body.globalObj)
  return res.send('Received a POST HTTP method');
});

app.get('/info', (req, res) => {
  return res.send(`Queue info: ${queueMw.queue.getLength()}`)
})

const PORT = process.env.PORT || 3000
app.listen(PORT)

console.log(`Demo running at http://localhost:${PORT}/`);

async function createNFT(globalObj) {
  create(globalObj)
}