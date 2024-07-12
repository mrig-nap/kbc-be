import 'dotenv/config'
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';

const { PORT, CLIENT_URL } = process.env;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
})

function generateRandomID(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const players = [];
const messages = [];
const fffResponse = [];

app.get("/", (req, res) => {
  res.send("Hello from Server!")
})

io.on("connection", (socket) => {
  console.log("Player connected -", socket.id)

  socket.on("join-room", (playerName, socketId, roomID, host) => {
    socket.join(roomID);
    players.push({
      id: generateRandomID(12),
      name: playerName,
      ready: true,
      socketId: socketId,
      roomID: roomID,
      responseTime: 0,
      correct: 0,
      totalQuestions: 0,
      host: host,
      fffWinner: false
    })
    messages.push({ text: playerName + "  joined the server", sender: "System", roomID: roomID })
    io.to(roomID).emit("new-player-list", players.filter(player => player.roomID === roomID))
    io.to(roomID).emit("receive-message", messages.filter(msg => msg.roomID === roomID))
  })

  socket.on("update-player", player => {
    const newPlayers = players.map(item => {
      if (item.id === player.id) {
        return player
      } return item
    });
    players.length = 0;
    players.push(...newPlayers)
    io.emit("new-player-list", players)
  })

  socket.on("send-message", message => {
    messages.push(message)
    io.emit("receive-message", messages)
  })

  socket.on("declare-winner", (player) => { 
    io.emit("toggle-winner", player)
  })

  socket.on("start-game", player => {
    messages.push({ text: player.name + "  started the game.", sender: "System", roomID: player.roomID })
    io.to(player.roomID).emit("receive-message", messages.filter(msg => msg.roomID === player.roomID))
    io.to(player.roomID).emit("game-started")
  })

  socket.on("fff-response", (player, responseTime, correct, totalQuestions) => {
    const newPlayers = players.map(item => {
      if (item.id === player.id) {
        item.responseTime = item.responseTime + responseTime;
        item.correct = correct ? item.correct + 1 : item.correct;
        item.totalQuestions = totalQuestions;
      } return item
    });
    newPlayers.sort(function(a, b){return b.correct - a.correct});
    players.length = 0;
    players.push(...newPlayers)
    io.to(player.roomID).emit("new-player-list", players.filter(play => play.roomID === player.roomID))
    // io.to(player.roomID).emit("fff-response-update", fffResponse)
  })

  socket.on("declare-fff-winner", player => {
    player.fffWinner = true;
    const newPlayers = players.map(item => {
      if (item.id === player.id) {
        return player
      } return item
    });
    players.length = 0;
    players.push(...newPlayers)
    io.to(player.roomID).emit("new-player-list", players.filter(play => play.roomID === player.roomID))
    messages.push({ text: "Congratulations! "+ player.name + " has been declared the winner of Fastest Finger First Round.", sender: "System", roomID: player.roomID })
    io.to(player.roomID).emit("receive-message", messages.filter(msg => msg.roomID === player.roomID))
  })

  socket.on("next-round", (roomID) => {
    io.to(roomID).emit("next-round-started")
  })

  socket.on("disconnect", () => {
    // const roomID = players.find(player => player.socketId === socket.id)?.roomID;
    // //filter out player and update new players
    // const newPlayers = players.filter(player => player.socketId !== socket.id && roomID === player.roomID);
    // players.length = 0;
    // players.push(...newPlayers)
    // io.to(roomID).emit("new-player-list", players)
    console.log("Player Disconnected -" + socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server is listening to PORT ${PORT}`)
})