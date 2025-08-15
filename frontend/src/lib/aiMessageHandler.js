import { GraphQLClient } from 'graphql-request'

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { input } = req.body
  const { chatId, message } = input

  try {
    // 1. Call n8n to get AI response
    const n8nResponse = await fetch(import.meta.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chatId })
    })
    
    const aiData = await n8nResponse.json()
    const aiContent = aiData.choices[0].message.content

    // 2. Save AI response to database using Nhost's GraphQL endpoint
    const hasuraClient = new GraphQLClient(import.meta.env.NHOST_GRAPHQL_URL, {
      headers: {
        'x-hasura-admin-secret': import.meta.env.NHOST_ADMIN_SECRET,
      },
    })

    await hasuraClient.request(`
      mutation InsertAIMessage($chatId: uuid!, $content: String!) {
        insert_messages_one(
          object: { 
            chat_id: $chatId, 
            content: $content, 
            role: "assistant"
          }
        ) {
          id
        }
      }
    `, { chatId, content: aiContent })

    // 3. Return response
    return res.status(200).json({
      message: message,
      response: aiContent
    })
    
  } catch (error) {
    console.error('Error in sendMessage function:', error)
    return res.status(500).json({
      message: message,
      response: "Sorry, I couldn't process your request."
    })
  }
}