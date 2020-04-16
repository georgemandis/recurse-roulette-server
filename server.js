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
const cors = require("cors");
const debug = require("debug")("recurse-roulette:server");

// CORs shenanigans to make it work nice with the Recurse subdomain
// proxy stuff and PeerJS

const whitelist = [process.env.BASE_URI];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};

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

app.use(cors(corsOptions));
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

app.get("/", function (req, res) {
  //session token is only required in production
  if (process.env.DEVELOPMENT) {
    res.sendFile(`${process.cwd()}/index.html`);
  } else if (req.session.token) {
    console.log(`Found token in the session: '${req.session.token}'; sending index html`);
    res.sendFile(`${process.cwd()}/index.html`);
  } else {
    console.log("No token, redirecting to /auth");
    res.redirect("/auth");
  }
});

app.get("/callback", async function (req, res) {
  console.log("/callback");
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: process.env.REDIRECT_URI
  };

  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig);
    req.session.token = result.access_token;
    console.log(`set token to '${req.session.token}'`);
    res.redirect("/");
  } catch (error) {
    console.log("Access Token Error", error.message);
    res.send("Error creating token: " + error.message);
  }
});

app.get("/auth", async function (req, res) {
  try {
    const authorizationUri = oauth2.authorizationCode.authorizeURL({
      redirect_uri: process.env.REDIRECT_URI
    });

    // Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
    res.redirect(authorizationUri);
  } catch (error) {
    console.log("Auth got error", error.message);
    res.send("Error creating token: " + error.message);
  }
});

//sends list of all peers who available to pair
app.get("/api/peers", function (req, res) {
  console.log(`peers: '${JSON.stringify(Array.from(peers))}'`);
  return res.json(Array.from(peers));
});

// Client should send their own id to this endpoint
// to be removed from the available peer list
app.get("/api/peers/consume/:id", function (req, res) {
  const consumedPeer = req.params.id;
  console.log("consuming peer " + consumedPeer);
  const result = peers.delete(consumedPeer);
  return res.json({
    success: result
  });
});

// Client should send add own id to this endpoint
// if they've already been given a peer ID and simply
// want to rejoin the queue.
app.get("/api/peers/add/:id", function (req, res) {
  const addedPeer = req.params.id;
  console.log("adding peer " + addedPeer);
  const result = peers.add(addedPeer);
  return res.json({
    success: result
  });
});

//sends list of all peers who are online
app.get("/api/online", function (req, res) {
  console.log(`online: '${JSON.stringify(Array.from(allPeers))}'`);
  return res.json(allPeers.size);
});

peerServer.on("connection", function (id) {
  peers.add(id);
  allPeers.add(id);
  console.log(`*!*!*!*!* ${id} connected`);
});

peerServer.on("disconnect", function (id) {
  peers.delete(id);
  allPeers.delete(id);
  console.log(`*!*!*!*!* ${id} disconnected`);
});
