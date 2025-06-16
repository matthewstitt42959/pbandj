import React from 'react';

const HomePage = () => {
  return (
    <div style={styles.container}>
      <h1>Welcome to PB and Jay</h1>
      <p>This is your AI-assisted play-by-post D&D adventure hub.</p>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
  },
};

export default HomePage;