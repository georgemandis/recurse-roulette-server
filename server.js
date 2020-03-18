/**
 * Recurse Roulette
 * ===
 */

const express = require("express");
const app = express();
const ExpressPeerServer = require("peer").ExpressPeerServer;
const server = app.listen(9000);
const options = {
  debug: false
};

const peerServer = ExpressPeerServer(server, options);

const peers = new Set();

app.use("/", express.static("public"));
app.use("/peer", peerServer);

app.get("/api/peers", function(req, res) {  
  console.log(peers);
  return res.json(Array.from(peers));
});

// Client should send their own id to this endpoint
// to be removed from the available peer list
app.get("/api/peers/consume/:id", function(req, res) {  
  const consumedPeer = req.params.id;
  const result = peers.delete(consumedPeer);
  return res.json({
    success: result
  });
});

peerServer.on("connection", function(id) {
  peers.add(id);
});

peerServer.on("disconnect", function(id) {
  peers.delete(id);  
});