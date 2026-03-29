import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../lib/adminAuth.jsx'
import supabase from '../lib/supabase.js'

const TABS = [
  { id:'notices',  label:'공지관리',  icon:'📢' },
  { id:'polls',    label:'투표관리',  icon:'🗳️' },
  { id:'comments', label:'댓글관리',  icon:'💬' },
]

const CAT_OPTIONS = [
  { value:'performance', label:'수행평가', icon:'📝' },
  { value:'homework',    label:'과제',    icon:'📚' },
  { value:'supplies',    label:'준비물',  icon:'🎒' },
  { value:'general',     label:'기타공지', icon:'📢' },
]

// DB helpers
async function dbInsert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select()
  if (error) throw error; return data
}
async function dbUpdate(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select()
  if (error) throw error; return data
}
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

const iStyle = {
  width:'100%', padding:'10px 12px', border:'1.5px solid var(--border)',
  borderRadius:'8px', fontSize:'14px', background:'#fff', outline:'none',
  fontFamily:'Noto Sans KR', boxSizing:'border-box'
}
const bStyle = {
  padding:'10px 20px', border:'none', borderRadius:'8px',
  fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR'
}
const formBox = {
  background:'#f5f3ff', borderRadius:'14px', padding:'20px',
  marginBottom:'16px', border:'1px solid #ddd6fe'
}

