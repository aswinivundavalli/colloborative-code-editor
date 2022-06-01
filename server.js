const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const port = 8080

docs = {};

app.get('/', (request, response) => response.send('Hello World!'));

app.get('/favicon.ico', (request, response) => response.status(204));

app.get('/:roomID', (request, response) => {
    //response.send({code:"console.log('Hello')"});
    //return;
    if (request.params.roomID in docs) { response.send({code:docs[request.params.roomID]}); return; }
    MongoClient.connect(uri, function(err, db) {
        var dbo = db.db("cce");
        dbo.collection("docs").find({roomID : request.params.roomID}).toArray(function(err, result) {
            if (result.length == 0) {
                docs[request.params.roomID] = "NEW DOCUMENT " + request.params.roomID;
                var object = { roomID: request.params.roomID, data: docs[request.params.roomID]};
                dbo.collection("docs").insertOne(object, function(err, res) {db.close()})
                response.send({code:docs[request.params.roomID]});
                //response.render('codeEditor.ejs', {message: docs[request.params.roomID], roomId: docs[request.params.roomID]});
            } else {
                db.close();
                docs[request.params.roomID] = result[0].data;
                response.send({code:docs[request.params.roomID]});
                //response.render('codeEditor.ejs', {message: JSON.stringify(docs[request.params.roomID]), roomId: request.params.roomID});
            }
        })
    })
})

app.get('/document/::roomID', (req, res) => {
    response.send(docs[req.params.roomID]);
})

app.post('/:roomID', (request, response) => {
    MongoClient.connect(uri, function(err, db) {
        var dbo = db.db("cce");
        var query = { roomID: request.params.roomID };
        var newValue = { $set: { roomID: request.params.roomID, data: request.body['newData'] } };
        dbo.collection("docs").updateOne(query, newValue, function(err, result) {
            db.close();
            docs[request.params.roomID] = request.body['newData'];
            response.send({code:request.body['newData']});
        })
    })
})

app.listen(port, () => {
  console.log(`http://localhost:${port}/`)
})