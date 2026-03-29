import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase.js'
import { getSessionId } from '../lib/session.js'

const CATS = [
  { value:'all',         label:'전체',   icon:'📋', color:'#7c3aed', bg:'#ede9fe' },
  { value:'performance', label:'수행평가', icon:'📝', color:'#dc2626', bg:'#fee2e2' },
  { value:'homework',    label:'과제',    icon:'📚', color:'#2563eb', bg:'#dbeafe' },
  { value:'supplies',    label:'준비물',  icon:'🎒', color:'#059669', bg:'#d1fae5' },
  { value:'general',     label:'기타공지', icon:'📢', color:'#d97706', bg:'#fef3c7' },
]
const EMOJIS = ['👍','❤️','😮','🙏']

export default function NoticeView() {
  const [notices,   setNotices]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [cat,       setCat]       = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('class_notices').select('*')
      .order('is_pinned', { ascending:false })
      .order('created_at', { ascending:false })
    if (cat !== 'all') q = q.eq('category', cat)
    const { data } = await q
    setNotices(data || [])
    setLoading(false)
  }, [cat])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('class-notices-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'class_notices' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const pinned = notices.filter(n => n.is_pinned)
  const normal = notices.filter(n => !n.is_pinned)

  return (
    <div>
      {/* Category filter */}
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'12px', scrollbarWidth:'none', marginBottom:'4px' }}>
        {CATS.map(c => (
          <button key={c.value} onClick={() => setCat(c.value)} style={{
            flexShrink:0, padding:'7px 14px', borderRadius:'20px',
            fontSize:'12px', fontWeight:600, border:'1.5px solid', cursor:'pointer', transition:'all 0.15s',
            borderColor: cat === c.value ? c.color : 'var(--border)',
            background:  cat === c.value ? c.color : '#fff',
            color:       cat === c.value ? '#fff'  : 'var(--muted)',
          }}>{c.icon} {c.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="stagger">
          {pinned.length > 0 && <>
            <Label text="📌 고정 공지" />
            {pinned.map(n => <NoticeCard key={n.id} notice={n} expanded={expandedId===n.id} onToggle={() => setExpandedId(expandedId===n.id ? null : n.id)} />)}
          </>}
          {normal.length > 0 && <>
            <Label text="📋 공지사항" />
            {normal.map(n => <NoticeCard key={n.id} notice={n} expanded={expandedId===n.id} onToggle={() => setExpandedId(expandedId===n.id ? null : n.id)} />)}
          </>}
          {notices.length === 0 && <Empty text="등록된 공지가 없습니다" />}
        </div>
      )}
    </div>
  )
}

function NoticeCard({ notice, expanded, onToggle }) {
  const cat  = CATS.find(c => c.value === notice.category) || CATS[4]
  const date = new Date(notice.created_at).toLocaleDateString('ko-KR', { month:'long', day:'numeric' })

  return (
    <div style={{
      background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius)',
      marginBottom:'10px', boxShadow:'var(--shadow)', overflow:'hidden', transition:'box-shadow 0.2s'
    }}>
      <div onClick={onToggle} style={{
        padding:'16px 18px', cursor:'pointer',
        borderLeft:`4px solid ${notice.is_pinned ? 'var(--accent)' : cat.color}`
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:cat.bg, color:cat.color }}>{cat.icon} {cat.label}</span>
          {notice.is_pinned && <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'20px', background:'#fef3c7', color:'#b45309' }}>📌 고정</span>}
          {notice.subject && <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 7px', borderRadius:'20px', background:'#f3f4f6', color:'var(--muted)' }}>{notice.subject}</span>}
          <span style={{ fontSize:'11px', color:'var(--muted)', marginLeft:'auto' }}>{date}</span>
        </div>
        <h3 style={{ fontSize:'15px', fontWeight:700, lineHeight:1.4, color:'var(--text)' }}>{notice.title}</h3>
        {notice.due_date && (
          <p style={{ fontSize:'12px', color:'var(--red)', fontWeight:600, marginTop:'5px' }}>⏰ 마감: {notice.due_date}</p>
        )}
        {!expanded && (
          <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {notice.body}
          </p>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid var(--border)' }}>
          <div style={{ padding:'16px 18px' }}>
            <p style={{ fontSize:'14px', lineHeight:1.85, color:'#374151', whiteSpace:'pre-wrap' }}>{notice.body}</p>
          </div>
          <ReactionBar noticeId={notice.id} />
          <CommentSection noticeId={notice.id} />
        </div>
      )}
    </div>
  )
}

