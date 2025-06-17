import React from 'react';
import { Link } from 'react-router-dom';
const CampaignEditor = () => {
  return (
    <div style={{padding: '2rem'}}>
      <h1>Campaign Editor</h1>
      <p>Here you can create and manage your D&D campaigns.</p>
      <Link to="/campaigns" style={styles.link}>Back to Campaigns</Link>
    </div>
  );
}

export default CampaignEditor;