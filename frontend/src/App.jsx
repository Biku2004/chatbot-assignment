import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { NhostProvider } from '@nhost/react'
import { NhostApolloProvider } from '@nhost/react-apollo'
import { nhost } from './lib/nhost'
import { useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { testChatbot, runTests, testN8nWorkflow } from './lib/testChatbot'
import { ThemeProvider } from './contexts/ThemeContext'

import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import Header from './components/Layout/Header'
import ChatList from './components/Chat/ChatList'
import ChatWindow from './components/Chat/ChatWindow'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedChatId, setSelectedChatId] = useState(null)

  // Make test functions available globally for debugging
  useEffect(() => {
    window.testChatbot = (chatId) => testChatbot(nhost, chatId)
    window.runTests = runTests
    window.testN8nWorkflow = testN8nWorkflow
    console.log('🧪 Test functions available:')
    console.log('- window.testChatbot(chatId) - Test chatbot functionality')
    console.log('- window.runTests() - Show test instructions')
    console.log('- window.testN8nWorkflow(chatId, message) - Test n8n workflow directly')
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex h-screen pt-16">
        <ChatList 
          selectedChatId={selectedChatId} 
          onChatSelect={setSelectedChatId} 
        />
        <ChatWindow chatId={selectedChatId} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <NhostProvider nhost={nhost}>
        <NhostApolloProvider nhost={nhost}>
          <AppContent />
        </NhostApolloProvider>
      </NhostProvider>
    </ThemeProvider>
  )
}