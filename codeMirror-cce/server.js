const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const { Server } = require('socket.io')
const PORT = 8080
const fs = require("fs");
const https = require("https");
const MongoClient = require("mongodb").MongoClient;

const key = fs.readFileSync("localhost-key.pem", "utf-8");
const cert = fs.readFileSync("localhost.pem", "utf-8");
const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

app = express()
var server = https.createServer({ key, cert }, app).listen(PORT, function(){
  console.log("Express server listening at https://localhost:" + PORT);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function convertToCRDTData(text) {
  crdtData = []
  let textLines = text.split(/\n/)
  for (let line in textLines) {
    var lineData = []
    for (var i = 0; i < textLines[line].length; ++i) lineData.push([textLines[line][i], [i]])
    crdtData.push(lineData)
  }
  console.log(crdtData)
  return crdtData;
}


function getNormalData(crdtData){
  var text = "";
  for (var lineID = 0; lineID < crdtData.length; ++lineID) {
      for (let i in crdtData[lineID]) text += crdtData[lineID][i][0]
      if (lineID !== (crdtData.length - 1)) text += '\n'
  }
  return text;
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
    if (changes['line'] === this.cache[roomID]['crdtData'].length) { this.cache[roomID]['crdtData'].push(newLine); return}
    for (var i = 0; i < changes['char']; ++i) newLine.push(crdtData[changes['line']][i])
    for (var i = 0; i < changes['update'].length; ++i) newLine.push(changes['update'][i])
    for (var i = changes['char']; i < crdtData[changes['line']].length; ++i) newLine.push(crdtData[changes['line']][i])
    this.cache[roomID]['crdtData'][changes['line']] = newLine
  }

  deleteFromCRDT(roomID, changes) {
    if (changes['update'].length === 1) this.cache[roomID]['crdtData'].splice(changes['line'] + 1, 1)
    else this.cache[roomID]['crdtData'][changes['line']].splice(changes['char'], 1);
  }
}

class MongoDB {
  async documentExist(roomID) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true }).catch(err => { console.log(err) })
    let res = null
    if (!client) return false
    try {
        const db = client.db("cce");
        let collection = db.collection('docs')
        let query = {roomID : roomID}
        res = await collection.findOne(query);
    } catch (err) {
        return false
    } finally {
      client.close();
      return res !== null;
    }
  }

  async addDocumentToDB(roomID, data) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true }).catch(err => { console.log(err) })
    if (!client) return
    try {
        const db = client.db("cce")
        let collection = db.collection('docs')
        var query = { roomID: roomID, data: data}
        await collection.insertOne(query)
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
  }

  async getDocumentFromDB(roomID){
    const client = await MongoClient.connect(uri, { useNewUrlParser: true }).catch(err => { console.log(err); });
    if (!client) {return;}
    var data = "";
    try {
        const db = client.db("cce");
        let collection = db.collection('docs')
        let res = await collection.findOne({roomID : roomID});
        data = res.data
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
        return data;
    }
  }

  async updateDocumentInDB(roomID, data) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true }).catch(err => { console.log(err); });
    if (!client) {return;}
    try {
        const db = client.db("cce");
        let collection = db.collection('docs')
        var query = { roomID: roomID};
        var newValues = { $set: { roomID: roomID, data: data}};
        await collection.updateOne(query, newValues)
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
  }
}


roomMap = {}
var userMap = {} // socketID to userName Mapping
var activeUsers = {} // Map document ID to list of active users
DCInstance = new DocumentCache();
MongoDBInstance = new MongoDB();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/favicon.ico', express.static('images/favicon.ico'));

app.use(express.static(__dirname + '/'));
app.get('/favicon.ico', (req, res) => res.status(204));

app.get('/', (request, response) => response.send('Code collaborative editor!'));

app.get('/:roomID', async function(request, response) {
  console.time('timing')
  let roomID = request.params.roomID
  let documentData = "// New document - " + roomID
  if (!DCInstance.documentExist(roomID)) {
    let documentExist = await MongoDBInstance.documentExist(roomID)
    if (!documentExist) MongoDBInstance.addDocumentToDB(roomID, documentData)
    else documentData = await MongoDBInstance.getDocumentFromDB(roomID)
    DCInstance.addDocumentToCache(roomID, documentData)
  }
  console.timeEnd('timing')
  response.render(path.join(__dirname, '/views/codeEditor.ejs'), {roomId: roomID});
})


const io = new Server(server)
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected from: ' + roomMap[socket.id]);
    // delete the user from the list of active users
    roomID = roomMap[socket.id]
    userName = userMap[socket.id]
    activeUsers[roomID].delete(userName)
    console.log("Active users:", activeUsers[roomID])
    console.log("number of active users:", activeUsers[roomID].size)
    if (activeUsers[roomID].size == 0){
      console.log("All users disconnected");
      let normalText = getNormalData(DCInstance.getCRDTData(roomID))
      console.log(normalText);
      MongoDBInstance.updateDocumentInDB(roomID, normalText)
      console.log("Updated in the DB");
    }
  })

  socket.on('CONNECTED_TO_ROOM', async (data) => {
    socket.join(data.roomID)
    roomMap[socket.id] = data.roomID
    userMap[socket.id] = data.userName

    if (data.roomID in activeUsers){
      activeUsers[data.roomID].add(data.userName)
    }
    else{
      activeUsers[data.roomID] = new Set()
      activeUsers[data.roomID].add(data.userName)
    }
    io.in(data.roomID).emit('ROOM:CONNECTION', Array.from(activeUsers[data.roomID]))
    let crdtData = DCInstance.getCRDTData(data.roomID)
    socket.emit('INITIAL_DOCUMENT', { crdtData })
  })

  socket.on('CODE_CHANGED', async (changes) => {
    console.time('changesSync')
    const roomID = roomMap[socket.id]
    console.log("changes: ", changes)
    if (changes['origin'] === 'insert') DCInstance.insertToCRDT(roomID, changes)
    else DCInstance.deleteFromCRDT(roomID, changes)
    //let normalText = getNormalData(DCInstance.getCRDTData(roomID))
    //MongoDBInstance.updateDocumentInDB(roomID, normalText)
    socket.to(roomID).emit('CODE_CHANGED', changes)
    console.timeEnd('changesSync')
  })
})