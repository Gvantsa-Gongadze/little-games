import { Schema, type, MapSchema } from '@colyseus/schema'

export class Player extends Schema {
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('string') name: string = ''
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
}
