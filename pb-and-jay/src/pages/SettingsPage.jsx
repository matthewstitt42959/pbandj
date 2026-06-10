import React from 'react';

const SettingsPage = () => {
  return (
    <div className="settings-page">
      <h1>Setup Guide</h1>

      <section className="settings-section">
        <h2>1. Get an OpenAI API key</h2>
        <p>
          The app uses the <strong>OpenAI API</strong> (separate from ChatGPT in the browser).
          Create a key at{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            platform.openai.com
          </a>
          , or use a work-provided key if your organization has one.
        </p>
      </section>

      <section className="settings-section">
        <h2>2. Create a .env file</h2>
        <p>In the <code>pb-and-jay</code> folder, create a file named <code>.env</code>:</p>
        <pre className="settings-code">
{`AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini`}
        </pre>
      </section>

      <section className="settings-section">
        <h2>3. Switch to Claude (optional)</h2>
        <p>To use Claude instead, change your <code>.env</code>:</p>
        <pre className="settings-code">
{`AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514`}
        </pre>
        <p>Only one provider is active at a time, controlled by <code>AI_PROVIDER</code>.</p>
      </section>

      <section className="settings-section">
        <h2>4. Start the app</h2>
        <pre className="settings-code">npm run dev</pre>
        <p>Or double-click <code>start.bat</code> in the repo root.</p>
      </section>

      <section className="settings-section">
        <h2>5. Play!</h2>
        <p>
          Click <strong>Begin Adventure</strong>, pick a character, and post your first action.
          The AI DM responds with narrative and consequences.
        </p>
      </section>
    </div>
  );
};

export default SettingsPage;
