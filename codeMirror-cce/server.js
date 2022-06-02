const express = require('express')
var bodyParser = require('body-parser')
const path = require('path');
const { Server } = require('socket.io')
const http = require('http');
const PORT = 8080

app = express()
var server = http.createServer(app).listen(PORT, function(){
  console.log("Express server listening at http://localhost:" + PORT);
});

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const uri = "mongodb+srv://test:test@cce.gqrqens.mongodb.net/?retryWrites=true&w=majority";

roomMap = {} // socketID to room mapping
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/favicon.ico', express.static('images/favicon.ico'));

app.use(express.static(__dirname + '/'));
app.use('/favicon.ico', express.static('images/favicon.ico'));

app.get('/', (request, response) => response.send('Code collaborative editor!'));

app.get('/:roomID', function(request, response) {
  console.log(request.params.roomID);
  response.render(path.join(__dirname, '/views/codeEditor.ejs'), 
                  {message: "New Document - " + request.params.roomID, roomId: request.params.roomID});
});

const io = new Server(server)
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  })

  socket.on('CONNECTED_TO_ROOM', async ({ roomID }) => {
    console.log("came here")
    socket.join(roomID)
    roomMap[socket.id] = roomID
    io.in(roomID).emit('ROOM:CONNECTION')
  })

  socket.on('CODE_CHANGED', async (code) => {
    const roomID = roomMap[socket.id]
    socket.to(roomID).emit('CODE_CHANGED', code)
  })
})