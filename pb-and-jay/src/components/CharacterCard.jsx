// Example: components/CharacterCard.jsx
const CharacterCard = ({ character }) => (
  <div className="character-card">
    <h2>{character.name}</h2>
    <p>Class: {character.class}</p>
    <p>Level: {character.level}</p>
  </div>
);

export default CharacterCard;
