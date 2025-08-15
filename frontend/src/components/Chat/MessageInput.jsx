import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { SEND_MESSAGE, SEND_MESSAGE_ACTION, GET_MESSAGES, SEND_MESSAGE_WITH_BOT_RESPONSE, SAVE_BOT_RESPONSE, UPDATE_CHAT_TITLE } from '../../lib/graphql'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function MessageInput({ chatId, onMessageSent, chatTitle, isFirstMessage = false }) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [botResponse, setBotResponse] = useState('')

  const [sendMessage] = useMutation(SEND_MESSAGE)
  const [sendMessageAction] = useMutation(SEND_MESSAGE_ACTION)
  const [sendMessageWithBotResponse] = useMutation(SEND_MESSAGE_WITH_BOT_RESPONSE)
  const [saveBotResponse] = useMutation(SAVE_BOT_RESPONSE)
  const [updateChatTitle] = useMutation(UPDATE_CHAT_TITLE)
  
  // Add a query to manually check messages after sending
  const { refetch: refetchMessages } = useQuery(GET_MESSAGES, {
    variables: { chatId },
    skip: !chatId
  })

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
    
    // Ensure proper table formatting - fix broken table headers
    output = output.replace(/\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g, (match, col1, col2, col3, col4, col5) => {
      return `|${col1.trim()}|${col2.trim()}|${col3.trim()}|${col4.trim()}|${col5.trim()}|`
    })
    
    // Fix table separators that might be broken
    output = output.replace(/\n\s*[-|]+\s*\n/g, '\n| --- | --- | --- | --- | --- |\n')
    
    // Ensure proper spacing around table cells
    output = output.replace(/\|([^|]*)\|/g, (match, content) => {
      return `| ${content.trim()} |`
    })
    
    // Fix broken table rows that don't start with |
    output = output.replace(/\n([^|][^|\n]*)\|/g, '\n| $1|')
    
    // Collapse more than 3 newlines
    output = output.replace(/\n{3,}/g, '\n\n')
    
    return output.trim()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const messageContent = message.trim()
    setMessage('')
    setIsLoading(true)
    setError('')
    setBotResponse('')

    try {
      // Validate and format chatId for UUID type
      let chatIdUuid
      
      if (typeof chatId === 'string') {
        chatIdUuid = chatId.trim()
      } else if (chatId != null) {
        chatIdUuid = String(chatId).trim()
      } else {
        throw new Error('Chat ID is required')
      }
      
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(chatIdUuid)) {
        throw new Error(`Invalid UUID format: ${chatIdUuid}`)
      }
      
      console.log('Original chatId:', chatId, 'type:', typeof chatId)
      console.log('Formatted UUID:', chatIdUuid, 'valid:', uuidRegex.test(chatIdUuid))
      
      // First, save the user message
      console.log('Saving user message...')
      const messageResult = await sendMessage({
        variables: {
          chatId: chatIdUuid,
          content: messageContent
        }
      })
      
      console.log('sendMessage result:', messageResult)

      // Update chat title from first message if it's still "New Chat"
      if (isFirstMessage && chatTitle === 'New Chat') {
        try {
          const title = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent
          await updateChatTitle({
            variables: { chatId: chatIdUuid, title }
          })
        } catch (titleError) {
          console.warn('Failed to update chat title:', titleError)
        }
      }

      // Then trigger the chatbot action
      try {
        console.log('Sending to GraphQL action:', {
          chatId: chatIdUuid,
          message: messageContent
        })
        
        const actionResult = await sendMessageAction({
          variables: {
            chatId: chatIdUuid,
            message: messageContent
          },
          errorPolicy: 'all'
        })

        console.log('n8n Action Result:', actionResult)
        
        // Handle the response based on the actual structure
        if (actionResult.data?.sendMessage) {
          const response = actionResult.data.sendMessage
          console.log('Bot response received:', response)
          
          if (response.success) {
            // Show the actual bot response content
            const responseContent = response.response || response.message || 'Bot responded successfully'
            setBotResponse(responseContent)
            console.log('Bot response content:', responseContent)
            
            // Ensure bot response is saved to database
            try {
              console.log('Ensuring bot response is saved...')
              const saveResult = await saveBotResponse({
                variables: {
                  chatId: chatIdUuid,
                  content: responseContent
                }
              })
              console.log('Save result:', saveResult)
              
              // If successful, immediately refetch messages
              if (saveResult.data?.insert_messages_one?.id) {
                console.log('Messages saved successfully, refetching...')
                const refetchResult = await refetchMessages()
                console.log('Refetch result:', refetchResult)
                if (onMessageSent) {
                  onMessageSent()
                }
              }
            } catch (saveError) {
              console.warn('Failed to save in transaction, trying individual save:', saveError)
              
              // Fallback: try to save bot response individually
              try {
                const individualSaveResult = await saveBotResponse({
                  variables: {
                    chatId: chatIdUuid,
                    content: responseContent
                  }
                })
                console.log('Individual save result:', individualSaveResult)
                
                // Refetch after individual save
                setTimeout(async () => {
                  try {
                    console.log('Refetching after individual save...')
                    const refetchResult = await refetchMessages()
                    console.log('Refetch result:', refetchResult)
                    if (onMessageSent) {
                      onMessageSent()
                    }
                  } catch (refetchError) {
                    console.error('Error refetching messages:', refetchError)
                  }
                }, 1000)
              } catch (individualSaveError) {
                console.error('Failed to save bot response individually:', individualSaveError)
                setError('Bot response received but failed to save to database')
              }
            }
            
          } else {
            console.warn('Bot action failed:', response.message)
            setError('Bot response failed: ' + (response.message || 'Unknown error'))
          }
        } else if (actionResult.errors) {
          console.error('GraphQL errors in action:', actionResult.errors)
          setError('Failed to get bot response: ' + actionResult.errors[0]?.message)
        }
        
      } catch (webhookError) {
        console.error('Full webhook error:', webhookError)
        console.error('GraphQL errors:', webhookError.graphQLErrors)
        console.error('Network error:', webhookError.networkError)
        console.warn('Webhook action failed, but user message was saved')
        setError('Failed to get bot response. Please try again.')
      }
      
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message: ' + err.message)
      console.error('GraphQL error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        originalChatId: chatId,
        originalChatIdType: typeof chatId,
        formattedChatId: typeof chatId === 'string' ? chatId.trim() : String(chatId).trim(),
        messageContent: messageContent
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      {error && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded text-sm">
          {error}
        </div>
      )}
      {/* {botResponse && (
        <div className="mb-2 p-2 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
          <strong>Bot Response:</strong>
          <div className="mt-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                // Table components with enhanced styling
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full border-collapse bg-white" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100" {...props} />
                ),
                th: (props) => (
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800 uppercase tracking-wide" {...props} />
                ),
                td: (props) => (
                  <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-700" {...props} />
                ),
                tr: (props) => (
                  <tr className="hover:bg-gray-50 transition-colors duration-150" {...props} />
                ),

                // Code blocks with syntax highlighting support
                pre: ({ children, ...props }) => (
                  <div className="relative my-4">
                    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto shadow-lg border border-gray-700" {...props}>
                      {children}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <button className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>
                ),
                code: ({ inline, className, children, ...props }) => {
                  if (inline) {
                    return (
                      <code 
                        className="bg-gray-100 text-red-600 rounded px-2 py-1 text-sm font-mono border" 
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code 
                      className={`block bg-gray-900 text-gray-100 rounded p-2 text-sm font-mono ${className || ''}`} 
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },

                // Enhanced typography
                p: (props) => (
                  <p className="my-3 text-gray-700 leading-relaxed" {...props} />
                ),
                
                // Enhanced lists
                ul: (props) => (
                  <ul className="list-disc list-inside my-3 space-y-2 pl-4" {...props} />
                ),
                ol: (props) => (
                  <ol className="list-decimal list-inside my-3 space-y-2 pl-4" {...props} />
                ),
                li: (props) => (
                  <li className="text-gray-700 leading-relaxed" {...props} />
                ),

                // Improved headings with better hierarchy
                h1: (props) => (
                  <h1 className="text-3xl font-bold my-6 text-gray-900 border-b-2 border-blue-500 pb-2" {...props} />
                ),
                h2: (props) => (
                  <h2 className="text-2xl font-semibold my-5 text-gray-800 border-b border-gray-300 pb-1" {...props} />
                ),
                h3: (props) => (
                  <h3 className="text-xl font-medium my-4 text-gray-800" {...props} />
                ),
                h4: (props) => (
                  <h4 className="text-lg font-medium my-3 text-gray-700" {...props} />
                ),
                h5: (props) => (
                  <h5 className="text-base font-medium my-2 text-gray-700" {...props} />
                ),
                h6: (props) => (
                  <h6 className="text-sm font-medium my-2 text-gray-600 uppercase tracking-wide" {...props} />
                ),

                // Links with better styling
                a: (props) => (
                  <a 
                    className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors duration-200" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    {...props} 
                  />
                ),

                // Blockquotes
                blockquote: (props) => (
                  <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700 rounded-r" {...props} />
                ),

                // Horizontal rules
                hr: (props) => (
                  <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" {...props} />
                ),

                // Images with responsive handling
                img: (props) => (
                  <div className="my-4">
                    <img 
                      className="max-w-full h-auto rounded-lg shadow-md border border-gray-200 mx-auto" 
                      loading="lazy"
                      {...props} 
                    />
                  </div>
                ),

                // Definition lists (if using extensions)
                dl: (props) => (
                  <dl className="my-4 space-y-2" {...props} />
                ),
                dt: (props) => (
                  <dt className="font-semibold text-gray-800" {...props} />
                ),
                dd: (props) => (
                  <dd className="ml-4 text-gray-700" {...props} />
                ),

                // Task lists (checkboxes)
                input: (props) => (
                  <input 
                    className="mr-2 accent-blue-500" 
                    disabled 
                    {...props} 
                  />
                ),

                // Strikethrough
                del: (props) => (
                  <del className="text-gray-500 line-through" {...props} />
                ),

                // Strong and emphasis
                strong: (props) => (
                  <strong className="font-semibold text-gray-900" {...props} />
                ),
                em: (props) => (
                  <em className="italic text-gray-700" {...props} />
                ),

                // Keyboard shortcuts
                kbd: (props) => (
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-200 border border-gray-300 rounded shadow-sm" {...props} />
                ),

                // Abbreviations
                abbr: (props) => (
                  <abbr className="border-b border-dotted border-gray-400 cursor-help" {...props} />
                ),

                // Superscript and subscript
                sup: (props) => (
                  <sup className="text-xs align-super" {...props} />
                ),
                sub: (props) => (
                  <sub className="text-xs align-sub" {...props} />
                ),

                // Details and summary (collapsible sections)
                details: (props) => (
                  <details className="my-4 border border-gray-200 rounded-lg" {...props} />
                ),
                summary: (props) => (
                  <summary className="px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors font-medium" {...props} />
                ),

                // Wrapper for details content and other divs
                div: ({ className, ...props }) => {
                  if (className?.includes('details-content')) {
                    return <div className="px-4 py-2" {...props} />
                  }
                  return <div className={className} {...props} />
                },

                // Mark (highlighted text)
                mark: (props) => (
                  <mark className="bg-yellow-200 px-1 rounded" {...props} />
                ),

                // Small text
                small: (props) => (
                  <small className="text-xs text-gray-600" {...props} />
                ),

                // Cite elements
                cite: (props) => (
                  <cite className="italic text-gray-600 font-medium not-italic" {...props} />
                ),

                // Quote elements
                q: (props) => (
                  <q className="italic text-gray-700" {...props} />
                ),

                // Time elements
                time: (props) => (
                  <time className="text-gray-600 font-mono text-sm" {...props} />
                ),

                // Address elements
                address: (props) => (
                  <address className="italic text-gray-700 border-l-2 border-gray-300 pl-3 my-2 not-italic" {...props} />
                ),

                // Span with special handling for inline elements
                span: ({ className, ...props }) => {
                  // Handle different span types based on className
                  if (className && className.includes('math')) {
                    return <span className="font-mono bg-gray-100 px-1 rounded" {...props} />
                  }
                  if (className && className.includes('highlight')) {
                    return <span className="bg-yellow-200 px-1 rounded" {...props} />
                  }
                  return <span className={className} {...props} />
                },

                // Article, section, aside for semantic HTML
                article: (props) => (
                  <article className="prose max-w-none" {...props} />
                ),
                section: (props) => (
                  <section className="my-6" {...props} />
                ),
                aside: (props) => (
                  <aside className="border-l-4 border-blue-200 bg-blue-50 p-4 my-4 rounded-r" {...props} />
                ),

                // Header and footer
                header: (props) => (
                  <header className="border-b border-gray-200 pb-4 mb-6" {...props} />
                ),
                footer: (props) => (
                  <footer className="border-t border-gray-200 pt-4 mt-6 text-sm text-gray-600" {...props} />
                ),

                // Figure and figcaption
                figure: (props) => (
                  <figure className="my-6 text-center" {...props} />
                ),
                figcaption: (props) => (
                  <figcaption className="text-sm text-gray-600 mt-2 italic" {...props} />
                ),

                // Tables with caption
                caption: (props) => (
                  <caption className="text-sm text-gray-700 font-medium mb-2 text-left" {...props} />
                ),

                // Table groups
                tbody: (props) => (
                  <tbody className="divide-y divide-gray-200" {...props} />
                ),
                tfoot: (props) => (
                  <tfoot className="bg-gray-50 font-medium" {...props} />
                ),

                // Code language indicators
                ['code[className*="language-"]']: ({ className, children, ...props }) => {
                  const language = className?.match(/language-(\w+)/)?.[1];
                  return (
                    <div className="relative">
                      {language && (
                        <div className="absolute top-2 left-2 text-xs text-gray-400 font-mono uppercase">
                          {language}
                        </div>
                      )}
                      <code className={`block bg-gray-900 text-gray-100 rounded p-4 pt-8 text-sm font-mono overflow-x-auto ${className || ''}`} {...props}>
                        {children}
                      </code>
                    </div>
                  );
                }
              }}
            >
              {normalizeBotMarkdown(botResponse)}
            </ReactMarkdown>
          </div>
        </div>
      )} */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}