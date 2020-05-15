/**
 * Recurse Roulette
 */

// checks if this is a dev environment
const isDev = location.hostname === "localhost";

// video elements for the two streams
const me = document.querySelector("#me");
const you = document.querySelector("#you");
let myPeerID, yourPeerID, stream, peer, waitForPeer, peerCall, peerConn;

// the state keeps track of the current user's mic and name-tag
let state = {
  isMuted: false,
  expecting: false,
};

// query selectors used throughout code
const peerMuteIcon = document.querySelector("#peerMuteIcon");
const myMuteIcon = document.querySelector("#myMuteIcon");
const onlinePeersSpan = document.querySelector("#onlinePeers");
const matchContainer = document.querySelector("#matchContainer");

// peer name-tag query selectors
const peerNameTag = document.querySelector("#peerUserInfo");
const peerName = document.querySelector("#peerUserInfo .name");
const peerPronouns = document.querySelector("#peerUserInfo .pronouns");
const peerTimezone = document.querySelector("#peerUserInfo .timezone");

// my name-tag query selectors
const myNameTag = document.querySelector("#myUserInfo");
const myName = document.querySelector("#myUserInfo .name");
const myPronouns = document.querySelector("#myUserInfo .pronouns");
const myTimezone = document.querySelector("#myUserInfo .timezone");

// buttons query selectors
const muteButton = document.querySelector("#muteButton");
const videoButton = document.querySelector("#videoButton");
const connectButton = document.querySelector("#connect");
const hangupButton = document.querySelector("#close");

let countDown;

// fetch the number of minutes until the next round when opening web page
async function getStateAndStartCountdown() {
  const situation = await (await fetch("/api/sitch")).json();
  console.log(situation);
  const waitPeriodInSeconds = situation.waitPeriodInSeconds;

  // get the time now
  const startTime = Date.now();
  clearInterval(countDown);

  countDown = setInterval(
    async (initialCountdown) => {
      // converts the seconds to next round
      const elapsed = (Date.now() - startTime) / 1000;
      // number of seconds before the next pairing
      let secondsUntillNextRound = initialCountdown - elapsed;
      // number of seconds current chats have let to talk
      let secondsUntillRoundEnds = secondsUntillNextRound - waitPeriodInSeconds;
      // this is to prevent negative floats
      if (secondsUntillNextRound <= 0) {
        secondsUntillNextRound = 0;
      }
      // update the UI with the number of seconds left in the round
      // if there are still seconds in this round, show them
      if (secondsUntillRoundEnds >= 0) {
        updateTimerUI(secondsUntillRoundEnds, "until this chat ends");
      }
      // otherwise show how much time until next round
      else {
        updateTimerUI(secondsUntillNextRound, "until next chat starts");
      }

      // if you have a peerID you have joined for this round
      if (secondsUntillNextRound <= 0 && myPeerID) {
        clearInterval(countDown);
        // wait before starting this over
        setTimeout(async () => {
          // get the gimmePartner endpoint
          state.expecting = false;
          const newPartner = await (
            await fetch(`/api/gimmePartner/${myPeerID}`)
          ).json();
          if (newPartner) {
            // hang up calls here?
            startRoulette(newPartner.partnerId);
            // fetch new state
            // start new interval for *next* round
          }
          getStateAndStartCountdown();
          console.log(newPartner);
        }, 2000);

        // if there are 30 seconds before the next round and hte user is current on a call, hangup on that call and rejoin the roulette
      } else if (
        secondsUntillNextRound > 0 &&
        secondsUntillNextRound <= 30 &&
        myPeerID &&
        isConnected()
      ) {
        console.log(`peerCall`, peerCall);
        console.log(`myPeerID ${myPeerID}`);
        console.log("Hanging up and joining again...");
        // hang up on your current call and start a new call
        await handleClose();
        await makeConnection();
        // hangup; get new id;
      } else if (secondsUntillNextRound <= 0) {
        console.log("Refreshing state?");
        clearInterval(countDown);
        setTimeout(() => {
          getStateAndStartCountdown();
        }, 2000);
      }
    },
    100,
    situation.secondsUntillNextRound
  );
}

