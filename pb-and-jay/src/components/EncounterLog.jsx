import React, { useEffect, useRef, useState } from 'react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AiActionsAccordion({ aiActions }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ai-actions">
      <button className="ai-actions__toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▲' : '▼'} Party actions ({aiActions.length} characters)
      </button>
      {open && (
        <div className="ai-actions__list">
          {aiActions.map((a, i) => (
            <div key={i} className="ai-action">
              <span className="ai-action__name">{a.character}</span>
              <p className="ai-action__text">{a.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostEntry({ post, canEdit, onEdit, onDelete }) {
  const isDM = post.type === 'dm';
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const isLong = post.content.length > 280;

  const handleSave = async () => {
    if (!editContent.trim() || editContent.trim() === post.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(post.id, editContent.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this post by ${post.author}?`)) return;
    await onDelete(post.id);
  };

  return (
    <article className={`log-entry ${isDM ? 'log-entry--dm' : 'log-entry--player'}`}>
      <header className="log-entry__header">
        <span className="log-entry__author">{post.author}</span>
        <div className="log-entry__meta">
          <time className="log-entry__time">{formatTime(post.timestamp)}</time>
          {canEdit && (
            <div className="log-entry__actions">
              <button className="log-entry__action-btn" title="Edit post" onClick={() => { setEditContent(post.content); setEditing(true); }}>✏</button>
              <button className="log-entry__action-btn log-entry__action-btn--del" title="Delete post" onClick={handleDelete}>✕</button>
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <div className="log-entry__edit">
          <textarea
            className="log-entry__edit-input"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={Math.max(3, editContent.split('\n').length + 1)}
            autoFocus
          />
          <div className="log-entry__edit-actions">
            <button className="btn btn--primary btn--xs" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn--ghost btn--xs" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`log-entry__body${isLong && !expanded ? ' log-entry__body--clamped' : ''}`}>
            {post.content.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {isLong && (
            <button className="read-more-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </>
      )}

      {isDM && post.aiActions?.length > 0 && (
        <AiActionsAccordion aiActions={post.aiActions} />
      )}
    </article>
  );
}

const EncounterLog = ({ posts, isLoading, postsReady, scrollKey, isDm, onEdit, onDelete }) => {
  const bottomRef = useRef(null);
  const logRef = useRef(null);
  const userScrolledUp = useRef(false);

  const handleScroll = () => {
    const el = logRef.current;
    if (!el) return;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
  };

  const scrollToBottom = (smooth = true) => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  };

  useEffect(() => {
    userScrolledUp.current = false;
    scrollToBottom(true);
  }, [scrollKey]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom(true);
    }
  }, [posts, isLoading]);

  return (
    <div className="log-window" ref={logRef} onScroll={handleScroll}>
      {!postsReady && posts.length === 0 && (
        <div className="log-empty">
          <span className="log-empty__text">Loading posts…</span>
        </div>
      )}
      {postsReady && posts.length === 0 && !isLoading && (
        <div className="log-empty">
          <span className="log-empty__text">No posts yet. Be the first to write something!</span>
        </div>
      )}
      {posts.map((post) => (
        <PostEntry
          key={post.id}
          post={post}
          canEdit={isDm && !!onEdit}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      {isLoading && (
        <div className="log-entry log-entry--dm log-entry--loading">
          <span className="dm-typing">The DM is weaving the tale...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default EncounterLog;
