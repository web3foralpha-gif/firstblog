'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', background:'#faf8f5' }}>
      <div style={{ textAlign:'center', padding:'40px 20px' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <h2 style={{ fontSize:20, color:'#221e1a', marginBottom:8 }}>出了点问题</h2>
        <p style={{ fontSize:14, color:'#a89880', marginBottom:24 }}>{error.message || '页面加载失败'}</p>
        <button onClick={reset} style={{ padding:'10px 24px', borderRadius:12, background:'#221e1a', color:'#fff', border:'none', cursor:'pointer', fontSize:14 }}>重试</button>
      </div>
    </div>
  )
}
