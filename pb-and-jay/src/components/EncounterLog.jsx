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

function PostEntry({ post }) {
  const isDM = post.type === 'dm';
  const [expanded, setExpanded] = useState(false);
  const isLong = post.content.length > 280;

  return (
    <article className={`log-entry ${isDM ? 'log-entry--dm' : 'log-entry--player'}`}>
      <header className="log-entry__header">
        <span className="log-entry__author">{post.author}</span>
        <time className="log-entry__time">{formatTime(post.timestamp)}</time>
      </header>
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
      {isDM && post.aiActions?.length > 0 && (
        <AiActionsAccordion aiActions={post.aiActions} />
      )}
    </article>
  );
}

const EncounterLog = ({ posts, isLoading, scrollKey }) => {
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
      {posts.map((post) => (
        <PostEntry key={post.id} post={post} />
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
