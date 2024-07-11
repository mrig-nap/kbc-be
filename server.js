import 'dotenv/config'
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';

const { PORT, CLIENT_URL } = process.env;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
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

  socket.on("join-room", (playerName, socketId, roomID) => {
    socket.join(roomID);
    players.push({
      id: generateRandomID(12),
      name: playerName,
      ready: true,
      socketId: socketId,
      roomID: roomID,
      responseTime: 0,
      correct: 0,
      totalQuestions: 0
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
    players.length = 0;
    players.push(...newPlayers)
    io.emit("new-player-list", players.filter(play => play.roomID === player.roomID))
    // io.to(player.roomID).emit("fff-response-update", fffResponse)
  })

  socket.on("disconnect", () => {
    console.log("Player Disconnected -" + socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server is listening to PORT ${PORT}`)
})