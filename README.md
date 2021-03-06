<div align="center">

# Recurse Roulette

Recurse Roulette allows Recursers to randomly pair and chat with each other. Try using Recurse Roulette for coffee or lunch chats!

![gif-of-recurse-roulette](./public/media/beards.gif)

</div>

## Overview

Recurse Roulette opens a peer to peer connection between users using a WebRTC Javascript library called Peer JS. Recurse Roulette requires clients to connect to a signaling server to be paired. After they have been paired, they share video and audio streams via a peer to peer connection.

### Tech Stack

- [Peer.js](https://peerjs.com/) - used to make peer to peer connection on the client-side through WebRTC
- Express and Node - used for the signaling server
- JS Classic - used for client-side logic

### Recurse Authentication

Recurse Roulette requires users to authenticate with Recurse Center before signing in. Check out the [Wiki](https://github.com/recursecenter/wiki/wiki/Recurse-Center-API) for more details. Once Recursers have authenticated, they are remembered through [express sessions](https://www.npmjs.com/package/express-session).

### Server Code

Recurse Roulette shuffles and reconnects clients every five minutes. To keep the clock consistent across all clients, the server keeps track of the time until the next chat round. Clients request the time from the server as soon as they connect.

Clients need to click "Join" to connect to the signaling server and to be paired for the next chat round. When this happens, the client is given a peer ID by the server. When a new round starts, each client that has joined requests a partner from the server. The server pairs each client as the requests come in. If there is another client that has requested a partner, the server pairs those two clients, otherwise the server remembers the client’s peer ID until another client requests a partner. When the round ends, each client's peer ID is destroyed, which ends the current call, and each client is given a new ID for the next round. If a client disconnects, its peer ID is destroyed, and it must rejoin to receive a new one.

The server exposes three endpoints:

```
/api/sitch
```

This returns how much time is left in the current chat round.

```
/api/gimmePartner/:id
```

This pairs the client with a partner. The client sends its own ID.

```
/api/online
```

This returns the number of peers that have joined the chat round.

### Client Code

When the client joins the chat round and connects to the signaling server, a new peer object is created.

```
peer = new Peer({...});
```

Listeners are assigned for incoming connections from other peers.

```
peer.on("call", async function (call)
peer.on("connection", function (conn)
```

When a client is given a partner, it will initiate a data connection (`peer.connect`) and a media stream (`peer.call`) using the peer ID given by the server.

```
peerCall = peer.call(specificPeer, stream);
peerConn = peer.connect(specificPeer);
```

Once the connection is made the peers can share media streams and data. When chat round is over or the connection is closed, the client destroys the peer object.

```
peer.destroy();
```

## Contributing Guide

We hope that future Recursers will enjoy using Recurse Roulette, and we are more than excited if you want to contribute! Here are some guidelines for contributing and running Recurse Roulette locally. If you have any questions, please feel free to contact us on Zulip.

### Submitting a pull request

1. Fork and clone the repository
   ```
   git clone https://github.com/[your-username]/recurse-roulette-server
   ```
2. Create a new branch from master:
   ```
   git checkout -b new-feature-name
   ```
3. Run `npm install` to make sure you have the latest dependencies
4. Make your changes
5. Push to your fork and submit a pull request through Github

## Deployment Guide

### Running Recurse Roulette locally

1. Clone the repository from Github, or create a fork.
   ```
   git clone https://github.com/georgemandis/recurse-roulette-server
   ```
2. Run `npm install` to make sure you have the latest dependencies
3. Copy the values in [.env.sample](./.env.sample) to a new `.env` file and make sure that `DEVELOPMENT=TRUE`(OAuth values are not needed for local development)
4. Run `npm start` from the root

### Deploying with Heroku

1. Follow the steps above to get Recurse Roulette running locally
2. Set up an OAuth app on Recurse on your [settings page](https://www.recurse.com/settings/apps)
3. Replaces the values for ID and SECRET in your `.env` file with your
4. Copy these values to a new `.env` file
5. In your `.env` file change the value of DEVELOPMENT to `DEVELOPMENT=FALSE`
6. Create a [new Heroku app](https://devcenter.heroku.com/start)
7. Change the hostname in [index.html](./index.html#L195) to the URL of your Heroku instance
8. Configure the [Heroku environment variables](https://devcenter.heroku.com/articles/config-vars)
9. Follow Heroku's steps for [deployment](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote)
10. To set up your own Recurse domain, go to [your Recurse account](https://www.recurse.com/domains)

## Recurse Roulette Team

<table>
  <tr>
    <td align="center"><a href="https://github.com/georgemandis"><img src="https://avatars0.githubusercontent.com/u/21219?s=460&v=4" width="200px;" alt="Picture of George Madis"/><br /><b>George Mandis</b></a></td>
    <td align="center"><a href="https://github.com/samson212"><img src="https://avatars2.githubusercontent.com/u/1728821?s=400&v=4" width="200px;" alt="Picture of Sam Lazarus"/><br /><b>Sam Lazarus</b></a></td>
    <td align="center"><a href="https://github.com/allicolyer"><img src="https://avatars1.githubusercontent.com/u/11083917?s=460&v=4" width="200px;" alt="Picture of Allison Colyer"/><br /><b>Alli Colyer</b></a></td>
    <td align="center"><a href="https://github.com/AsaNeedle"><img src="https://avatars3.githubusercontent.com/u/43149404?s=460&v=4" width="200px;" alt="Picture of Asa Needle"/><br /><b>Asa Needle</b></a></td>
  </tr>
</table>
