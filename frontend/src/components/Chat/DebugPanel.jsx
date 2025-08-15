import { useState, useEffect } from 'react'

export default function DebugPanel({ chatId, messages, lastAction }) {
  const [isOpen, setIsOpen] = useState(false)
  const [debugLog, setDebugLog] = useState([])

  useEffect(() => {
    if (lastAction) {
      setDebugLog(prev => [...prev, { timestamp: new Date().toISOString(), action: lastAction }])
    }
  }, [lastAction])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug Panel"
      >
        🐛
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div>
          <strong>Chat ID:</strong> {chatId || 'None'}
        </div>
        
        <div>
          <strong>Messages Count:</strong> {messages?.length || 0}
        </div>
        
        <div>
          <strong>Last Messages:</strong>
          <div className="mt-1 space-y-1">
            {messages?.slice(-3).map((msg, idx) => (
              <div key={idx} className="text-xs bg-gray-100 p-1 rounded">
                <div><strong>{msg.role}:</strong> {msg.content.substring(0, 50)}...</div>
                <div className="text-gray-500">{new Date(msg.created_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <strong>Recent Actions:</strong>
          <div className="mt-1 space-y-1">
            {debugLog.slice(-5).map((log, idx) => (
              <div key={idx} className="text-xs bg-blue-100 p-1 rounded">
                <div>{log.action}</div>
                <div className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setDebugLog([])}
          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
        >
          Clear Log
        </button>
      </div>
    </div>
  )
}
