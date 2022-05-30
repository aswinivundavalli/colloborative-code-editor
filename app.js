const express = require('express')
const app = express()
var bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const port = 8080

docs = {};

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/:roomID', (req, res) => {
    if (!(req.params.roomID in docs)) {
        res.send('New Room Created');
        docs[req.params.roomID] = "New Room: " + req.params.roomID;
    } else {
        res.send(docs[req.params.roomID]);
    }
})

app.post('/:roomID', (req, res) => {
    console.log(req.body);
    docs[req.params.roomID] = req.body['newData'];
    res.send(req.body['newData']);
})

app.listen(port, () => {
  console.log(`http://localhost:${port}/`)
})