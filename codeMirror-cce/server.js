const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const { Server } = require('socket.io')
const PORT = 8443
const fs = require("fs");
const https = require("https");

const key = fs.readFileSync("localhost-key.pem", "utf-8");
const cert = fs.readFileSync("localhost.pem", "utf-8");

app = express()
var server = https.createServer({ key, cert }, app).listen(PORT, function(){
  console.log("Express server listening at https://localhost:" + PORT);
});

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function convertToCRDTData(text) {
  messageData = []
  let textLines = text.split(/\n/)
  for (let line in textLines) {
    var lineData = []
    for (var i = 0; i < textLines[line].length; ++i) lineData.push([textLines[line][i], i])
    messageData.push(lineData)
  }
  console.log(messageData)
  return messageData;
}

class DocumentCache {
  constructor() { this.cache = {} }

  documentExist(roomID) { return (roomID in this.cache)}

  addDocumentToCache(roomID, data) {
    var object = {
      'text': data, 
      'crdtData': convertToCRDTData(data),
      'version': 0
    }
    this.cache[roomID] = object
  }

  getCRDTData(roomID) {
    if (this.documentExist(roomID)) return this.cache[roomID]['crdtData']
    return [];
  }

  insertToCRDT(roomID, changes) {
    let crdtData = this.cache[roomID]['crdtData']
    let newLine = []
    for (var i = 0; i < changes['char'] - 1; ++i) newLine.push(crdtData[changes['line']][i])
    for (var i = 0; i < changes['update'].length; ++i) newLine.push(changes['update'][i])
    for (var i = changes['char']; i < crdtData[changes['line']].length; ++i) newLine.push(crdtData[changes['line']][i])
    crdtData[changes['line']] = newLine
  }
}

roomMap = {}
DCInstance = new DocumentCache();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/favicon.ico', express.static('images/favicon.ico'));

app.use(express.static(__dirname + '/'));
app.get('/favicon.ico', (req, res) => res.status(204));

app.get('/', (request, response) => response.send('Code collaborative editor!'));

app.get('/:roomID', function(request, response) {
  let roomID = request.params.roomID
  console.log(roomID);
  if (!DCInstance.documentExist(roomID)) DCInstance.addDocumentToCache(roomID, "New Document - " + roomID);
  response.render(path.join(__dirname, '/views/codeEditor.ejs'), {roomId: roomID});
})

const io = new Server(server)
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected from: ' + roomMap[socket.id]);
  })

  socket.on('CONNECTED_TO_ROOM', async ({ roomID }) => {
    socket.join(roomID)
    roomMap[socket.id] = roomID
    io.in(roomID).emit('ROOM:CONNECTION')
    let crdtData = DCInstance.getCRDTData(roomID)
    socket.emit('INITIAL_DOCUMENT', { crdtData })
  })

  socket.on('CODE_CHANGED', async (changes) => {
    const roomID = roomMap[socket.id]
    console.log(changes)
    if (changes['origin'] === 'insert') DCInstance.insertToCRDT(roomID, changes)
    socket.to(roomID).emit('CODE_CHANGED', changes)
  })
})