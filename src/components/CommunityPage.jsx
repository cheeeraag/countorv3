import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Avatar } from './UI'

// ─── Storage helpers ──────────────────────────────────────────────────────────
const POSTS_KEY    = 'countor_posts'
const COMMENTS_KEY = 'countor_comments'

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

function getPosts()               { return load(POSTS_KEY) }
function getComments(postId)      { return load(COMMENTS_KEY).filter(c => c.postId === postId) }
function allComments()            { return load(COMMENTS_KEY) }

function savePost(post) {
  const posts = getPosts()
  const idx   = posts.findIndex(p => p.id === post.id)
  if (idx >= 0) posts[idx] = post; else posts.unshift(post)
  save(POSTS_KEY, posts)
}

function saveComment(comment) {
  const comments = allComments()
  const idx      = comments.findIndex(c => c.id === comment.id)
  if (idx >= 0) comments[idx] = comment; else comments.push(comment)
  save(COMMENTS_KEY, comments)
}

function deletePost(postId) {
  save(POSTS_KEY, getPosts().filter(p => p.id !== postId))
  save(COMMENTS_KEY, allComments().filter(c => c.postId !== postId))
}

function deleteComment(commentId) {
  save(COMMENTS_KEY, allComments().filter(c => c.id !== commentId))
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',          label: '🏠 All',            color: '#1B5E3B' },
  { id: 'general',      label: '💬 General',         color: '#2D7A50' },
  { id: 'anxiety',      label: '💭 Anxiety',         color: '#A06030' },
  { id: 'depression',   label: '🌧 Depression',      color: '#5B6FA0' },
  { id: 'stress',       label: '🔥 Work & Stress',   color: '#C0392B' },
  { id: 'students',     label: '📚 Students',        color: '#7B5EA0' },
  { id: 'sleep',        label: '😴 Sleep',           color: '#2471A3' },
  { id: 'motivation',   label: '⚡ Motivation',      color: '#D4740A' },
  { id: 'selfcare',     label: '🌸 Self-care',       color: '#C0715A' },
  { id: 'wins',         label: '🎉 Small Wins',      color: '#1B5E3B' },
]

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ─── Main Community Page ──────────────────────────────────────────────────────
export function CommunityPage() {
  const { user } = useApp()
  const [posts,      setPosts]      = useState(() => getPosts())
  const [category,   setCategory]   = useState('all')
  const [sort,       setSort]       = useState('new')   // new | top | comments
  const [view,       setView]       = useState('feed')  // feed | post | create
  const [activePost, setActivePost] = useState(null)

  const refresh = () => setPosts(getPosts())

  const filtered = useMemo(() => {
    let list = category === 'all' ? posts : posts.filter(p => p.category === category)
    if (sort === 'top')      list = [...list].sort((a, b) => b.upvotes - a.upvotes)
    else if (sort === 'comments') list = [...list].sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
    else                     list = [...list].sort((a, b) => b.createdAt - a.createdAt)
    return list
  }, [posts, category, sort])

  const openPost = (post) => { setActivePost(post); setView('post') }
  const goFeed   = ()     => { setActivePost(null); setView('feed'); refresh() }

  if (view === 'create') {
    return <CreatePost user={user} onSuccess={() => { refresh(); goFeed() }} onBack={goFeed} />
  }
  if (view === 'post' && activePost) {
    return <PostDetail post={activePost} user={user} onBack={goFeed} onRefresh={refresh} />
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontFamily: "'Lora', serif", marginBottom: 4 }}>Community 🌿</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>A safe, supportive space to share and connect</p>
        </div>
        <button className="btn-primary" onClick={() => setView('create')} style={{ whiteSpace: 'nowrap' }}>
          ✏️ New Post
        </button>
      </div>

      {/* Category tabs — scrollable */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', transition: 'all .15s',
              background: category === c.id ? c.color : 'var(--white)',
              color: category === c.id ? '#fff' : 'var(--muted)',
              border: category === c.id ? 'none' : '1px solid var(--border)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sort + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{filtered.length} post{filtered.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['new','🕐 New'],['top','⬆️ Top'],['comments','💬 Active']].map(([s, l]) => (
            <button key={s} onClick={() => setSort(s)} style={{
              padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
              background: sort === s ? 'var(--green)' : 'transparent',
              color: sort === s ? '#fff' : 'var(--muted)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Posts feed */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🌱</p>
          <p style={{ fontSize: 16, fontFamily: "'Lora', serif", marginBottom: 8 }}>No posts yet</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Be the first to share something in this space.</p>
          <button className="btn-primary" onClick={() => setView('create')}>Write the first post →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(post => (
            <PostCard key={post.id} post={post} user={user} onOpen={() => openPost(post)} onRefresh={refresh} />
          ))}
        </div>
      )}

      {/* Guidelines */}
      <div style={{ background: 'var(--green-pale)', border: '1px solid var(--green-pale2)', borderRadius: 12, padding: '14px 18px', marginTop: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.8 }}>
          <strong>Community Guidelines:</strong> Be kind and supportive. No unsolicited advice unless asked. Respect anonymity. No diagnosis or medical advice. Report harmful content. Remember: this is peer support, not therapy.
        </p>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, user, onOpen, onRefresh }) {
  const cat    = catMap[post.category] || catMap.general
  const isOwn  = user?.email === post.authorEmail
  const upvoted = post.upvotedBy?.includes(user?.email)

  const handleUpvote = (e) => {
    e.stopPropagation()
    const posts = getPosts()
    const p     = posts.find(x => x.id === post.id)
    if (!p) return
    if (upvoted) {
      p.upvotes--
      p.upvotedBy = (p.upvotedBy || []).filter(e => e !== user.email)
    } else {
      p.upvotes++
      p.upvotedBy = [...(p.upvotedBy || []), user.email]
    }
    savePost(p)
    onRefresh()
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirm('Delete this post?')) { deletePost(post.id); onRefresh() }
  }

  return (
    <div className="card card-hover" onClick={onOpen} style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Vote column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={handleUpvote}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: upvoted ? 'var(--amber)' : 'var(--muted)', transition: 'color .15s' }}
          >▲</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: upvoted ? 'var(--amber)' : 'var(--text)', minWidth: 20, textAlign: 'center' }}>
            {post.upvotes}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: cat.color + '18', color: cat.color, fontSize: 10 }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {post.anonymous ? '👤 Anonymous' : post.authorName} · {timeAgo(post.createdAt)}
            </span>
            {isOwn && (
              <button
                onClick={handleDelete}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)' }}
              >🗑 Delete</button>
            )}
          </div>

          {/* Title */}
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{post.title}</p>

          {/* Body preview */}
          {post.body && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {post.body}
            </p>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              💬 {post.commentCount || 0} comment{(post.commentCount || 0) !== 1 ? 's' : ''}
            </span>
            {post.flair && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>{post.flair}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create Post ──────────────────────────────────────────────────────────────
function CreatePost({ user, onSuccess, onBack }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'general', anonymous: false, flair: '' })
  const [err,  setErr]  = useState('')

  const FLAIRS = ['Seeking support', 'Sharing experience', 'Advice needed', 'Celebrating a win', 'Just venting', 'Question', 'Resource']

  const submit = () => {
    if (!form.title.trim()) { setErr('Please add a title.'); return }
    if (!form.category)     { setErr('Please pick a category.'); return }
    const post = {
      id: uid(),
      authorEmail: user.email,
      authorName:  user.name,
      anonymous:   form.anonymous,
      title:       form.title.trim(),
      body:        form.body.trim(),
      category:    form.category,
      flair:       form.flair,
      upvotes:     0,
      upvotedBy:   [],
      commentCount: 0,
      createdAt:   Date.now(),
    }
    savePost(post)
    onSuccess()
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>← Back</button>
      <div className="card" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 20, fontFamily: "'Lora', serif", marginBottom: 24 }}>Create a Post</h2>

        <Label text="Category *" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))} style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, transition: 'all .15s',
              background: form.category === c.id ? c.color : 'var(--cream2)',
              color: form.category === c.id ? '#fff' : 'var(--muted)',
            }}>{c.label}</button>
          ))}
        </div>

        <Label text="Post Flair (optional)" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {FLAIRS.map(f => (
            <button key={f} onClick={() => setForm(p => ({ ...p, flair: p.flair === f ? '' : f }))} style={{
              padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, transition: 'all .15s',
              background: form.flair === f ? 'var(--green-pale)' : 'transparent',
              color: form.flair === f ? 'var(--green)' : 'var(--muted)',
            }}>{f}</button>
          ))}
        </div>

        <Label text="Title *" />
        <input type="text" placeholder="What's on your mind?" value={form.title} maxLength={120}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ marginBottom: 6 }} />
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, textAlign: 'right' }}>{form.title.length}/120</p>

        <Label text="Details (optional)" />
        <textarea placeholder="Share more if you'd like — the more context you give, the better support you'll receive..." rows={5}
          value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          style={{ marginBottom: 20, resize: 'vertical' }} />

        {/* Anonymous toggle */}
        <div onClick={() => setForm(f => ({ ...f, anonymous: !f.anonymous }))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, cursor: 'pointer', marginBottom: 20 }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: form.anonymous ? 'var(--green)' : 'var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: form.anonymous ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 1 }}>Post anonymously</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Your name won't be shown. Only you can see your posts across sessions.</p>
          </div>
        </div>

        {err && <p style={{ fontSize: 13, color: 'var(--red)', background: '#FDEDEC', padding: '8px 14px', borderRadius: 8, marginBottom: 16 }}>{err}</p>}

        <button className="btn-primary" onClick={submit} style={{ width: '100%', padding: '13px', justifyContent: 'center', fontSize: 15 }}>
          Publish Post 🚀
        </button>
      </div>
    </div>
  )
}

