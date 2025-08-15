import { useState } from 'react'

export default function ChatBox({ title, children, isOpen = true, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(isOpen)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    if (onToggle) onToggle(!isExpanded)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  )
}
