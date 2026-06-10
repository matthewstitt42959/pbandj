import React, { useEffect, useRef } from 'react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function PostEntry({ post }) {
  const isDM = post.type === 'dm';
  return (
    <article className={`log-entry ${isDM ? 'log-entry--dm' : 'log-entry--player'}`}>
      <header className="log-entry__header">
        <span className="log-entry__author">{post.author}</span>
        <time className="log-entry__time">{formatTime(post.timestamp)}</time>
      </header>
      <div className="log-entry__body">
        {post.content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </article>
  );
}

const EncounterLog = ({ posts, isLoading }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts, isLoading]);

  return (
    <div className="log-window">
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