// ─── Post Detail ──────────────────────────────────────────────────────────────
function PostDetail({ post: initialPost, user, onBack, onRefresh }) {
  const [post,     setPost]     = useState(initialPost)
  const [comments, setComments] = useState(() => getComments(initialPost.id))
  const [reply,    setReply]    = useState('')
  const [anon,     setAnon]     = useState(false)
  const [sending,  setSending]  = useState(false)

  const cat    = catMap[post.category] || catMap.general
  const upvoted = post.upvotedBy?.includes(user?.email)

  const refreshPost = () => {
    const p = getPosts().find(x => x.id === post.id)
    if (p) setPost(p)
    setComments(getComments(post.id))
  }

  const handleUpvote = () => {
    const posts = getPosts()
    const p     = posts.find(x => x.id === post.id)
    if (!p) return
    if (upvoted) { p.upvotes--; p.upvotedBy = (p.upvotedBy || []).filter(e => e !== user.email) }
    else         { p.upvotes++; p.upvotedBy = [...(p.upvotedBy || []), user.email] }
    savePost(p)
    refreshPost()
  }

  const submitComment = () => {
    if (!reply.trim()) return
    setSending(true)
    const comment = {
      id: uid(),
      postId: post.id,
      authorEmail: user.email,
      authorName:  user.name,
      anonymous:   anon,
      body:        reply.trim(),
      upvotes:     0,
      upvotedBy:   [],
      createdAt:   Date.now(),
    }
    saveComment(comment)
    // Update comment count on post
    const posts = getPosts()
    const p     = posts.find(x => x.id === post.id)
    if (p) { p.commentCount = (p.commentCount || 0) + 1; savePost(p) }
    setReply('')
    refreshPost()
    setSending(false)
    onRefresh()
  }

  const handleCommentUpvote = (comment) => {
    const upvoted = comment.upvotedBy?.includes(user.email)
    const updated = { ...comment }
    if (upvoted) { updated.upvotes--; updated.upvotedBy = (updated.upvotedBy || []).filter(e => e !== user.email) }
    else         { updated.upvotes++; updated.upvotedBy = [...(updated.upvotedBy || []), user.email] }
    saveComment(updated)
    refreshPost()
  }

  const handleDeleteComment = (commentId) => {
    if (confirm('Delete this comment?')) {
      deleteComment(commentId)
      const posts = getPosts()
      const p     = posts.find(x => x.id === post.id)
      if (p) { p.commentCount = Math.max(0, (p.commentCount || 1) - 1); savePost(p) }
      refreshPost()
      onRefresh()
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Community</button>

      {/* Post */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Upvote column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={handleUpvote} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: upvoted ? 'var(--amber)' : 'var(--muted)', transition: 'color .15s' }}>▲</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: upvoted ? 'var(--amber)' : 'var(--text)' }}>{post.upvotes}</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="badge" style={{ background: cat.color + '18', color: cat.color }}>{cat.label}</span>
              {post.flair && <span className="badge badge-green">{post.flair}</span>}
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {post.anonymous ? '👤 Anonymous' : post.authorName} · {timeAgo(post.createdAt)}
              </span>
            </div>
            <h2 style={{ fontSize: 19, fontFamily: "'Lora', serif", fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>{post.title}</h2>
            {post.body && (
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{post.body}</p>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          💬 {comments.length} Comment{comments.length !== 1 ? 's' : ''}
        </p>

        {/* Write comment */}
        <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <textarea
            placeholder="Share your thoughts, support, or experience..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            style={{ marginBottom: 10, background: 'var(--white)', resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}>
              <div onClick={() => setAnon(a => !a)} style={{ width: 30, height: 16, borderRadius: 8, background: anon ? 'var(--green)' : 'var(--border)', position: 'relative', transition: 'background .2s', cursor: 'pointer' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: anon ? 16 : 2, transition: 'left .2s' }} />
              </div>
              Post anonymously
            </label>
            <button className="btn-primary" onClick={submitComment} disabled={!reply.trim() || sending}
              style={{ padding: '8px 18px', opacity: !reply.trim() ? .5 : 1, cursor: !reply.trim() ? 'not-allowed' : 'pointer' }}>
              Comment →
            </button>
          </div>
        </div>

        {/* Comment list */}
        {comments.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No comments yet. Be the first to support! 💚</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.sort((a, b) => b.upvotes - a.upvotes || a.createdAt - b.createdAt).map(c => {
              const isOwnComment = c.authorEmail === user?.email
              const commentUpvoted = c.upvotedBy?.includes(user?.email)
              return (
                <div key={c.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--cream)', borderRadius: 10 }}>
                  <Avatar initials={c.anonymous ? '??' : c.authorName.slice(0,2).toUpperCase()} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {c.anonymous ? '👤 Anonymous' : c.authorName}
                        <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>{timeAgo(c.createdAt)}</span>
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => handleCommentUpvote(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: commentUpvoted ? 'var(--amber)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ▲ {c.upvotes}
                        </button>
                        {isOwnComment && (
                          <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)' }}>🗑</button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Support reminder */}
      <div style={{ background: 'var(--amber-pale)', border: '1px solid #F5C9A0', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ fontSize: 12, color: '#7A4010', lineHeight: 1.6 }}>
          💛 Remember: This is peer support, not professional therapy. If you or someone here is in crisis, please call <strong>iCall: 9152987821</strong>.
        </p>
      </div>
    </div>
  )
}

function Label({ text }) {
  return <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{text}</p>
}