function ReactionBar({ noticeId }) {
  const sid = getSessionId()
  const [counts, setCounts]   = useState({})
  const [mine,   setMine]     = useState(new Set())

  const load = useCallback(async () => {
    const { data } = await supabase.from('class_reactions').select('emoji,session_id').eq('notice_id', noticeId)
    const c = {}; const m = new Set()
    ;(data||[]).forEach(r => { c[r.emoji]=(c[r.emoji]||0)+1; if(r.session_id===sid) m.add(r.emoji) })
    setCounts(c); setMine(m)
  }, [noticeId, sid])

  useEffect(() => { load() }, [load])

  const toggle = async (emoji) => {
    if (mine.has(emoji)) {
      await supabase.from('class_reactions').delete().eq('notice_id',noticeId).eq('emoji',emoji).eq('session_id',sid)
    } else {
      await supabase.from('class_reactions').insert({ notice_id:noticeId, emoji, session_id:sid })
    }
    load()
  }

  return (
    <div style={{ padding:'10px 18px', display:'flex', gap:'8px', borderTop:'1px solid var(--border)', background:'#faf9ff' }}>
      {EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => toggle(emoji)} style={{
          display:'flex', alignItems:'center', gap:'4px',
          padding:'5px 10px', borderRadius:'20px', fontSize:'14px', fontWeight:600,
          border:'1.5px solid', cursor:'pointer', transition:'all 0.15s',
          borderColor: mine.has(emoji) ? 'var(--primary)' : 'var(--border)',
          background:  mine.has(emoji) ? 'var(--primary-light)' : '#fff',
          color:       mine.has(emoji) ? 'var(--primary)' : 'var(--muted)',
        }}>
          {emoji}{counts[emoji] ? <span style={{ fontSize:'12px' }}>{counts[emoji]}</span> : null}
        </button>
      ))}
    </div>
  )
}

function CommentSection({ noticeId }) {
  const [comments,   setComments]   = useState([])
  const [text,       setText]       = useState('')
  const [name,       setName]       = useState(() => localStorage.getItem('class_comment_name') || '')
  const [submitting, setSubmitting] = useState(false)
  const [showForm,   setShowForm]   = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('class_comments').select('*').eq('notice_id',noticeId).order('created_at')
    setComments(data||[])
  }, [noticeId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!text.trim() || !name.trim()) return
    setSubmitting(true)
    localStorage.setItem('class_comment_name', name)
    await supabase.from('class_comments').insert({ notice_id:noticeId, author:name.trim(), body:text.trim() })
    setText(''); setShowForm(false); setSubmitting(false); load()
  }

  return (
    <div style={{ padding:'12px 18px 16px', borderTop:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
        <span style={{ fontSize:'12px', fontWeight:700, color:'var(--muted)' }}>💬 댓글 {comments.length > 0 ? `${comments.length}개` : ''}</span>
        <button onClick={() => setShowForm(v=>!v)} style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600, background:'none', border:'none', padding:0, cursor:'pointer' }}>
          {showForm ? '취소' : '+ 댓글 쓰기'}
        </button>
      </div>

      {comments.map(c => (
        <div key={c.id} style={{ background:'#f5f3ff', borderRadius:'10px', padding:'10px 12px', marginBottom:'7px', fontSize:'13px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span style={{ fontWeight:700, color:'var(--primary)' }}>{c.author}</span>
            <span style={{ fontSize:'11px', color:'var(--muted)' }}>{new Date(c.created_at).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})}</span>
          </div>
          <p style={{ color:'#374151', lineHeight:1.6 }}>{c.body}</p>
        </div>
      ))}

      {showForm && (
        <div className="slide-down" style={{ background:'#f5f3ff', borderRadius:'10px', padding:'12px', marginTop:'6px' }}>
          <input placeholder="이름 (예: 홍길동)" value={name} onChange={e => setName(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', marginBottom:'8px', background:'#fff', outline:'none' }} />
          <textarea placeholder="댓글 입력..." value={text} onChange={e => setText(e.target.value)} rows={2}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', resize:'none', background:'#fff', outline:'none', display:'block' }} />
          <button onClick={submit} disabled={submitting||!text.trim()||!name.trim()} style={{
            marginTop:'8px', padding:'9px 20px', background:'var(--primary)', color:'#fff',
            border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, float:'right', cursor:'pointer',
            opacity:(!text.trim()||!name.trim()) ? 0.5 : 1
          }}>{submitting ? '등록 중...' : '등록'}</button>
          <div style={{ clear:'both' }} />
        </div>
      )}
    </div>
  )
}

export function Label({ text }) {
  return <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'1.2px', color:'var(--muted)', margin:'16px 0 8px', display:'flex', alignItems:'center', gap:'5px' }}>{text}</p>
}
export function Empty({ text }) {
  return <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}><div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div><p>{text}</p></div>
}
export function Spinner() {
  return <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
}
