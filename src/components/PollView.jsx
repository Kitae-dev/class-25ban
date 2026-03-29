import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase.js'
import { getSessionId } from '../lib/session.js'
import { Empty, Spinner } from './NoticeView.jsx'

export default function PollView() {
  const [polls,   setPolls]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('open') // 'open' | 'closed'

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('class_polls').select(`
      *,
      class_poll_options ( id, label, sort_order ),
      class_poll_votes   ( id, option_id, session_id )
    `).order('created_at', { ascending:false })
    setPolls(data||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('poll-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'class_poll_votes' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const open   = polls.filter(p => !p.is_closed)
  const closed = polls.filter(p =>  p.is_closed)
  const list   = tab === 'open' ? open : closed

  return (
    <div>
      {/* Open/Closed toggle */}
      <div style={{ display:'flex', background:'#f0edff', borderRadius:'12px', padding:'3px', marginBottom:'16px' }}>
        {[['open','진행 중 🔥'],['closed','종료된 투표']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            flex:1, padding:'9px', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:700,
            background: tab===v ? 'var(--primary)' : 'transparent',
            color: tab===v ? '#fff' : 'var(--muted)',
            transition:'all 0.2s', cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner /> : list.length === 0 ? (
        <Empty text={tab==='open' ? '진행 중인 투표가 없습니다' : '종료된 투표가 없습니다'} />
      ) : (
        <div className="stagger">
          {list.map(poll => <PollCard key={poll.id} poll={poll} onVoteChange={load} />)}
        </div>
      )}
    </div>
  )
}

function PollCard({ poll, onVoteChange }) {
  const sid      = getSessionId()
  const options  = [...(poll.class_poll_options||[])].sort((a,b)=>a.sort_order-b.sort_order)
  const votes    = poll.class_poll_votes || []
  const myVotes  = new Set(votes.filter(v=>v.session_id===sid).map(v=>v.option_id))
  const hasVoted = myVotes.size > 0
  const total    = votes.length

  // 옵션별 득표수
  const countFor = (optId) => votes.filter(v=>v.option_id===optId).length

  const vote = async (optId) => {
    if (poll.is_closed) return
    if (!poll.is_multiple) {
      // 단일 선택: 이미 같은 거 투표했으면 취소, 다른 거면 기존 취소 후 신규
      if (myVotes.has(optId)) {
        await supabase.from('class_poll_votes').delete()
          .eq('poll_id', poll.id).eq('option_id', optId).eq('session_id', sid)
      } else {
        // 기존 투표 취소
        if (myVotes.size > 0) {
          await supabase.from('class_poll_votes').delete()
            .eq('poll_id', poll.id).eq('session_id', sid)
        }
        await supabase.from('class_poll_votes').insert({ poll_id:poll.id, option_id:optId, session_id:sid })
      }
    } else {
      // 복수 선택
      if (myVotes.has(optId)) {
        await supabase.from('class_poll_votes').delete()
          .eq('poll_id', poll.id).eq('option_id', optId).eq('session_id', sid)
      } else {
        await supabase.from('class_poll_votes').insert({ poll_id:poll.id, option_id:optId, session_id:sid })
      }
    }
    onVoteChange()
  }

  const date = new Date(poll.created_at).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})
  const maxCount = Math.max(...options.map(o=>countFor(o.id)), 1)

  return (
    <div style={{
      background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius)',
      marginBottom:'14px', boxShadow:'var(--shadow)', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: poll.is_closed
          ? 'linear-gradient(135deg, #6b7280, #4b5563)'
          : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        padding:'16px 18px'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
          <span style={{
            fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px',
            background:'rgba(255,255,255,0.2)', color:'#fff'
          }}>{poll.is_multiple ? '복수선택' : '단일선택'}</span>
          {poll.is_closed && (
            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:'rgba(255,255,255,0.2)', color:'#fff' }}>🔒 마감</span>
          )}
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', marginLeft:'auto' }}>{date}</span>
        </div>
        <h3 style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'4px' }}>{poll.title}</h3>
        {poll.description && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>{poll.description}</p>}
        <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'6px' }}>총 {total}표</p>
      </div>

      {/* Options */}
      <div style={{ padding:'14px 16px' }}>
        {options.map(opt => {
          const count   = countFor(opt.id)
          const pct     = total > 0 ? Math.round(count/total*100) : 0
          const isMyVote= myVotes.has(opt.id)
          const isWinner= !poll.is_closed && count === maxCount && count > 0

          return (
            <button key={opt.id} onClick={() => vote(opt.id)} disabled={poll.is_closed}
              style={{
                width:'100%', textAlign:'left', padding:'11px 14px',
                border:`2px solid ${isMyVote ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius:'10px', marginBottom:'8px', cursor: poll.is_closed ? 'default' : 'pointer',
                background: isMyVote ? 'var(--primary-light)' : '#fff',
                position:'relative', overflow:'hidden', transition:'all 0.2s'
              }}>
              {/* Progress bar bg */}
              {(hasVoted || poll.is_closed) && (
                <div style={{
                  position:'absolute', left:0, top:0, bottom:0,
                  width:`${pct}%`, background: isMyVote ? 'rgba(124,58,237,0.12)' : 'rgba(0,0,0,0.04)',
                  transition:'width 0.5s ease', borderRadius:'8px'
                }} />
              )}
              <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {isMyVote && <span style={{ fontSize:'14px' }}>✅</span>}
                  <span style={{ fontSize:'14px', fontWeight: isMyVote ? 700 : 500, color: isMyVote ? 'var(--primary)' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  {isWinner && <span style={{ fontSize:'11px' }}>🏆</span>}
                </div>
                {(hasVoted || poll.is_closed) && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color: isMyVote ? 'var(--primary)' : 'var(--muted)' }}>{pct}%</span>
                    <span style={{ fontSize:'11px', color:'var(--muted)' }}>({count}표)</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}

        {!poll.is_closed && !hasVoted && (
          <p style={{ fontSize:'12px', color:'var(--muted)', textAlign:'center', marginTop:'4px' }}>
            {poll.is_multiple ? '여러 개 선택 가능합니다' : '항목을 눌러 투표하세요'}
          </p>
        )}
        {!poll.is_closed && hasVoted && (
          <p style={{ fontSize:'12px', color:'var(--primary)', textAlign:'center', fontWeight:600, marginTop:'4px' }}>
            ✅ 투표 완료! (항목을 다시 누르면 취소됩니다)
          </p>
        )}
      </div>
    </div>
  )
}
