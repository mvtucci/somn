console.log('===========================================');
console.log('Starting Somn Sleep Assessment Server');
console.log('===========================================');

import express from 'express';
import { processGuidance } from './process-guidance.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fetchGeneralGuidance } from './fetch-general-guidance.js';
import { fetchQuestionGuidance } from './fetch-question-guidance.js';
import { fetchAnswerGuidance } from './fetch-answer-guidance.js';
import fetch from 'node-fetch';  // Need this for the internal fetch call

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));  // Serve from root directory since that's where our HTML is

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Add this to your server.js
const SHEETS_ID = process.env.SHEETS_ID; // Move sheet ID to environment variable

// New endpoint to handle all sheet data fetching
app.get('/api/guidance-data', async (req, res) => {
    try {
        // Fetch all necessary data at once
        const [generalGuidance, questionGuidance, answerGuidance] = await Promise.all([
            fetchGeneralGuidance(),
            fetchQuestionGuidance(),
            fetchAnswerGuidance()
        ]);

        // Send back only the processed data structure
        res.json({
            generalGuidance,
            questionGuidance,
            answerGuidance
        });
    } catch (error) {
        console.error('Error fetching guidance data:', error);
        res.status(500).send('Error fetching guidance data');
    }
});

// Update process-sleep endpoint to use cached data
let guidanceCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

app.get('/api/process-sleep', async (req, res) => {
    console.log('===========================================');
    console.log('Received sleep assessment request');
    console.log('Full URL:', req.url);
    console.log('Query parameters:', req.query);
    
    try {
        const submissionId = req.query.submissionId;
        if (!submissionId) {
            console.log('Error: Missing submissionId');
            throw new Error('No submission ID provided');
        }
        console.log('Processing with submissionId:', submissionId);

        const now = Date.now();
        if (!guidanceCache || (now - lastFetchTime) > CACHE_DURATION) {
            console.log('2. Fetching fresh guidance data');
            const [generalGuidance, questionGuidance, answerGuidance] = await Promise.all([
                fetchGeneralGuidance(),
                fetchQuestionGuidance(),
                fetchAnswerGuidance()
            ]);
            console.log('3. Guidance data fetched:', 
                'general:', !!generalGuidance,
                'question:', !!questionGuidance,
                'answer:', !!answerGuidance
            );
            
            guidanceCache = {
                generalGuidance,
                questionGuidance,
                answerGuidance
            };
            lastFetchTime = now;
        }

        console.log('4. Processing for submissionId:', submissionId);
        
        const response = await processGuidance(submissionId, guidanceCache);
        console.log('5. Got response:', !!response);
        res.json({ response });
    } catch (error) {
        console.error('===========================================');
        console.error('Error processing request:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('===========================================');
        res.status(500).send('Error processing sleep assessment');
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a sleep coach providing guidance based on sleep assessment data."
                },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 1500
        });
        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// Add this near your other endpoints
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.send('Server is running');
});

// Add this after your other routes
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).send('Server error');
});

// Start server
const port = process.env.PORT || 8000;  // Use platform's PORT or default to 8000
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 