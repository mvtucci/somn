console.log('Loading fetch-responses.js');

import fetch from 'node-fetch';

async function fetchUserResponses(submissionId) {
    const SHEETS_ID = '1jlnUTNQCtgdDVcTNgXtbS__JGmObLpHLD-FsrVwdAFc';
    
    try {
        console.log('Fetching responses sheet...');
        
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=tsv&sheet=Responses`
        );

        if (!response.ok) {
            throw new Error(`Responses fetch failed: ${response.status}`);
        }

        const tsvText = await response.text();
        
        // Parse TSV data
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        // Get headers and question IDs from first two rows
        const questionTexts = rows[0];
        const questionIds = rows[1];

        // Find the submission row
        const submissionRow = rows.slice(2).find(row => row[0] === submissionId);
        
        if (!submissionRow) {
            throw new Error(`Submission ID ${submissionId} not found`);
        }

        // Create structured response object and filter out "na" questions
        const structuredResponses = questionIds
            .map((questionId, index) => ({
                questionId: questionId,
                questionType: null,      // Will be filled in by fetch-guidance.js
                questionWeight: null,    // Will be filled in by fetch-guidance.js
                questionText: questionTexts[index],
                response: submissionRow[index],
                questionGuidance: null   // Will be filled in by fetch-guidance.js
            }))
            .filter(item => {
                // Handle all variations of "na": "na", "N/A", "n/a", etc.
                const normalizedId = item.questionId?.toLowerCase()?.replace(/[^a-z0-9]/g, '');
                return normalizedId && normalizedId !== 'na';
            });

        return structuredResponses;

    } catch (error) {
        console.error('Error fetching responses:', error);
        throw error;
    }
}

// Separate test function
function test() {
    const submissionId = process.argv[2];
    
    if (!submissionId) {
        console.error('Please provide a submission ID as an argument');
        console.log('Usage: node fetch-responses.js <submissionId>');
        process.exit(1);
    }

    fetchUserResponses(submissionId)
        .then(console.log)
        .catch(console.error);
}

// Only run test if this file is being run directly
if (process.argv[1].endsWith('fetch-responses.js')) {
    test();
}

export { fetchUserResponses }; 