// function to update the timerUI
function updateTimerUI(timePeriod, description) {
  const minutes = Math.floor(timePeriod / 60)
    .toString()
    .padStart(2, 0);
  const seconds = Math.floor(timePeriod - minutes * 60)
    .toString()
    .padStart(2, 0);
  //update timer HTML
  const timer = document.getElementById("timeToNextRound");
  // if there are less than 10 seconds, left make the timer bigger
  if (seconds <= 10 && minutes <= 0) {
    description = "";
    timer.style.fontSize = "1.5em";
  } else {
    timer.style.fontSize = "";
  }
  timer.textContent = `${minutes}:${seconds} ${description}`;
}

// initiate when the page loads
getStateAndStartCountdown();
// update previous matches on the screen
initalizeMatchUI()

// updates how many peers are online every second
const checkForOnlinePeers = setInterval(async () => {
  const currentOnlinePeers = await (await fetch("/api/online")).json();
  onlinePeersSpan.textContent = `${currentOnlinePeers} Recurser${
    currentOnlinePeers === 1 ? "" : "s"
    } Online`;
}, 1000);

// mute and audio buttons
muteButton.addEventListener("click", () => {
  modifyStream("audio", event.target);
});
videoButton.addEventListener("click", () =>
  modifyStream("video", event.target)
);

// join and hangup buttons
connectButton.addEventListener("click", makeConnection);
hangupButton.addEventListener("click", () => {
  // if you are connected hang up
  console.log("Clicked hangup");
  // tell the peer you are hanging up on them
  peerConn && peerConn.send({ hangup: "l8rz" });
  handleClose();
});

// fetches an available peer from the API endpoint
async function startRoulette(specificPeer = false) {
  //set who we expect to be chatting with
  state.expecting = specificPeer;

  //initiates a call and connection
  peerCall = peer.call(specificPeer, stream);
  peerConn = peer.connect(specificPeer);

  peerCall.on("stream", handleStream);
  peerCall.on("close", handleClose);
  peerCall.on("error", errHandler("peerCall"));

  // sends the current state to tell the peer if the stream is muted
  peerConn.on("open", () => peerConn.open && peerConn.send(state));
  peerConn.on("data", handleConnection);
  peerConn.on("error", errHandler("peerConn"));
}

function errHandler(prefix) {
  return (err) => {
    // why are we not just hanging here?
    state.expecting = false;
    console.log(`${prefix} <${err.type}>: ${err}`);
    throw new Error(err);
  };
}

async function makeConnection() {
  //disable join button, enable hang up mute and stop video buttons
  connectButton.disabled = true;
  hangupButton.removeAttribute("disabled");
  muteButton.removeAttribute("disabled");
  videoButton.removeAttribute("disabled");
  // add loading animation
  you.srcObject = null;
  you.classList.add("loading");

  // user info from the API
  const endpoint = isDev ? "test-user.json" : "/api/me";
  console.log(isDev ? "IS dev" : "is NOT dev");
  state.userInfo =
    state.userInfo ||
    (await (
      await fetch(endpoint, {
        headers: new Headers({
          "content-type": "application/json",
          charset: "utf-8",
        }),
      })
    ).json());

  // figure out timezone
  const offset = (new Date().getTimezoneOffset() * -1) / 60;
  const hrs = Math.floor(offset);
  const min = offset - hrs;
  const offsetString = `${Math.floor((hrs + min) * 100)}`;
  state.userInfo.timezone = `GMT ${offset >= 0 ? "+" : ""}${offsetString}`;

  // fill in your own user information
  myNameTag.classList.add("flex-row");
  myName.textContent = `${state.userInfo.name}`;
  myPronouns.textContent = `(${state.userInfo.pronouns})`;
  myTimezone.textContent = `${state.userInfo.timezone}`;

  // initiate media stream
  if (!me.srcObject) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log(stream);

    // put the stream to the HTML video object
    me.srcObject = stream;
    me.play();
  }

  if (peer === undefined || (typeof peer === "object" && peer.destroyed)) {
    setupPeer();
    console.log("I have set up a peer", peer);
  }
}

