/**
 * Central constraint handler registry.
 *
 * HOW TO ADD A NEW CONSTRAINT TYPE
 * ---------------------------------
 * 1. Add the type to SolverConstraint in src/declarations.d.ts and
 *    src/solver/solverTypes.ts (kept in sync).
 * 2. Export `solverHandler: ConstraintHandler` from the extension file.
 *    All extension files are worker-safe (no DOM access at import time).
 * 3. Import it below and add one line to the registry.
 *
 * solver.worker.ts itself never needs to change.
 */

import type { ConstraintHandler } from './solverTypes'

import { solverHandler as uniqueGroupHandler } from '../solver-extensions/Sudoku'
import { solverHandler as thermoHandler }      from '../solver-extensions/Thermometer'
import { solverHandler as betweenHandler }     from '../solver-extensions/BetweenLine'
import { solverHandler as killerCageHandler }  from '../solver-extensions/KillerCage'
import { solverHandler as arrowHandler }       from '../solver-extensions/Arrow'
import { solverHandler as renbanHandler }      from '../solver-extensions/Renban'
import { solverHandler as whispersHandler }    from '../solver-extensions/Whispers'
import { solverHandler as palindromeHandler }  from '../solver-extensions/Palindrome'
import { solverHandler as xvHandler }          from '../solver-extensions/XV'
import { solverHandler as differenceHandler }  from '../solver-extensions/Difference'
import { solverHandler as ratioHandler }       from '../solver-extensions/Ratio'
import { solverHandler as minMaxHandler }      from '../solver-extensions/MinMax'
import { solverHandler as antiknightHandler }  from '../solver-extensions/AntiKnight'
import { solverHandler as antikingHandler }    from '../solver-extensions/AntiKing'
import { solverHandler as nonconsecutiveHandler } from '../solver-extensions/NonConsecutive'
import { solverHandler as oddEvenHandler }     from '../solver-extensions/OddEven'

export const constraintHandlers: Record<string, ConstraintHandler> = {
  unique_group: uniqueGroupHandler,
  thermo:       thermoHandler,
  between:      betweenHandler,
  killer_cage:  killerCageHandler,
  arrow:        arrowHandler,
  renban:       renbanHandler,
  whispers:     whispersHandler,
  palindrome:   palindromeHandler,
  xv:           xvHandler,
  difference:   differenceHandler,
  ratio:        ratioHandler,
  min_max:      minMaxHandler,
  antiknight:      antiknightHandler,
  antiking:        antikingHandler,
  nonconsecutive:  nonconsecutiveHandler,
  odd_even:        oddEvenHandler,
}
