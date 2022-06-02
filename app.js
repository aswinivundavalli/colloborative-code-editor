const express = require('express')
var bodyParser = require('body-parser')
const { MongoClient } = require('mongodb');
const path = require('path');

// Initialise express app
const app = express()
const PORT = 8080

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/favicon.ico', express.static('images/favicon.ico'));

docs = {};

app.get('/', (request, response) => response.send('Code collaborative editor!'));

app.get('/:roomID', (request, response) => {
    if (request.params.roomID in docs) { response.render('pages/codeEditor', {message: JSON.stringify(docs[request.params.roomID]), roomId: request.params.roomID}); return; }
    MongoClient.connect(uri, function(err, db) {
        var dbo = db.db("cce");
        dbo.collection("docs").find({roomID : request.params.roomID}).toArray(function(err, result) {
            if (result.length == 0) {
                docs[request.params.roomID] = "NEW DOCUMENT " + request.params.roomID;
                var object = { roomID: request.params.roomID, data: docs[request.params.roomID]};
                dbo.collection("docs").insertOne(object, function(err, res) {db.close()})
                response.render('pages/codeEditor', {message: JSON.stringify(docs[request.params.roomID]), roomId: request.params.roomID});
            } else {
                db.close();
                docs[request.params.roomID] = result[0].data;
                response.render('pages/codeEditor', {message: JSON.stringify(docs[request.params.roomID]), roomId: request.params.roomID});
            }
        })
    })
})

app.post('/:roomID', (request, response) => {
    MongoClient.connect(uri, function(err, db) {
        var dbo = db.db("cce");
        var query = { roomID: request.params.roomID };
        var newValue = { $set: { roomID: request.params.roomID, data: request.body['newData'] } };
        dbo.collection("docs").updateOne(query, newValue, function(err, result) {
            db.close();
            docs[request.params.roomID] = request.body['newData'];
            response.send(request.body['newData']);
        })
    })
})

app.listen(PORT, () => {console.log(`http://localhost:${PORT}/`)})