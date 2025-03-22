import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a sleep coach providing guidance based on sleep assessment data. Maintain context from the previous messages to provide consistent advice."
                },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        return res.status(200).json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ error: 'Failed to process chat message' });
    }
} 