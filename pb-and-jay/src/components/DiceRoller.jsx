import React, { useState } from 'react';
import { rollDice } from '../services/dice';

const QUICK_ROLLS = ['1d20', '1d12', '1d10', '1d8', '1d6', '1d4', '2d6', '1d20+5'];

const DiceRoller = ({ onRollResult }) => {
  const [notation, setNotation] = useState('1d20');
  const [lastResult, setLastResult] = useState(null);

  const doRoll = (rollNotation) => {
    const result = rollDice(rollNotation);
    if (!result) return;
    setLastResult(result);
    const text = `🎲 ${result.notation}: [${result.rolls.join(', ')}]${result.modifier ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}` : ''} = ${result.total}`;
    onRollResult?.(text);
  };

  return (
    <div className="dice-roller">
      <h4 className="dice-roller__title">Dice</h4>
      <div className="dice-roller__quick">
        {QUICK_ROLLS.map((r) => (
          <button key={r} type="button" className="btn btn--small" onClick={() => doRoll(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="dice-roller__custom">
        <input
          type="text"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="e.g. 1d20+3"
          className="dice-roller__input"
        />
        <button type="button" className="btn btn--small" onClick={() => doRoll(notation)}>
          Roll
        </button>
      </div>
      {lastResult && (
        <p className="dice-roller__result">
          {lastResult.notation}: <strong>{lastResult.total}</strong>
          <span className="dice-roller__detail"> [{lastResult.rolls.join(', ')}]</span>
        </p>
      )}
    </div>
  );
};

export default DiceRoller;
