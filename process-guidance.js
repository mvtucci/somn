import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fetchGeneralGuidance } from './fetch-general-guidance.js';
import { fetchUserResponses } from './fetch-responses.js';
import { addQuestionGuidance } from './fetch-question-guidance.js';
import { addAnswerGuidance } from './fetch-answer-guidance.js';

// Load environment variables from .env file
dotenv.config();

console.log('Loading process-guidance.js');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function getGPTResponse(prompt) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",  // Changed to GPT-4-turbo
            messages: [
                {
                    "role": "system",
                    "content": "You are a sleep coach providing guidance based on sleep assessment data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error getting GPT response:', error);
        throw error;
    }
}

export async function processGuidance(submissionId, guidanceData) {
    console.log('Starting processGuidance...');
    console.log('Submission ID:', submissionId);
    console.log('Guidance data received:', {
        hasGeneralGuidance: !!guidanceData?.generalGuidance,
        hasQuestionGuidance: !!guidanceData?.questionGuidance,
        hasAnswerGuidance: !!guidanceData?.answerGuidance
    });

    try {
        const userResponses = await fetchUserResponses(submissionId);
        console.log('User responses fetched:', userResponses?.length);
        
        // Add question guidance
        const responsesWithQuestionGuidance = await addQuestionGuidance(userResponses);
        
        // Add answer guidance
        const responsesWithAllGuidance = await addAnswerGuidance(responsesWithQuestionGuidance);

        // Format data for GPT
        const prompt = formatGuidanceForGPT(responsesWithAllGuidance, guidanceData.generalGuidance);
        
        // Get GPT response
        const response = await getGPTResponse(prompt);
        
        console.log('Guidance processed successfully');
        return response;
    } catch (error) {
        console.error('Error in processGuidance:', error);
        throw error;
    }
}

function formatGuidanceForGPT(responses, generalGuidance) {
    let prompt = 'Please analyze this sleep assessment data and provide personalized guidance.\n\n';
    
    // Add general guidance if available
    if (generalGuidance && generalGuidance.length > 0) {
        prompt += '=== GENERAL GUIDANCE ===\n';
        generalGuidance.forEach(guidance => {
            prompt += `${guidance[0]}: ${guidance[4]}\n`;
        });
        prompt += '\n';
    }

    // Add assessment results
    prompt += '=== ASSESSMENT RESULTS ===\n';
    responses.forEach((response, index) => {
        prompt += `[Question ${index + 1}]\n`;
        prompt += `ID: ${response.questionId}\n`;
        prompt += `Type: ${response.questionType || 'N/A'}\n`;
        prompt += `Weight: ${response.questionWeight || 'N/A'}\n`;
        prompt += `Question: ${response.questionText}\n`;
        prompt += `Response: ${response.response}\n`;
        if (response.questionGuidance) {
            prompt += `Question Guidance: ${response.questionGuidance}\n`;
        }
        if (response.answerGuidance) {
            prompt += `Answer Guidance: ${response.answerGuidance}\n`;
        }
        prompt += '-------------------------------------------\n';
    });

    prompt += '\nPlease provide:\n';
    prompt += '### Critical Sleep Insights\n';
    prompt += 'Analyze the key issues affecting their sleep quality.\n\n';
    prompt += '### Actionable Steps\n';
    prompt += 'Provide specific, personalized recommendations based on their responses.\n';

    return prompt;
}

// Move test function to be separate
async function test(submissionId) {
    if (!submissionId) {
        console.error('Please provide a submission ID as an argument');
        console.log('Usage: node fetch-responses.js <submissionId>');
        process.exit(1);
    }

    try {
        await processGuidance(submissionId);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Only run test if this file is being run directly
if (process.argv[1].endsWith('process-guidance.js')) {
    const submissionId = process.argv[2];
    test(submissionId);
} 