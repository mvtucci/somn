import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SHEETS_ID = process.env.SHEETS_ID;

export async function fetchGeneralGuidance() {
    try {
        console.log('Starting fetchGeneralGuidance...');
        console.log('Using Sheet ID:', process.env.SHEETS_ID);
        
        const response = await fetch(
            `https://docs.google.com/spreadsheets/d/${process.env.SHEETS_ID}/export?format=tsv&gid=683561097&sheet=Questions`
        );
        console.log('Fetch response status:', response.status);

        if (!response.ok) {
            throw new Error(`Questions fetch failed: ${response.status}`);
        }

        const tsvText = await response.text();
        console.log('TSV data length:', tsvText.length);
        
        const rows = tsvText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.split('\t'));

        // Filter for rows where Type is "General"
        const generalGuidance = rows
            .slice(1) // Skip header row
            .filter(row => row[2]?.toLowerCase() === 'general');

        console.log('Found general guidance rows:', generalGuidance.length);
        return generalGuidance;

    } catch (error) {
        console.error('Error in fetchGeneralGuidance:', error);
        throw error;
    }
}