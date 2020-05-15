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
const https = require("https");

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
const onDeckPeer = null;

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

app.get("/api/me", function (req, res) {
  //options for http request
  const options = {
    hostname: "www.recurse.com",
    path: "/api/v1/profiles/me",
    method: "GET",
    headers: {
      Authorization: `Bearer ${req.session.token}`,
    },
  };
  //http request to get the user's profile information
  let responseJSON = "";
  https
    .request(options, (result) => {
      result.setEncoding("utf8");
      result.on("data", (data) => {
        responseJSON += data;
      });

      result.on("end", () => {
        //const myInfo
        res.json(JSON.parse(responseJSON));
      });
    })
    .on("error", (error) => {
      console.error(error);
    })
    .end();
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
  console.log(`/api/peers: '${JSON.stringify(Array.from(peers))}'`);
  return res.json(Array.from(peers));
});

// Client should send their own id to this endpoint
// to be removed from the available peer list
app.get("/api/peers/consume/:id", function (req, res) {
  const consumedPeer = req.params.id;
  console.log(`/api/peers/consume/${consumedPeer}`);
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
  console.log(`/api/peers/add/${addedPeer}`);
  const result = peers.add(addedPeer);
  return res.json({
    success: result
  });
});

//sends list of all peers who are online
app.get("/api/online/", function (req, res) {
  return res.json(allPeers.size);
});

// state endpoint
// get countime time(seconds) until next square
// send the peer's match
//
app.get(["/api/whaddup", "/api/sitch"], function (req, res) {
  const now = new Date();
  const minutesInRound = process.env.DEVELOPMENT ? 1 : 5
  const minutesFromLastRound = (now.getMinutes() % minutesInRound);
  const secondsUntillNextRound = (minutesInRound * 60) - (minutesFromLastRound * 60 + now.getSeconds());

  const situation = {
    secondsUntillNextRound: secondsUntillNextRound,
    waitPeriodInSeconds: 30,
    allPeers: allPeers,
    minutesInRound: minutesInRound,
  }

  res.json(situation);

});

app.get("/api/gimmePartner/:id", function (req, res) {
  console.log(`/api/gimmePartner/${req.params.id}`);
  console.log(`(peers: ${JSON.stringify(Array.from(peers))})`);

  peers.delete(req.params.id);
  let nextPartner = peers.values().next().value;  

  console.log(`got new peer: ${nextPartner}`);

  // if no one is waiting to be paired
  // then the user making the request
  // becomes the next user to be paired
  if (nextPartner) {    
    peers.delete(nextPartner);    
    console.log(`pairing ${req.params.id} with ${nextPartner}`);    
    res.json({ partnerId: nextPartner });
  } else {
    peers.add(req.params.id);
    res.json({ partnerId: false });
  }
})


peerServer.on("connection", function (id) {
  // peers.add(id);
  allPeers.add(id);
  console.log(`*!*!*!*!* ${id} connected`);
});

peerServer.on("disconnect", function (id) {
  peers.delete(id);
  allPeers.delete(id);
  console.log(`*!*!*!*!* ${id} disconnected`);
});
