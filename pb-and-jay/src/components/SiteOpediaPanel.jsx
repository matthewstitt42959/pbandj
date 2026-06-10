import React from 'react';

const SiteOpediaPanel = ({ facts }) => {
  return (
    <div className="siteopedia">
      <h4 className="siteopedia__title">Site-Opedia</h4>
      <p className="siteopedia__subtitle">World facts the DM remembers</p>
      {facts.length === 0 ? (
        <p className="siteopedia__empty">No facts recorded yet. They appear as you play.</p>
      ) : (
        <ul className="siteopedia__list">
          {facts.map((fact) => (
            <li key={fact.id} className="siteopedia__item">
              <strong>{fact.title}</strong>
              <span>{fact.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SiteOpediaPanel;