function setupPeer() {
  //change this value if you deploy your own instance of recurse roulette
  peer = new Peer({
    host: isDev ? location.hostname : "recurse-roulette.herokuapp.com",
    port: location.port,
    path: "/peer",
  });

  // connect to the signaling server
  peer.on("open", function (id) {
    myPeerID = id;
    console.log("Opening conection to PeerJS", id);
    // waitForPeer = setInterval(startRoulette, 1000);
  });

  // make connection to peer
  peer.on("connection", function (conn) {
    if (isConnected()) {
      console.log(
        "data connection made, but already have connection. REJECTED."
      );
      // reject this incoming conection
      conn.close();
      return false;
    }
    peerConn = conn;
    // sends the current state to tell the peer if the stream is muted
    peerConn.on("open", () => peerConn.send(state));
    peerConn.on("data", handleConnection);
  });

  // fires when another peer calls the current user
  peer.on("call", async function (call) {
    // if the current user is already connected to a call, reject this call
    if (isConnected()) {
      console.log("call received, but already on call. REJECTED.");
      // reject this incoming call
      call.close();
      return false;
    }

    console.log("Receiving call");
    // sets the global peerCall object to the call
    peerCall = call;
    // answer the call and send the the current user's stream
    peerCall.answer(stream);
    peerCall.on("stream", handleStream);
    peerCall.on("close", handleClose);
    getStateAndStartCountdown();
  });
}

async function handleStream(remoteStream) {
  // remove loading animation
  you.classList.remove("loading");

  // sets the source for the video element to the incoming stream
  you.srcObject = remoteStream;

  // ends the roulette
  // clearInterval(waitForPeer);
}

function handleClose() {
  // tell the remote peer that we're hanging up
  state.expecting = false;

  if (isConnected()) {
    peerConn && peerConn.open && peerConn.send({ hangup: "l8rz" });
  } else if (isConnected() == false) {
    peer.destroy();

    // George isn't crazy about this.
    myPeerId = false;
    // remove loading animation, enable join button, disable hangup button
    you.classList.remove("loading");
    connectButton.removeAttribute("disabled");
    hangupButton.disabled = true;
    return false;
  }

  // remote stream to the video element
  you.srcObject = null;

  // close the connection and DESTRUCTION to the peer
  // (abandon all hope, ye who enter peer)
  peerCall.close();
  peerConn.close();
  peer.destroy();

  // hide peer name tag
  peerNameTag.classList.remove("flex-row");
  // remove muted icon for peer
  peerMuteIcon.style.display = "none";
  // remove peer user info
  peerName.textContent = "";
  peerPronouns.textContent = "";
  peerTimezone.textContent = "";

  // disable hangup button, enable connect button
  hangupButton.disabled = true;
  connectButton.removeAttribute("disabled");
  console.log("Connection closed");
}

function handleConnection(data) {
  console.log("data in handleConnection: ", data);

  // check here to make sure that the user is
  // expecting to chat with us and not someone else
  // if they're expecting someone else, politely hangup

  if (data.expecting !== false && data.expecting !== myPeerID) {
    console.log("Politely closing this is the data sent", data);
    // politely hang up on ther person
    handleClose();
    //you should rejoin
    makeConnection();
    return;
    // do a polite hangup because we were not expected
    // destroy the call
  }

  // fill in the user name-tag information
  peerNameTag.classList.add("flex-row");
  peerName.textContent = `${data.userInfo.name}`;
  peerPronouns.textContent = `(${data.userInfo.pronouns})`;
  peerTimezone.textContent = `${data.userInfo.timezone}`;
  // update localStorage with this user's name
  updateMatchList(data.userInfo.name)

  // sends information about if the peer is muted
  if (data.isMuted) {
    peerMuteIcon.style.display = "block";
  } else {
    peerMuteIcon.style.display = "none";
  }
  // the peer sends a hangup event when they initiate a hang up
  if (data.hangup) {
    console.log("Got a hangup");
    handleClose();
    makeConnection();
  }
}

