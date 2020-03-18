/**
 * Distributed Guitar Amp Demo
 * ===
 */

const express = require('express');
const app = express();
const ExpressPeerServer = require('peer').ExpressPeerServer;

const server = app.listen(9000);
const options = {
    debug: false
}

app.use('/', express.static('public'));

app.use('/peer', ExpressPeerServer(server, options));


server.on('stream', function(id) { 
  console.log("stream");
  // console.log(id);
});

server.on('call', function(id) { 
  console.log("closed");
  // console.log(id);
});

server.on('connection', function(id) { 
  console.log("connected");
  // console.log(id);
});

server.on('data', function(id) { 
  console.log("data")
  // console.log(id);
});

server.on('disconnect', function(id) { 
  console.log("Disconnected:");
  // // console.log(id);
});

server.on('close', function(id) { 
  console.log("Close");
  // // console.log(id);
});






