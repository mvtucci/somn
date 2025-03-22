import fetch from 'node-fetch';
import { fetchUserResponses } from './fetch-responses.js';

async function addQuestionGuidance(userResponses) {
    const SHEETS_ID = '1jlnUTNQCtgdDVcTNgXtbS__JGmObLpHLD-FsrVwdAFc';
    
    try {
        console.log('Fetching and processing guidance data...\n');
        
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=tsv&gid=683561097&sheet=Questions`
        );

        if (!response.ok) {
            throw new Error(`Questions fetch failed: ${response.status}`);
        }

        const tsvText = await response.text();
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        // Add guidance, type, and weight to each response
        const responsesWithGuidance = userResponses.map(response => {
            const questionRow = rows.find(row => row[1] === response.questionId);
            return {
                ...response,
                questionType: questionRow ? questionRow[2] : null,     // Column C - Type
                questionWeight: questionRow ? questionRow[3] : null,   // Column D - Weight
                questionGuidance: questionRow ? questionRow[4] : null  // Column E - Guidance
            };
        });

        // Single, clear output format in specified order
        console.log('===========================================');
        console.log('SLEEP ASSESSMENT RESPONSES WITH GUIDANCE');
        console.log('===========================================\n');

        responsesWithGuidance.forEach((item, index) => {
            console.log(`[Question ${index + 1}]`);
            console.log(`ID: ${item.questionId}`);
            console.log(`Type: ${item.questionType || 'N/A'}`);
            console.log(`Weight: ${item.questionWeight || 'N/A'}`);
            console.log(`Question: ${item.questionText}`);
            console.log(`Response: ${item.response}`);
            if (item.questionGuidance) {
                console.log(`Guidance: ${item.questionGuidance}`);
            }
            console.log('-------------------------------------------\n');
        });

        console.log(`Total questions processed: ${responsesWithGuidance.length}\n`);
        return responsesWithGuidance;

    } catch (error) {
        console.error('Error adding question guidance:', error);
        throw error;
    }
}

// Test function
async function test() {
    const submissionId = process.argv[2];
    
    if (!submissionId) {
        console.error('Please provide a submission ID as an argument');
        console.log('Usage: node fetch-guidance.js <submissionId>');
        process.exit(1);
    }

    try {
        // First get user responses
        const userResponses = await fetchUserResponses(submissionId);
        
        // Then add question guidance
        const responsesWithGuidance = await addQuestionGuidance(userResponses);
        console.log('\nGuidance successfully added to all responses');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Remove the line that says "test();" and replace with:
if (process.argv[1].endsWith('fetch-question-guidance.js')) {
    test();
}

export async function fetchQuestionGuidance() {
    const SHEETS_ID = process.env.SHEETS_ID;
    try {
        console.log('Fetching question guidance...\n');
        
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=tsv&gid=683561097&sheet=Questions`
        );

        if (!response.ok) {
            throw new Error(`Questions fetch failed: ${response.status}`);
        }

        const tsvText = await response.text();
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        return rows.slice(1); // Skip header row
    } catch (error) {
        console.error('Error fetching question guidance:', error);
        throw error;
    }
}

// Export both functions
export { addQuestionGuidance }; 