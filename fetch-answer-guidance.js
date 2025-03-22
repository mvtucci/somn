import fetch from 'node-fetch';
import { fetchUserResponses } from './fetch-responses.js';
import { addQuestionGuidance } from './fetch-question-guidance.js';
import dotenv from 'dotenv';
dotenv.config();

const SHEETS_ID = process.env.SHEETS_ID;

function fuzzyMatchFirstWord(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Get first word of each string
    const word1 = str1.split(' ')[0].toLowerCase();
    const word2 = str2.split(' ')[0].toLowerCase();
    
    if (word1 === word2) return 1.0;
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;
    
    return 0;
}

function trimTrailingSpace(str) {
    return str.replace(/\s+$/, '');
}

async function addAnswerGuidance(responsesWithQuestionGuidance) {
    try {
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=tsv&gid=676194423&sheet=Answers`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch answers: ${response.status}`);
        }

        const tsvText = await response.text();
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        // Skip header row
        const dataRows = rows.slice(1);

        // Debug: Print all unique questionIds from the Answers sheet
        const uniqueQuestionIds = new Set(dataRows.map(row => row[0]));
        console.log('\nAvailable question IDs in Answers sheet:');
        console.log(Array.from(uniqueQuestionIds));

        // Add answer guidance to each response
        const responsesWithAllGuidance = responsesWithQuestionGuidance.map(response => {
            const answerRows = dataRows.filter(row => 
                trimTrailingSpace(row[0]) === trimTrailingSpace(response.questionId)
            );
            
            let bestMatch = answerRows.find(row => 
                trimTrailingSpace(row[1].toLowerCase()) === trimTrailingSpace(response.response.toLowerCase())
            );
            
            if (!bestMatch) {
                let highestScore = -1;
                
                answerRows.forEach(answerRow => {
                    const score = fuzzyMatchFirstWord(
                        trimTrailingSpace(response.response), 
                        trimTrailingSpace(answerRow[1])
                    );
                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = answerRow;
                    }
                });
                
                if (highestScore <= 0.7) {
                    bestMatch = null;
                }
            }
            
            // Calculate weighted score
            const answerScore = bestMatch ? parseInt(bestMatch[2]) : 0;
            const weight = response.questionWeight ? parseInt(response.questionWeight) : 1;
            const weightedScore = answerScore * weight;
            
            return {
                ...response,
                answerScore,
                weightedScore,
                answerGuidance: bestMatch ? bestMatch[3] : null
            };
        });

        console.log('\n===========================================');
        console.log('SLEEP ASSESSMENT WITH COMPLETE GUIDANCE');
        console.log('===========================================\n');

        responsesWithAllGuidance.forEach((item, index) => {
            console.log(`[Question ${index + 1}]`);
            console.log(`ID: ${item.questionId}`);
            console.log(`Type: ${item.questionType || 'N/A'}`);
            console.log(`Weight: ${item.questionWeight || 'N/A'}`);
            console.log(`Question: ${item.questionText}`);
            console.log(`Response: ${item.response}`);
            console.log(`Answer Score: ${item.answerScore}`);
            console.log(`Weighted Score (Score*Weight): ${item.weightedScore}`);
            if (item.questionGuidance) {
                console.log(`Question Guidance: ${item.questionGuidance}`);
            }
            if (item.answerGuidance) {
                console.log(`Answer Guidance: ${item.answerGuidance}`);
            }
            console.log('-------------------------------------------\n');
        });

        return responsesWithAllGuidance;

    } catch (error) {
        console.error('Error adding answer guidance:', error);
        throw error;
    }
}

async function test() {
    const submissionId = process.argv[2];
    
    if (!submissionId) {
        console.error('Please provide a submission ID as an argument');
        console.log('Usage: node fetch-answer-guidance.js <submissionId>');
        process.exit(1);
    }

    try {
        const userResponses = await fetchUserResponses(submissionId);
        const responsesWithQuestionGuidance = await addQuestionGuidance(userResponses);
        await addAnswerGuidance(responsesWithQuestionGuidance);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run test if this file is being run directly
if (process.argv[1].endsWith('fetch-answer-guidance.js')) {
    test();
}

export async function fetchAnswerGuidance() {
    try {
        console.log('Fetching answer guidance...\n');
        
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=tsv&gid=676194423&sheet=Answers`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch answers: ${response.status}`);
        }

        const tsvText = await response.text();
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        // Skip header row
        return rows.slice(1);
    } catch (error) {
        console.error('Error fetching answer guidance:', error);
        throw error;
    }
}

export { addAnswerGuidance }; 