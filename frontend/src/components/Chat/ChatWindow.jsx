import { useSubscription, useQuery } from '@apollo/client'
import { MESSAGES_SUBSCRIPTION, GET_MESSAGES, GET_CHATS } from '../../lib/graphql'
import { useEffect, useRef, useCallback, useState } from 'react'
import MessageInput from './MessageInput'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import DebugPanel from './DebugPanel'

export default function ChatWindow({ chatId }) {
  const messagesEndRef = useRef(null)
  const [lastAction, setLastAction] = useState('')
  
  // Ensure chatId is properly formatted as UUID string
  const chatIdString = chatId ? String(chatId).trim() : null
  console.log("ChatWindow - chatId:", chatIdString)

  // Query to get initial messages
  const { data: queryData, loading: queryLoading, error: queryError, refetch: refetchMessages } = useQuery(GET_MESSAGES, {
    variables: { chatId: chatIdString },
    skip: !chatIdString,
    fetchPolicy: 'cache-and-network'
  })

  // Query to get chat details for title
  const { data: chatData } = useQuery(GET_CHATS, {
    skip: !chatIdString
  })

  // Subscription for real-time updates
  const { data: subscriptionData, loading: subscriptionLoading, error: subscriptionError } = useSubscription(MESSAGES_SUBSCRIPTION, {
    variables: { chatId: chatIdString },
    skip: !chatIdString,
    onError: (err) => {
      console.error('Subscription error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        variables: { chatId: chatIdString }
      })
      setLastAction(`Subscription error: ${err.message}`)
    },
    onData: ({ data }) => {
      console.log('Subscription data received:', data)
      setLastAction('Subscription data received')
    }
  })

  // Use subscription data if available, otherwise fall back to query data
  const messages = subscriptionData?.messages || queryData?.messages || []
  const loading = queryLoading || subscriptionLoading
  const error = queryError || subscriptionError

  // Get chat title and check if it's the first message
  const currentChat = chatData?.chats?.find(chat => chat.id === chatIdString)
  const chatTitle = currentChat?.title || 'New Chat'
  const isFirstMessage = messages.length === 0

  // Light normalization for AI responses that use custom separators
  const normalizeBotMarkdown = (text) => {
    if (!text || typeof text !== 'string') return text
    let output = text
    // HTML breaks to Markdown hard-breaks
    output = output.replace(/<br\s*\/?>(\s*)/gi, '  \n')
    // Double pipes used as separators → new paragraphs
    output = output.replace(/\s*\|\|\s*/g, '\n\n')
    // Single pipes with surrounding spaces that act as dividers → new line
    output = output.replace(/\s*\|\s*\|\s*/g, '\n\n')
    // Convert unicode bullet to Markdown dash
    output = output.replace(/[•·]\s?/g, '- ')
    // Fix headings that come prefixed by dashes from the model
    output = output.replace(/\n\s*---+\s*(#+)/g, '\n\n$1')
    // Collapse more than 3 newlines
    output = output.replace(/\n{3,}/g, '\n\n')
    return output.trim()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMessageSent = useCallback(async () => {
    console.log('Message sent, refetching...')
    setLastAction('Message sent, refetching messages')
    try {
      await refetchMessages()
      setLastAction('Messages refetched successfully')
    } catch (error) {
      console.error('Error refetching messages:', error)
      setLastAction(`Refetch error: ${error.message}`)
    }
  }, [refetchMessages])

  useEffect(() => {
    console.log('Messages data updated:', messages)
    setLastAction(`Messages updated: ${messages.length} messages`)
    scrollToBottom()
  }, [messages])

  if (!chatIdString) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Select a chat to start messaging</p>
      </div>
    )
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
    </div>
  )
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-red-600 dark:text-red-400">Error loading messages: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{chatTitle}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 whitespace-pre-wrap overflow-x-auto prose prose-sm dark:prose-invert'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-gray-100 dark:bg-gray-700" {...props} />
                        ),
                        th: (props) => (
                          <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300" {...props} />
                        ),
                        td: (props) => (
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" {...props} />
                        ),
                        tr: (props) => (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700" {...props} />
                        ),
                        pre: (props) => (
                          <pre className="bg-gray-100 dark:bg-gray-800 rounded p-3 overflow-x-auto my-2 text-sm" {...props} />
                        ),
                        code: ({ inline, className, children, ...props }) => {
                          if (inline) {
                            return <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm" {...props}>{children}</code>
                          }
                          return <code className={`bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm ${className || ''}`} {...props}>{children}</code>
                        },
                        p: (props) => (
                          <p className="my-2" {...props} />
                        ),
                        ul: (props) => (
                          <ul className="list-disc list-inside my-2 space-y-1" {...props} />
                        ),
                        ol: (props) => (
                          <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
                        ),
                        li: (props) => (
                          <li className="text-sm" {...props} />
                        ),
                        h1: (props) => (
                          <h1 className="text-xl font-bold my-3" {...props} />
                        ),
                        h2: (props) => (
                          <h2 className="text-lg font-semibold my-2" {...props} />
                        ),
                        h3: (props) => (
                          <h3 className="text-base font-medium my-2" {...props} />
                        )
                      }}
                    >
                      {normalizeBotMarkdown(message.content)}
                    </ReactMarkdown>
                  </div>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput 
        chatId={chatIdString} 
        onMessageSent={handleMessageSent}
        chatTitle={chatTitle}
        isFirstMessage={isFirstMessage}
      />
      <DebugPanel chatId={chatIdString} messages={messages} lastAction={lastAction} />
    </div>
  )
}