import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAdmin } from '../lib/adminAuth.jsx'

export default function LoginPage() {
  const { login, isAdmin } = useAdmin()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  if (isAdmin) return <Navigate to="/admin" replace />

  const handle = (e) => {
    e.preventDefault()
    if (!login(pw)) setErr('비밀번호가 올바르지 않습니다')
    else navigate('/admin')
  }

  return (
    <div style={{
      minHeight:'100dvh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'var(--bg)', padding:'24px'
    }}>
      <div style={{
        background:'#fff', borderRadius:'20px', padding:'40px 32px',
        width:'100%', maxWidth:'360px', boxShadow:'var(--shadow-lg)'
      }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'44px', marginBottom:'10px' }}>🔐</div>
          <h1 style={{ fontFamily:'Noto Serif KR', fontSize:'20px', color:'var(--primary)' }}>반장 관리자 로그인</h1>
          <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'6px' }}>숙명여중 2학년 5반</p>
        </div>
        <form onSubmit={handle}>
          <input
            type="password" placeholder="관리자 비밀번호" value={pw}
            onChange={e => { setPw(e.target.value); setErr('') }}
            style={{
              width:'100%', padding:'14px 16px', border:'1.5px solid var(--border)',
              borderRadius:'10px', fontSize:'15px', outline:'none', marginBottom:'4px'
            }}
          />
          {err && <p style={{ color:'var(--red)', fontSize:'13px', marginBottom:'8px' }}>{err}</p>}
          <button type="submit" style={{
            width:'100%', padding:'14px', background:'var(--primary)',
            color:'#fff', border:'none', borderRadius:'10px',
            fontSize:'15px', fontWeight:'700', marginTop:'12px'
          }}>로그인</button>
        </form>
        <button onClick={() => navigate('/')} style={{
          width:'100%', padding:'12px', background:'none', border:'none',
          color:'var(--muted)', fontSize:'13px', marginTop:'12px', cursor:'pointer'
        }}>← 학생 화면으로 돌아가기</button>
      </div>
    </div>
  )
}
