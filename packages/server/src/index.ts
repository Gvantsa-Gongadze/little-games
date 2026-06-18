import { Server } from 'colyseus'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { GameRoom } from './rooms/GameRoom'

const app = express()

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const httpServer = createServer(app)

const gameServer = new Server({ server: httpServer })
gameServer.define('game_room', GameRoom)

const PORT = Number(process.env.PORT) || 2567
gameServer.listen(PORT).then(() => {
  console.log(`Colyseus server running on ws://localhost:${PORT}`)
})
