'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        marginLeft: 'auto',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '8px 18px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      🖨 Print / Export PDF
    </button>
  )
}
