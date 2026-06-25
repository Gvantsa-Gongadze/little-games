import type { BubbleColor } from '../constants'

type L = BubbleColor | null

export const LEVEL_1: L[][] = [
  //  0        1        2        3        4        5        6        7        8        9        10
  ['red',   'blue',  'green', 'red',   'blue',  'green', 'red',   'blue',  'green', 'red',   'blue'  ],
  //  0        1        2        3        4        5        6        7        8        9        (offset row — 10 cols)
  ['yellow','purple','red',   'blue',  'yellow','purple','red',   'blue',  'yellow','purple'          ],
  ['green', 'red',   'blue',  'green', 'red',   'blue',  'green', 'red',   'blue',  'green',  'red'  ],
  ['blue',  'yellow','purple','blue',  'yellow','purple','blue',  'yellow','purple', 'blue'           ],
  ['red',   'blue',  'green', 'red',   'blue',  'green', 'red',   'blue',  'green', 'red',    'blue' ],
]