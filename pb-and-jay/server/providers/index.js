/** @typedef {{ systemPrompt: string, userPrompt: string }} DMRequest */
/** @typedef {{ raw: string }} DMResponse */

/**
 * @typedef {Object} AIProvider
 * @property {string} id
 * @property {string} name
 * @property {string} envKey
 * @property {string} modelEnv
 * @property {string} defaultModel
 * @property {() => boolean} isConfigured
 * @property {() => string | undefined} getApiKey
 * @property {() => string} getModel
 * @property {(request: DMRequest) => Promise<DMResponse>} generateDMResponse
 */

export const claudeProvider = {
  id: 'claude',
  name: 'Claude (Anthropic)',
  envKey: 'ANTHROPIC_API_KEY',
  modelEnv: 'ANTHROPIC_MODEL',
  defaultModel: 'claude-sonnet-4-20250514',

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY?.trim();
  },

  getApiKey() {
    return process.env.ANTHROPIC_API_KEY?.trim();
  },

  getModel() {
    return (process.env.ANTHROPIC_MODEL || this.defaultModel).trim();
  },

  async generateDMResponse({ systemPrompt, userPrompt }) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.getModel(),
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `Anthropic API error (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const raw = data.content?.find((block) => block.type === 'text')?.text || '';
    return { raw };
  },
};

export const openaiProvider = {
  id: 'openai',
  name: 'ChatGPT (OpenAI)',
  envKey: 'OPENAI_API_KEY',
  modelEnv: 'OPENAI_MODEL',
  defaultModel: 'gpt-4o-mini',

  isConfigured() {
    return !!process.env.OPENAI_API_KEY?.trim();
  },

  getApiKey() {
    return process.env.OPENAI_API_KEY?.trim();
  },

  getModel() {
    return (process.env.OPENAI_MODEL || this.defaultModel).trim();
  },

  async generateDMResponse({ systemPrompt, userPrompt }) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({
        model: this.getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `OpenAI API error (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    return { raw };
  },
};

const providers = {
  claude: claudeProvider,
  openai: openaiProvider,
};

export function listProviders() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    name: p.name,
    envKey: p.envKey,
    modelEnv: p.modelEnv,
    defaultModel: p.defaultModel,
  }));
}

export function getProvider() {
  const id = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  const provider = providers[id];
  if (!provider) {
    const available = Object.keys(providers).join(', ');
    throw new Error(`Unknown AI_PROVIDER "${id}". Available: ${available}`);
  }
  return provider;
}
