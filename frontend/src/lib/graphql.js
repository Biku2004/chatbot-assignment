import { gql } from '@apollo/client'

export const GET_CHATS = gql`
  query GetChats {
    chats(order_by: { updated_at: desc }) {
      id
      title
      created_at
      updated_at
      messages(limit: 1, order_by: { created_at: desc }) {
        content
        created_at
      }
    }
  }
`

export const GET_MESSAGES = gql`
  query GetMessages($chatId: uuid!) {
    messages(
      where: { chat_id: { _eq: $chatId } }
      order_by: { created_at: asc }
    ) {
      id
      content
      role
      created_at
    }
  }
`

export const CREATE_CHAT = gql`
  mutation CreateChat($title: String!) {
    insert_chats_one(object: { title: $title }) {
      id
      title
      created_at
    }
  }
`

export const DELETE_CHAT = gql`
  mutation DeleteChat($chatId: uuid!) {
    delete_chats_by_pk(id: $chatId) {
      id
      title
    }
  }
`

export const UPDATE_CHAT_TITLE = gql`
  mutation UpdateChatTitle($chatId: uuid!, $title: String!) {
    update_chats_by_pk(
      pk_columns: { id: $chatId }
      _set: { title: $title }
    ) {
      id
      title
      updated_at
    }
  }
`

export const SEND_MESSAGE = gql`
  mutation SendMessage($chatId: uuid!, $content: String!) {
    insert_messages_one(
      object: { 
        chat_id: $chatId, 
        content: $content, 
        role: "user" 
      }
    ) {
      id
      content
      role
      created_at
    }
  }
`

// New mutation to save both user message and bot response
export const SEND_MESSAGE_WITH_BOT_RESPONSE = gql`
  mutation SendMessageWithBotResponse($chatId: uuid!, $userMessage: String!, $botResponse: String!) {
    insert_messages(
      objects: [
        {
          chat_id: $chatId,
          content: $userMessage,
          role: "user"
        },
        {
          chat_id: $chatId,
          content: $botResponse,
          role: "assistant"
        }
      ]
    ) {
      affected_rows
      returning {
        id
        content
        role
        created_at
      }
    }
  }
`

// Mutation to save bot response separately (for n8n workflow)
export const SAVE_BOT_RESPONSE = gql`
  mutation SaveBotResponse($chatId: uuid!, $content: String!) {
    insert_messages_one(
      object: { 
        chat_id: $chatId, 
        content: $content, 
        role: "assistant" 
      }
    ) {
      id
      content
      role
      created_at
    }
  }
`

export const SEND_MESSAGE_ACTION = gql`
  mutation SendMessageAction($chatId: uuid!, $message: String!) {
    sendMessage(chatId: $chatId, message: $message) {
      success
      message
      response
    }
  }
`

export const MESSAGES_SUBSCRIPTION = gql`
  subscription MessagesSubscription($chatId: uuid!) {
    messages(
      where: { chat_id: { _eq: $chatId } }
      order_by: { created_at: asc }
    ) {
      id
      content
      role
      created_at
    }
  }
`