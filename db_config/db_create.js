const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

MongoClient.connect(uri, function(err, db) {
    if (err) throw err;
    var dbo = db.db("cce");
    dbo.createCollection("docs", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});