// Test script to verify chatbot functionality
export const testChatbot = async (nhost, chatId) => {
  console.log('🧪 Testing chatbot functionality...')
  
  try {
    // Test 1: Check if we can query messages
    console.log('📋 Test 1: Querying messages...')
    const { data: messagesData } = await nhost.graphql.request(`
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
    `, { chatId })
    
    console.log('✅ Messages query successful:', messagesData.messages.length, 'messages')
    
    // Test 2: Check if we can send a message
    console.log('📤 Test 2: Sending test message...')
    const testMessage = 'Hello, this is a test message'
    
    const { data: sendResult } = await nhost.graphql.request(`
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
    `, { chatId, content: testMessage })
    
    console.log('✅ Message sent successfully:', sendResult.insert_messages_one)
    
    // Test 3: Test the chatbot action
    console.log('🤖 Test 3: Testing chatbot action...')
    const { data: actionResult } = await nhost.graphql.request(`
      mutation SendMessageAction($chatId: uuid!, $message: String!) {
        sendMessage(chatId: $chatId, message: $message) {
          success
          message
          response
        }
      }
    `, { chatId, message: 'Hello, can you help me?' })
    
    console.log('✅ Chatbot action result:', actionResult.sendMessage)
    
    // Test 4: Check if bot response was saved
    console.log('📋 Test 4: Checking for bot response...')
    setTimeout(async () => {
      try {
        const { data: updatedMessages } = await nhost.graphql.request(`
          query GetMessages($chatId: uuid!) {
            messages(
              where: { chat_id: { _eq: $chatId } }
              order_by: { created_at: desc }
              limit: 5
            ) {
              id
              content
              role
              created_at
            }
          }
        `, { chatId })
        
        console.log('✅ Updated messages:', updatedMessages.messages)
        
        const botMessages = updatedMessages.messages.filter(msg => msg.role === 'assistant')
        if (botMessages.length > 0) {
          console.log('🎉 SUCCESS: Bot response found in database!')
          console.log('Latest bot message:', botMessages[0])
        } else {
          console.log('❌ ISSUE: No bot response found in database')
        }
      } catch (error) {
        console.error('❌ Error checking updated messages:', error)
      }
    }, 3000)
    
    return {
      success: true,
      message: 'All tests completed successfully',
      data: {
        messagesCount: messagesData.messages.length,
        sentMessage: sendResult.insert_messages_one,
        actionResult: actionResult.sendMessage
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return {
      success: false,
      error: error.message,
      details: error
    }
  }
}

// Test n8n workflow directly
export const testN8nWorkflow = async (chatId, message) => {
  console.log('🔧 Testing n8n workflow directly...')
  
  try {
    const response = await fetch('https://your-n8n-instance.com/webhook/chatbot-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          chatId: chatId,
          message: message
        },
        session_variables: {
          'x-hasura-user-id': 'your-user-id' // You'll need to replace this
        }
      })
    })
    
    const result = await response.json()
    console.log('🔧 n8n workflow response:', result)
    
    return result
  } catch (error) {
    console.error('❌ n8n workflow test failed:', error)
    return { error: error.message }
  }
}

// Function to run tests from browser console
export const runTests = () => {
  // This function can be called from browser console
  // You'll need to provide nhost instance and chatId
  console.log(`
🧪 Chatbot Test Runner

To run tests, call:
testChatbot(nhostInstance, 'your-chat-id')

Example:
testChatbot(window.nhost, '123e4567-e89b-12d3-a456-426614174000')

To test n8n workflow directly:
testN8nWorkflow('your-chat-id', 'test message')
  `)
}
