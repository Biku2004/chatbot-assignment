import { useQuery, useMutation } from '@apollo/client'
import { GET_CHATS, CREATE_CHAT, DELETE_CHAT, UPDATE_CHAT_TITLE } from '../../lib/graphql'
import { useState, useEffect } from 'react'
import ChatBox from './ChatBox'

export default function ChatList({ selectedChatId, onChatSelect }) {
  const [newChatTitle, setNewChatTitle] = useState('')
  const [showNewChatForm, setShowNewChatForm] = useState(false)
  const [editingChatId, setEditingChatId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data, loading, error, refetch } = useQuery(GET_CHATS)
  const [createChat, { loading: creating }] = useMutation(CREATE_CHAT, {
    refetchQueries: [{ query: GET_CHATS }]
  })
  const [deleteChat] = useMutation(DELETE_CHAT, {
    refetchQueries: [{ query: GET_CHATS }]
  })
  const [updateChatTitle] = useMutation(UPDATE_CHAT_TITLE, {
    refetchQueries: [{ query: GET_CHATS }]
  })

  // Auto-create chat when user starts typing
  const handleNewChat = async () => {
    try {
      const result = await createChat({ 
        variables: { title: 'New Chat' } 
      })
      const newChatId = result.data.insert_chats_one.id
      onChatSelect(newChatId)
      setShowNewChatForm(false)
    } catch (err) {
      console.error('Error creating chat:', err)
    }
  }

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteChat({ variables: { chatId } })
        if (selectedChatId === chatId) {
          onChatSelect(null)
        }
      } catch (err) {
        console.error('Error deleting chat:', err)
      }
    }
  }

  const handleEditTitle = async (chatId, newTitle) => {
    if (!newTitle.trim()) return
    try {
      await updateChatTitle({ 
        variables: { chatId, title: newTitle.trim() } 
      })
      setEditingChatId(null)
      setEditingTitle('')
    } catch (err) {
      console.error('Error updating chat title:', err)
    }
  }

  const startEditing = (chat, e) => {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditingTitle(chat.title)
  }

  const filteredChats = data?.chats?.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.messages[0]?.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Group chats by date
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const recentChats = filteredChats.filter(chat => {
    const chatDate = new Date(chat.updated_at)
    return chatDate.toDateString() === today.toDateString()
  })

  const olderChats = filteredChats.filter(chat => {
    const chatDate = new Date(chat.updated_at)
    return chatDate.toDateString() !== today.toDateString()
  })

  if (loading) return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-md"></div>
      </div>
      <div className="flex-1 p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-16 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 text-red-600 dark:text-red-400">Error loading chats</div>
    </div>
  )

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredChats.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {searchTerm ? 'No chats found' : 'No chats yet. Start a new conversation!'}
          </div>
        ) : (
          <>
            {/* Recent Chats */}
            {recentChats.length > 0 && (
              <ChatBox title={`Today (${recentChats.length})`}>
                <div className="space-y-2">
                  {recentChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChatId === chat.id}
                      onSelect={onChatSelect}
                      onDelete={handleDeleteChat}
                      onEdit={startEditing}
                      editingChatId={editingChatId}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSaveEdit={handleEditTitle}
                      onCancelEdit={() => {
                        setEditingChatId(null)
                        setEditingTitle('')
                      }}
                    />
                  ))}
                </div>
              </ChatBox>
            )}

            {/* Older Chats */}
            {olderChats.length > 0 && (
              <ChatBox title={`Older (${olderChats.length})`}>
                <div className="space-y-2">
                  {olderChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChatId === chat.id}
                      onSelect={onChatSelect}
                      onDelete={handleDeleteChat}
                      onEdit={startEditing}
                      editingChatId={editingChatId}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSaveEdit={handleEditTitle}
                      onCancelEdit={() => {
                        setEditingChatId(null)
                        setEditingTitle('')
                      }}
                    />
                  ))}
                </div>
              </ChatBox>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ChatItem({ 
  chat, 
  isSelected, 
  onSelect, 
  onDelete, 
  onEdit, 
  editingChatId, 
  editingTitle, 
  setEditingTitle, 
  onSaveEdit, 
  onCancelEdit 
}) {
  const isEditing = editingChatId === chat.id

  if (isEditing) {
    return (
      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSaveEdit(chat.id, editingTitle)
            } else if (e.key === 'Escape') {
              onCancelEdit()
            }
          }}
          onBlur={() => onSaveEdit(chat.id, editingTitle)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(String(chat.id))}
      className={`p-3 cursor-pointer rounded-lg border transition-colors ${
        isSelected 
          ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {chat.title}
          </h3>
          {chat.messages[0] && (
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
              {chat.messages[0].content}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {new Date(chat.updated_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => onEdit(chat, e)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Edit title"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => onDelete(chat.id, e)}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}