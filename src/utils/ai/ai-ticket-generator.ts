/**
 * utils/jira/ai-ticket-generator.ts
 * AI-powered ticket field generation utilities
 */

import { generateText } from './ai-services';
import { getSystemPrompt } from '../jira/ticket-frameworks';
import { logger } from '../logger';

/**
 * Generate detailed ticket fields using Claude
 */
export async function generateTicketFields(
    title: string,
    description: string,
    issueType: string,
    priority?: string,
    parentKey?: string
): Promise<{
    description?: string;
    implementationDetails?: string;
    acceptanceCriteria?: string;
    testStrategy?: string;
}> {
    const systemPrompt = getSystemPrompt(issueType);
    
    const userPrompt = `Generate detailed ticket fields for this ${issueType}:

**Title:** ${title}
${description ? `**Description/Context:** ${description}` : ''}
${priority ? `**Priority:** ${priority}` : ''}
${parentKey ? `**Parent/Epic:** ${parentKey} (this ticket should relate to this parent work)` : ''}

**Requirements:**
- Keep content concise but complete
- Focus on essential information needed to complete the work
- Follow ${issueType} framework requirements
- Provide actionable details without unnecessary verbosity

Please create framework-compliant content that provides clear direction for implementation.`;

    try {
        const response = await generateText(userPrompt, systemPrompt, {
            temperature: 0.2,
            maxTokens: 2000
        });

        // Try to parse as JSON
        const cleanedResponse = response.trim();
        let jsonStart = cleanedResponse.indexOf('{');
        let jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error('No JSON object found in response');
        }
        
        const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd);
        const generatedFields = JSON.parse(jsonStr);
        
        return generatedFields;
    } catch (error) {
        logger.error(`Failed to generate ticket fields: ${error}`);
        throw new Error(`Failed to generate ticket fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 