// event handler for the mute and video buttons
// streamName can be "video" or "audio"
function modifyStream(streamName, target) {
  if (!stream) {
    return false;
  }
  // finds if the specified stream is enabled
  let isEnabled = stream
    .getTracks()
    .filter((stream) => stream.kind === streamName)[0].enabled;

  // flips the value of isEnabled
  let isCurrentlyEnabled = !isEnabled;

  // toggles the stream by directly modifying the stream object
  stream
    .getTracks()
    .filter(
      (stream) => stream.kind === streamName
    )[0].enabled = isCurrentlyEnabled;

  // edits the HTML of the target
  if (streamName === "audio") {
    target.textContent = `${isCurrentlyEnabled ? "Mute" : "Unmute"}`;
    myMuteIcon.style.display = `${isCurrentlyEnabled ? "none" : "inline"}`;
    // if the audio stream is enabled, the user is not muted. So flip the value of isCurrentlyEnabled.
    let isMuted = !isCurrentlyEnabled;
    // update the state and send it to the peer
    state.isMuted = isMuted;

    if (isConnected()) {
      peerConn.send(state);
    }
  } else if (streamName === "video") {
    target.textContent = `${isCurrentlyEnabled ? "Stop" : "Start"} Video`;
  }
}
// determine if the peer stream connected
function isConnected() {
  return peerConn && peerConn.open && peerCall && peerCall.open && you.srcObject
    ? true
    : false;
}

function initalizeMatchUI() {
  // check the current date to see if the expiration has passeds
  let now = Date.now()
  let expiration = localStorage.getItem('expiration')
  // if the expiraton has passed, reset localStorage
  if (expiration && now >= expiration) {
    console.log("localStorage has expired, clearing")
    localStorage.clear()
  }
  let matches = localStorage.getItem('matches');
  if (matches) {
    matchContainer.style.display = "block"
    matchArray = matches.split(",")
    matchArray.forEach(match => appendNewMatchtoUI(match))
  }
}

// update the list of matches in localStorage
function updateMatchList(newMatch) {
  // if there is not expiration date set one
  if (!localStorage.getItem('expiration')) {
    setLocalStorageExpiration()
  }
  let currentMatches = localStorage.getItem('matches') || "";
  let updatedMatches = `${currentMatches && `${currentMatches},`}${newMatch}`
  localStorage.setItem('matches', updatedMatches);
  appendNewMatchtoUI(newMatch)
}

// update the list of matches in the UI
function appendNewMatchtoUI(match) {
  matchContainer.style.display = "block"
  const matchList = document.querySelector("#matchList");
  let listItem = document.createElement("li");
  listItem.textContent = match
  matchList.appendChild(listItem);
}

// set localStorage to expire one week into the future
function setLocalStorageExpiration() {
  const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000
  let expiration = Date.now() + weekInMilliseconds
  localStorage.setItem('expiration', expiration)
}

// check the current date to see if the expiration has passed
function checkLocalStorageExpiration() {
  let now = Date.now()
  let expiration = localStorage.getItem('expiration')
  // if the expiraton has passed, reset localStorage
  if (now >= expiration) {
    console.log("localStorage has expired, clearing")
    localStorage.clear()
  }
}

// bill
(() => {
  const bill = new Konami(() => {
    const bills = ["billandbees.jpg", "billandirshmen.jpg", "billspace.jpg"];
    you.poster = `/media/${bills[Math.floor(Math.random() * bills.length)]}`;
    clearInterval(checkForOnlinePeers);
    onlinePeersSpan.textContent = "Bill is Online";
    const marquee = document.querySelector("marquee");
    marquee.innerHTML =
      "<marquee scrollamount='20' behavior='alternate' style='width:30%;color:#00A0E6'>Gotta go fast!</marquee>";
  });
})();

/**
 * Update the app download link if we're not already
 * in the Electron app.
 */
if (!(navigator.userAgent.toLowerCase().indexOf(" electron/") > -1)) {
  const appLinks = [
    ["^mac", "https://teambeard.s3.amazonaws.com/recurse-roulette-1.0.0.dmg"],
    [
      "^win",
      "https://teambeard.s3.amazonaws.com/recurse-roulette-setup-1.0.0.exe",
    ],
    [
      "^linux",
      "https://teambeard.s3.amazonaws.com/recurse-roulette-1.0.0.AppImage",
    ],
  ];

  appLinks.forEach((platformCheck) => {
    const check = new RegExp(platformCheck[0], "i");

    if (!!check.test(navigator.platform)) {
      const download = document.querySelector("#download");
      download.href = platformCheck[1];
      download.hidden = false;
    }
  });
}
