/**
 * Recurse Roulette
 * ===
 */

require('dotenv').config();

const express = require("express");
const app = express();
const ExpressPeerServer = require("peer").ExpressPeerServer;
const server = app.listen(process.env.PORT);
const session = require("express-session");
const debug = require("debug")("recurse-roulette:server");

//oAuth stuff to authentication with Recurse Center log in
const credentials = {
  client: {
    id: process.env.ID,
    secret: process.env.SECRET
  },
  auth: {
    tokenHost: process.env.AUTHORIZE_URL
  }
};

const oauth2 = require("simple-oauth2").create(credentials);

const options = {
  debug: false
};

const peerServer = ExpressPeerServer(server, options);
const peers = new Set();
const allPeers = new Set();

app.use("/", express.static("public"));
app.set("trust proxy", 1);
app.use("/peer", peerServer);

//sessions to remember once a person has authenticated
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.get("/", function(req, res) {  
  if (!req.session.token) {
  	debug("No token, redirecting to /auth");
    res.redirect("/auth");
  } else {
  	debug(`Found token in the session: '${req.session.token}'; sending index html`);
    res.sendFile(`${process.env.HOME}/index.html`);
  }
});

app.get("/callback", async function(req, res) {
  debug("/callback");
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: process.env.REDIRECT_URI
  };

  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig);
    req.session.token = result.access_token;
    debug(`set token to '${req.session.token}'`);
    res.redirect("/");
  } catch (error) {
    debug("Access Token Error", error.message);
    res.send("Error creating token: " + error.message);
  }
});

app.get("/auth", async function(req, res) {
  try {
  	  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    	redirect_uri: process.env.REDIRECT_URI
  	  });

  	  // Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
  	  res.redirect(authorizationUri);
  } catch (error) {
  	  debug("Auth got error", error.message);
  	  res.send("Error creating token: " + error.message);
  }
});

app.get("/api/peers", function(req, res) {
  debug(`peers: '${JSON.stringify(peers)}'`);
  return res.json(Array.from(peers));
});

// Client should send their own id to this endpoint
// to be removed from the available peer list
app.get("/api/peers/consume/:id", function(req, res) {
  const consumedPeer = req.params.id;
  debug("consuming peer "+consumedPeer);
  const result = peers.delete(consumedPeer);
  return res.json({
    success: result
  });
});

// Client should send add own id to this endpoint
// if they've already been given a peer ID and simply
// want to rejoin the queue.
app.get("/api/peers/add/:id", function(req, res) {
  const addedPeer = req.params.id;
  debug("adding peer "+addedPeer);
  const result = peers.add(addedPeer);
  return res.json({
    success: result
  });
});

app.get("/api/online", function(req, res) {
  debug(`online: '${JSON.stringify(allPeers)}'`);
  return res.json(allPeers.size);
});

peerServer.on("connection", function(id) {
  peers.add(id);
  allPeers.add(id);
  debug(`${id} connected`);
});

peerServer.on("disconnect", function(id) {
  peers.delete(id);
  allPeers.delete(id);
  debug(`${id} disconnected`);
});
