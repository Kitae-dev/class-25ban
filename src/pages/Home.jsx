import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import supabase from '../lib/supabase.js'
import NoticeView   from '../components/NoticeView.jsx'
import PollView     from '../components/PollView.jsx'
import HomeworkView from '../components/HomeworkView.jsx'

const TABS = [
  { id:'notice',   label:'공지',  icon:'📢', path:'/'         },
  { id:'homework', label:'과제',  icon:'📚', path:'/homework' },
  { id:'poll',     label:'투표',  icon:'🗳️', path:'/poll'     },
]

export default function Home() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const last = localStorage.getItem('class_last_seen') || '2000-01-01'
    supabase.from('class_notices').select('id', { count:'exact' })
      .gt('created_at', last)
      .then(({ count }) => setUnread(count || 0))
  }, [])

  const active = TABS.find(t =>
    t.path === location.pathname ||
    (t.path !== '/' && location.pathname.startsWith(t.path))
  ) || TABS[0]

  const handleTab = (tab) => {
    if (tab.id === 'notice') {
      localStorage.setItem('class_last_seen', new Date().toISOString())
      setUnread(0)
    }
    navigate(tab.path)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100dvh' }}>
      {/* Header */}
      <header style={{
        background:'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        position:'sticky', top:0, zIndex:100,
        boxShadow:'0 2px 16px rgba(91,33,182,0.3)'
      }}>
        <div style={{ maxWidth:'640px', margin:'0 auto', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{
              width:'40px', height:'40px', background:'rgba(255,255,255,0.15)',
              borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px'
            }}>🎓</div>
            <div>
              <h1 style={{ fontFamily:'Noto Serif KR', fontSize:'16px', fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>
                숙명여중 2학년 5반
              </h1>
              <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'1px' }}>학급 소통 앱</p>
            </div>
          </div>
          <button onClick={() => navigate('/admin/login')} style={{
            background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
            borderRadius:'10px', padding:'7px 12px', color:'#fff', fontSize:'12px', fontWeight:600
          }}>반장 🔑</button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex:1, maxWidth:'640px', margin:'0 auto', width:'100%', padding:'16px 14px 80px' }}>
        <Routes>
          <Route path="/"         element={<NoticeView />} />
          <Route path="/homework" element={<HomeworkView />} />
          <Route path="/poll"     element={<PollView />} />
        </Routes>
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'#fff', borderTop:'1px solid var(--border)',
        display:'flex', zIndex:100,
        paddingBottom:'env(safe-area-inset-bottom)',
        boxShadow:'0 -4px 20px rgba(0,0,0,0.06)'
      }}>
        {TABS.map(tab => {
          const isActive = active.id === tab.id
          return (
            <button key={tab.id} onClick={() => handleTab(tab)} style={{
              flex:1, padding:'10px 4px 8px', background:'none', border:'none',
              display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              transition:'color 0.2s', position:'relative'
            }}>
              <span style={{ fontSize:'22px', position:'relative' }}>
                {tab.icon}
                {tab.id === 'notice' && unread > 0 && (
                  <span style={{
                    position:'absolute', top:'-4px', right:'-6px',
                    background:'var(--red)', color:'#fff',
                    fontSize:'9px', fontWeight:700, width:'16px', height:'16px',
                    borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'
                  }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </span>
              <span style={{ fontSize:'10px', fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
              {isActive && (
                <span style={{
                  position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
                  width:'32px', height:'2px', background:'var(--primary)', borderRadius:'2px'
                }} />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
