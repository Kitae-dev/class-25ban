import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase.js'
import { Label, Empty, Spinner } from './NoticeView.jsx'

const SUB_CATS = [
  { value:'homework',    label:'과제',    icon:'📚', color:'#2563eb', bg:'#dbeafe' },
  { value:'supplies',    label:'준비물',  icon:'🎒', color:'#059669', bg:'#d1fae5' },
  { value:'performance', label:'수행평가', icon:'📝', color:'#dc2626', bg:'#fee2e2' },
]

export default function HomeworkView() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('homework')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('class_notices')
      .select('*')
      .in('category', ['homework','supplies','performance'])
      .order('created_at', { ascending:false })
    setItems(data||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i => i.category === tab)
  const meta = SUB_CATS.find(c => c.value === tab)

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        {SUB_CATS.map(c => (
          <button key={c.value} onClick={() => setTab(c.value)} style={{
            flex:1, padding:'10px 4px', borderRadius:'12px', fontSize:'12px', fontWeight:700,
            border:'2px solid', cursor:'pointer', transition:'all 0.15s',
            borderColor: tab===c.value ? c.color : 'var(--border)',
            background:  tab===c.value ? c.color : '#fff',
            color:       tab===c.value ? '#fff'  : 'var(--muted)',
          }}>{c.icon}<br />{c.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty text={`등록된 ${meta?.label}이 없습니다`} />
      ) : (
        <div className="stagger">
          {filtered.map(item => <HomeworkCard key={item.id} item={item} meta={meta} />)}
        </div>
      )}
    </div>
  )
}

function HomeworkCard({ item, meta }) {
  const [done, setDone] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('class_done') || '{}')
    return !!saved[item.id]
  })

  const toggleDone = (e) => {
    e.stopPropagation()
    const saved = JSON.parse(localStorage.getItem('class_done') || '{}')
    if (done) delete saved[item.id]; else saved[item.id] = true
    localStorage.setItem('class_done', JSON.stringify(saved))
    setDone(!done)
  }

  const date = new Date(item.created_at).toLocaleDateString('ko-KR', { month:'long', day:'numeric' })

  return (
    <div style={{
      background: done ? '#f9fafb' : '#fff',
      border:'1px solid var(--border)', borderRadius:'var(--radius)',
      padding:'16px 18px', marginBottom:'10px', boxShadow:'var(--shadow)',
      borderLeft:`4px solid ${done ? 'var(--border)' : meta?.color}`,
      opacity: done ? 0.7 : 1, transition:'all 0.2s'
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
        {/* 완료 체크박스 */}
        <button onClick={toggleDone} style={{
          width:'24px', height:'24px', borderRadius:'6px', border:`2px solid ${done ? meta?.color : 'var(--border)'}`,
          background: done ? meta?.color : '#fff', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, marginTop:'2px', cursor:'pointer', transition:'all 0.2s'
        }}>
          {done && <span style={{ color:'#fff', fontSize:'13px', fontWeight:900 }}>✓</span>}
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px', flexWrap:'wrap' }}>
            {item.subject && (
              <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'20px', background:meta?.bg, color:meta?.color }}>{item.subject}</span>
            )}
            <span style={{ fontSize:'11px', color:'var(--muted)', marginLeft:'auto' }}>{date}</span>
          </div>
          <h3 style={{ fontSize:'15px', fontWeight:700, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--text)', marginBottom:'6px' }}>
            {item.title}
          </h3>
          <p style={{ fontSize:'13px', color: done ? 'var(--muted)' : '#4b5563', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{item.body}</p>
          {item.due_date && (
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'8px' }}>
              <span style={{ fontSize:'12px', color: done ? 'var(--muted)' : 'var(--red)', fontWeight:700 }}>⏰ 마감: {item.due_date}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
