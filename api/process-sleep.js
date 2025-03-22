import { processGuidance } from '../process-guidance.js';

export default async function handler(req, res) {
    try {
        const { submissionId } = req.query;
        
        if (!submissionId) {
            return res.status(400).json({ error: 'Submission ID is required' });
        }

        const response = await processGuidance(submissionId);
        return res.status(200).json({ response });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Failed to process guidance' });
    }
} 