export default function Admin() {
  const { logout } = useAdmin()
  const navigate   = useNavigate()
  const [tab, setTab] = useState('notices')

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <header style={{
        background:'linear-gradient(135deg, #5b21b6, #4c1d95)',
        position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 16px rgba(0,0,0,0.3)'
      }}>
        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontFamily:'Noto Serif KR', fontSize:'16px', fontWeight:700, color:'#fff' }}>⚙️ 반장 관리자</h1>
            <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', marginTop:'1px' }}>숙명여중 2학년 5반</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => navigate('/')} style={{ padding:'7px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'#fff', fontSize:'12px', cursor:'pointer' }}>앱 보기</button>
            <button onClick={() => { logout(); navigate('/') }} style={{ padding:'7px 12px', background:'rgba(220,38,38,0.8)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>로그아웃</button>
          </div>
        </div>
      </header>

      <div style={{ background:'#fff', borderBottom:'1px solid var(--border)', position:'sticky', top:'64px', zIndex:99 }}>
        <div style={{ maxWidth:'720px', margin:'0 auto', display:'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'13px 8px', border:'none', background:'none', cursor:'pointer',
              fontSize:'12px', fontWeight: tab===t.id ? 700 : 400,
              color: tab===t.id ? 'var(--primary)' : 'var(--muted)',
              borderBottom:`2px solid ${tab===t.id ? 'var(--primary)' : 'transparent'}`,
              transition:'all 0.2s', fontFamily:'Noto Sans KR'
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <main style={{ flex:1, maxWidth:'720px', margin:'0 auto', width:'100%', padding:'20px 14px 40px' }}>
        {tab === 'notices'  && <NoticeAdmin />}
        {tab === 'polls'    && <PollAdmin />}
        {tab === 'comments' && <CommentAdmin />}
      </main>
    </div>
  )
}

// ── 공지 관리 ─────────────────────────────────────────────
const EMPTY_N = { title:'', body:'', category:'general', subject:'', due_date:'', due_time:'', is_pinned:false }

function NoticeAdmin() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState(EMPTY_N)
  const F = (k,v) => setForm(p=>({...p,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('class_notices').select('*').order('created_at',{ascending:false})
    setItems(data||[]); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm(EMPTY_N); setShowForm(true) }
  const openEdit = (n) => {
    setEditing(n.id)
    const raw = n.due_date || ''
    const parts = raw.split(' ')
    setForm({
      title:    n.title,
      body:     n.body,
      category: n.category,
      subject:  n.subject  || '',
      due_date: parts[0]   || '',
      due_time: parts[1]   || '',
      is_pinned: n.is_pinned
    })
    setShowForm(true)
  }
  const close    = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    if (!form.title.trim()) { alert('제목을 입력해 주세요.'); return }
    if (!form.body.trim())  { alert('내용을 입력해 주세요.'); return }
    setSaving(true)
    try {
      const due = [form.due_date.trim(), form.due_time.trim()].filter(Boolean).join(' ')
      const payload = { title:form.title.trim(), body:form.body.trim(), category:form.category, subject:form.subject.trim()||null, due_date:due||null, is_pinned:form.is_pinned }
      if (editing) await dbUpdate('class_notices', editing, { ...payload, updated_at:new Date().toISOString() })
      else await dbInsert('class_notices', payload)
      close(); await load()
    } catch(e) { alert('저장 실패: '+e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return
    try { await dbDelete('class_notices', id); await load() }
    catch(e) { alert('삭제 실패: '+e.message) }
  }

  const catMeta = (v) => CAT_OPTIONS.find(c=>c.value===v) || CAT_OPTIONS[3]

  return (
    <div>
      <SHdr title="공지 관리" onAdd={openNew} />
      {showForm && (
        <div className="slide-down" style={formBox}>
          <h3 style={{ fontSize:'15px', fontWeight:700, color:'var(--primary)', marginBottom:'14px' }}>
            {editing ? '✏️ 공지 수정' : '➕ 새 공지 작성'}
          </h3>
          <FField label="카테고리">
            <select value={form.category} onChange={e=>F('category',e.target.value)} style={iStyle}>
              {CAT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
            </select>
          </FField>
          <FField label="과목">
            <input value={form.subject} onChange={e=>F('subject',e.target.value)} placeholder="예: 수학" style={iStyle} />
          </FField>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <FField label="마감 날짜 📅">
              <input
                type="date"
                value={form.due_date}
                onChange={e=>F('due_date',e.target.value)}
                style={{...iStyle, colorScheme:'light'}}
              />
            </FField>
            <FField label="마감 시간 ⏰">
              <input
                type="time"
                value={form.due_time}
                onChange={e=>F('due_time',e.target.value)}
                style={{...iStyle, colorScheme:'light'}}
              />
            </FField>
          </div>
          {form.due_date && (
            <div style={{
              background:'#f5f3ff', borderRadius:'8px', padding:'9px 13px',
              fontSize:'13px', color:'#5b21b6', fontWeight:600, marginBottom:'10px',
              display:'flex', alignItems:'center', gap:'6px'
            }}>
              ⏰ 마감: {new Date(form.due_date + (form.due_time ? 'T'+form.due_time : '')).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'})}{form.due_time ? ' ' + form.due_time : ''}
            </div>
          )}
          <FField label="제목 *"><input value={form.title} onChange={e=>F('title',e.target.value)} placeholder="공지 제목" style={iStyle} /></FField>
          <FField label="내용 *">
            <textarea value={form.body} onChange={e=>F('body',e.target.value)} placeholder="내용을 입력하세요" rows={5} style={{...iStyle,resize:'vertical'}} />
          </FField>
          <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', cursor:'pointer', marginBottom:'14px' }}>
            <input type="checkbox" checked={form.is_pinned} onChange={e=>F('is_pinned',e.target.checked)} style={{ width:'16px', height:'16px' }} />
            📌 상단 고정
          </label>
          <BRow onCancel={close} onSave={save} saving={saving} editing={editing} />
        </div>
      )}
      {loading ? <Spin /> : items.length===0 ? <Emp /> : items.map(n=>(
        <ARow key={n.id}
          left={<>
            <Tag color={catMeta(n.category).color}>{catMeta(n.category).icon} {catMeta(n.category).label}</Tag>
            {n.is_pinned && <span style={{fontSize:'11px'}}>📌</span>}
            <span style={{fontWeight:600,fontSize:'14px'}}>{n.title}</span>
            {n.subject && <span style={{fontSize:'11px',color:'var(--muted)',marginLeft:'4px'}}>({n.subject})</span>}
          </>}
          sub={<span style={{fontSize:'12px',color:'var(--muted)'}}>{new Date(n.created_at).toLocaleDateString('ko-KR')}{n.due_date && ` · ⏰ ${n.due_date}`}</span>}
          onEdit={()=>openEdit(n)} onDel={()=>del(n.id)}
        />
      ))}
    </div>
  )
}

// ── 투표 관리 ─────────────────────────────────────────────
function PollAdmin() {
  const [polls,    setPolls]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ title:'', description:'', is_multiple:false })
  const [options, setOptions]   = useState(['',''])
  const F = (k,v) => setForm(p=>({...p,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('class_polls').select(`
      *, class_poll_options(id,label,sort_order),
      class_poll_votes(id,option_id)
    `).order('created_at',{ascending:false})
    setPolls(data||[]); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title.trim()) { alert('투표 제목을 입력하세요.'); return }
    const validOpts = options.map(o=>o.trim()).filter(Boolean)
    if (validOpts.length < 2) { alert('선택지를 2개 이상 입력하세요.'); return }
    setSaving(true)
    try {
      const [poll] = await dbInsert('class_polls', { title:form.title.trim(), description:form.description.trim()||null, is_multiple:form.is_multiple })
      await dbInsert('class_poll_options', validOpts.map((label,i)=>({ poll_id:poll.id, label, sort_order:i+1 })))
      setShowForm(false); setForm({ title:'', description:'', is_multiple:false }); setOptions(['',''])
      await load()
    } catch(e) { alert('저장 실패: '+e.message) }
    finally { setSaving(false) }
  }

  const toggleClose = async (poll) => {
    try {
      await dbUpdate('class_polls', poll.id, { is_closed:!poll.is_closed })
      await load()
    } catch(e) { alert('실패: '+e.message) }
  }

  const del = async (id) => {
    if (!confirm('이 투표를 삭제하시겠습니까?\n(투표 결과도 모두 삭제됩니다)')) return
    try { await dbDelete('class_polls', id); await load() }
    catch(e) { alert('삭제 실패: '+e.message) }
  }

  const addOption    = () => setOptions(p=>[...p,''])
  const removeOption = (i) => setOptions(p=>p.filter((_,idx)=>idx!==i))
  const setOption    = (i,v) => setOptions(p=>p.map((x,idx)=>idx===i?v:x))

  return (
    <div>
      <SHdr title="투표 관리" onAdd={()=>setShowForm(v=>!v)} />
      {showForm && (
        <div className="slide-down" style={formBox}>
          <h3 style={{fontSize:'15px',fontWeight:700,color:'var(--primary)',marginBottom:'14px'}}>➕ 새 투표 만들기</h3>
          <FField label="투표 제목 *"><input value={form.title} onChange={e=>F('title',e.target.value)} placeholder="예: 점심 메뉴 투표 🍱" style={iStyle} /></FField>
          <FField label="설명 (선택)"><input value={form.description} onChange={e=>F('description',e.target.value)} placeholder="투표에 대한 설명" style={iStyle} /></FField>
          <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',cursor:'pointer',marginBottom:'14px'}}>
            <input type="checkbox" checked={form.is_multiple} onChange={e=>F('is_multiple',e.target.checked)} style={{width:'16px',height:'16px'}} />
            복수 선택 허용
          </label>
          <FField label="선택지 *">
            {options.map((opt,i)=>(
              <div key={i} style={{display:'flex',gap:'6px',marginBottom:'8px',alignItems:'center'}}>
                <input value={opt} onChange={e=>setOption(i,e.target.value)} placeholder={`선택지 ${i+1}`} style={{...iStyle,flex:1}} />
                {options.length > 2 && (
                  <button onClick={()=>removeOption(i)} style={{width:'32px',height:'38px',border:'1px solid var(--border)',background:'#fff5f5',borderRadius:'8px',fontSize:'16px',cursor:'pointer',flexShrink:0}}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addOption} style={{fontSize:'13px',color:'var(--primary)',background:'none',border:'1px dashed var(--primary)',borderRadius:'8px',padding:'8px 16px',cursor:'pointer',width:'100%',fontWeight:600}}>+ 선택지 추가</button>
          </FField>
          <BRow onCancel={()=>{setShowForm(false);setOptions(['',''])}} onSave={save} saving={saving} editing={null} saveLabel="투표 생성" />
        </div>
      )}

      {loading ? <Spin /> : polls.length===0 ? <Emp /> : polls.map(poll=>{
        const total = (poll.class_poll_votes||[]).length
        const opts  = [...(poll.class_poll_options||[])].sort((a,b)=>a.sort_order-b.sort_order)
        return (
          <div key={poll.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px 16px',marginBottom:'10px',boxShadow:'var(--shadow)'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background: poll.is_closed?'#f3f4f6':'#ede9fe',color:poll.is_closed?'var(--muted)':'var(--primary)'}}>
                    {poll.is_closed ? '🔒 마감' : '🔥 진행중'}
                  </span>
                  {poll.is_multiple && <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'20px',background:'#fef3c7',color:'#b45309'}}>복수선택</span>}
                  <span style={{fontSize:'11px',color:'var(--muted)',marginLeft:'auto'}}>총 {total}표</span>
                </div>
                <p style={{fontWeight:700,fontSize:'14px',marginBottom:'4px'}}>{poll.title}</p>
                {poll.description && <p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'6px'}}>{poll.description}</p>}
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {opts.map(o=>{
                    const cnt = (poll.class_poll_votes||[]).filter(v=>v.option_id===o.id).length
                    const pct = total>0?Math.round(cnt/total*100):0
                    return <span key={o.id} style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'#f5f3ff',color:'var(--primary)',fontWeight:600}}>{o.label} {cnt}표 ({pct}%)</span>
                  })}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}}>
                <button onClick={()=>toggleClose(poll)} style={{
                  padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'8px',
                  background: poll.is_closed?'#d1fae5':'#fff5f5',
                  color: poll.is_closed?'var(--green)':'var(--red)',
                  fontSize:'11px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'
                }}>{poll.is_closed ? '🔓 재개' : '🔒 마감'}</button>
                <button onClick={()=>del(poll.id)} style={{padding:'6px 10px',border:'1px solid #fecaca',background:'#fff5f5',borderRadius:'8px',fontSize:'11px',fontWeight:700,color:'var(--red)',cursor:'pointer'}}>🗑️ 삭제</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 댓글 관리 ─────────────────────────────────────────────
function CommentAdmin() {
  const [notices,  setNotices]  = useState([])
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const loadNotices = useCallback(async () => {
    const { data } = await supabase.from('class_notices').select('id,title,created_at').order('created_at',{ascending:false})
    setNotices(data||[]); setLoading(false)
  }, [])
  const loadComments = useCallback(async (nid) => {
    if (!nid) { setComments([]); return }
    const { data } = await supabase.from('class_comments').select('*').eq('notice_id',nid).order('created_at')
    setComments(data||[])
  }, [])

  useEffect(() => { loadNotices() }, [loadNotices])
  useEffect(() => { loadComments(selected) }, [selected, loadComments])

  const del = async (id) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return
    setDeleting(id)
    try { await dbDelete('class_comments', id); setComments(p=>p.filter(c=>c.id!==id)) }
    catch(e) { alert('삭제 실패: '+e.message) }
    finally { setDeleting(null) }
  }
  const delAll = async () => {
    if (!confirm('이 공지의 모든 댓글을 삭제하시겠습니까?')) return
    try { await supabase.from('class_comments').delete().eq('notice_id',selected); setComments([]) }
    catch(e) { alert('삭제 실패: '+e.message) }
  }

  if (loading) return <Spin />

  return (
    <div>
      <SHdr title="댓글 관리" />
      <div style={{background:'#f5f3ff',borderRadius:'12px',padding:'12px 16px',marginBottom:'16px',fontSize:'13px',color:'#374151',display:'flex',alignItems:'center',gap:'8px'}}>
        <span>ℹ️</span><span>공지를 선택하면 해당 댓글을 관리할 수 있습니다</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <div>
          <p style={{fontSize:'11px',fontWeight:700,color:'var(--muted)',letterSpacing:'1px',marginBottom:'8px'}}>공지 선택</p>
          <div style={{maxHeight:'500px',overflowY:'auto'}}>
            {notices.map(n=>(
              <button key={n.id} onClick={()=>setSelected(n.id)} style={{
                width:'100%',textAlign:'left',padding:'10px 12px',
                border:'1.5px solid',borderRadius:'10px',cursor:'pointer',marginBottom:'6px',display:'block',transition:'all 0.15s',
                borderColor: selected===n.id ? 'var(--primary)' : 'var(--border)',
                background:  selected===n.id ? '#f5f3ff' : '#fff'
              }}>
                <p style={{fontSize:'13px',fontWeight:selected===n.id?700:500,color:selected===n.id?'var(--primary)':'var(--text)',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</p>
                <p style={{fontSize:'11px',color:'var(--muted)'}}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
            <p style={{fontSize:'11px',fontWeight:700,color:'var(--muted)',letterSpacing:'1px'}}>댓글 {comments.length>0?`(${comments.length}개)`:''}</p>
            {selected&&comments.length>0&&<button onClick={delAll} style={{fontSize:'11px',fontWeight:700,color:'var(--red)',background:'#fff5f5',border:'1px solid #fecaca',borderRadius:'6px',padding:'4px 10px',cursor:'pointer'}}>전체삭제</button>}
          </div>
          {!selected ? (
            <p style={{textAlign:'center',padding:'40px 0',color:'var(--muted)',fontSize:'13px'}}>← 공지를 선택해 주세요</p>
          ) : comments.length===0 ? (
            <p style={{textAlign:'center',padding:'40px 0',color:'var(--muted)',fontSize:'13px'}}>댓글이 없습니다</p>
          ) : (
            <div style={{maxHeight:'500px',overflowY:'auto'}}>
              {comments.map(c=>(
                <div key={c.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',padding:'11px 13px',marginBottom:'7px',boxShadow:'var(--shadow)',opacity:deleting===c.id?0.5:1,transition:'opacity 0.2s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                        <span style={{fontSize:'12px',fontWeight:700,color:'var(--primary)'}}>{c.author}</span>
                        <span style={{fontSize:'11px',color:'var(--muted)'}}>{new Date(c.created_at).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})} {new Date(c.created_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p style={{fontSize:'13px',color:'#374151',lineHeight:1.6,wordBreak:'break-all'}}>{c.body}</p>
                    </div>
                    <button onClick={()=>del(c.id)} disabled={deleting===c.id} style={{width:'28px',height:'28px',border:'1px solid #fecaca',background:'#fff5f5',borderRadius:'8px',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 공통 UI ──────────────────────────────────────────────
function SHdr({ title, onAdd }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
      <h2 style={{fontFamily:'Noto Serif KR',fontSize:'18px',fontWeight:700,color:'var(--primary)'}}>{title}</h2>
      {onAdd && <button onClick={onAdd} style={{padding:'8px 16px',background:'var(--primary)',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>+ 추가</button>}
    </div>
  )
}
function ARow({ left, sub, onEdit, onDel }) {
  return (
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',padding:'13px 14px',marginBottom:'8px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
        <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',flexWrap:'wrap',gap:'4px',overflow:'hidden'}}>{left}</div>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          <Ic onClick={onEdit}>✏️</Ic>
          <Ic onClick={onDel} danger>🗑️</Ic>
        </div>
      </div>
      {sub && <div style={{marginTop:'5px'}}>{sub}</div>}
    </div>
  )
}
function Ic({ children, onClick, danger }) {
  return <button onClick={onClick} style={{width:'32px',height:'32px',border:'1px solid var(--border)',background:danger?'#fff5f5':'#f7f5f2',borderRadius:'8px',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{children}</button>
}
function BRow({ onCancel, onSave, saving, editing, saveLabel }) {
  return (
    <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'8px'}}>
      <button onClick={onCancel} style={{...bStyle,background:'#fff',color:'var(--muted)',border:'1px solid var(--border)'}}>취소</button>
      <button onClick={onSave} disabled={saving} style={{...bStyle,background:'var(--primary)',color:'#fff',opacity:saving?0.7:1}}>
        {saving ? '저장 중...' : saveLabel || (editing ? '수정 완료' : '등록')}
      </button>
    </div>
  )
}
function FField({ label, children }) {
  return <div style={{marginBottom:'10px'}}><label style={{fontSize:'11px',fontWeight:700,color:'var(--muted)',display:'block',marginBottom:'4px',letterSpacing:'0.5px'}}>{label}</label>{children}</div>
}
function Tag({ children, color }) {
  return <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'20px',background:`${color}20`,color,flexShrink:0}}>{children}</span>
}
function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><div className="spinner" /></div> }
function Emp()  { return <div style={{textAlign:'center',padding:'40px 0',color:'var(--muted)',fontSize:'14px'}}>등록된 항목이 없습니다</div> }
