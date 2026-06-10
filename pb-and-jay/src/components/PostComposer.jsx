import React, { useState } from 'react';

const PostComposer = ({
  authorName,
  onSubmit,
  disabled,
  error,
  submitLabel = 'Post',
  placeholder = 'Describe your action... (tip: type /roll 1d20+3 for dice rolls)',
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setContent('');
  };

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <label className="post-composer__label">
        Post as <strong>{authorName}</strong>
      </label>
      <textarea
        className="post-composer__input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
      />
      {error && <p className="post-composer__error">{error}</p>}
      <div className="post-composer__actions">
        <button type="submit" className="btn btn--primary" disabled={disabled || !content.trim()}>
          {disabled ? 'Waiting for DM...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PostComposer;
