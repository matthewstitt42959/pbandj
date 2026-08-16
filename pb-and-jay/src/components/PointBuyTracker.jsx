import React from 'react';
import { POINT_BUY_BUDGET, pointBuySpent } from '../data/dnd2024';
import './PointBuyTracker.css';

// Shared budget bar for the 2024 PHB point-buy system (27-point budget, 8-15 range).
// Used by both the character-creation wizard and the character-sheet edit flow.
export default function PointBuyTracker({ scores, onFillStandardArray }) {
  const spent = pointBuySpent(scores);
  const remaining = POINT_BUY_BUDGET - spent;
  const over = remaining < 0;
  const exact = remaining === 0;

  return (
    <div className={`pbt${over ? ' pbt--over' : exact ? ' pbt--exact' : ''}`}>
      <div className="pbt__left">
        <span className="pbt__label">Point Buy</span>
        <div className="pbt__bar-wrap">
          <div
            className="pbt__bar"
            style={{ width: `${Math.min(100, (spent / POINT_BUY_BUDGET) * 100)}%` }}
          />
        </div>
        <span className="pbt__count">
          {over
            ? `${Math.abs(remaining)} over budget`
            : exact
            ? 'Budget used'
            : `${remaining} pts remaining`}
        </span>
      </div>
      {onFillStandardArray && (
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={onFillStandardArray}
          title="Fill in 15, 14, 13, 12, 10, 8"
        >
          Standard Array
        </button>
      )}
    </div>
  );
}
