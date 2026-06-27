import { Server } from 'colyseus'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { GameRoom }           from './rooms/GameRoom'
import { BubbleShooterRoom } from './rooms/BubbleShooterRoom'
import { BlazeShooterRoom }  from './rooms/BlazeShooterRoom'

const app = express()

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/.well-known/*', (_req, res) => res.setHeader('Content-Type', 'application/json').end('{}'))

const httpServer = createServer(app)

const gameServer = new Server({ server: httpServer })
gameServer.define('game_room', GameRoom)
gameServer.define('bubble_shooter_room', BubbleShooterRoom)
gameServer.define('blaze_shooter_room', BlazeShooterRoom)

const PORT = Number(process.env.PORT) || 2567
gameServer.listen(PORT).then(() => {
  console.log(`Colyseus server running on ws://localhost:${PORT}`)
})
