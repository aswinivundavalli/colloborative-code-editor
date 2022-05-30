const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

MongoClient.connect(uri, function(err, db) {

    var dbo = db.db("cce");
    dbo.collection("docs").createIndex({roomID: 1} , function(err, result) {
        if (err) throw err;
        console.log(`Index created: ${result}`);
        db.close();
    })
})