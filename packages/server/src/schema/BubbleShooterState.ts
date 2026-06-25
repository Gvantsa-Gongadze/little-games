import { Schema, ArraySchema, type } from '@colyseus/schema'

export class BubbleShooterState extends Schema {
  @type(['string']) colorQueue = new ArraySchema<string>()
}
