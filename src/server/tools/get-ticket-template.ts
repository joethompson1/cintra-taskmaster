/**
 * tools/get-ticket-template.ts
 * Tool to get ticket templates and framework guidance for different Jira issue types
 */

import { z } from 'zod';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { logger } from '../../utils/logger';
import { createErrorResponse } from '../../utils/utils';
import { 
    getTicketTemplate, 
    getFrameworkRequirements, 
    getFrameworkDescription,
    getAllFrameworks 
} from '../../utils/jira/ticket-frameworks';

export function registerGetTicketTemplateTool(server: McpServer): void {
    server.registerTool('get_jira_ticket_template', {
        title: 'Get Jira Ticket Template',
        description: 'Get ticket templates, framework requirements, and guidance for different Jira issue types. Helps ensure tickets follow proper structure and include all necessary information.',
        inputSchema: {
            issueType: z
                .string()
                .optional()
                .describe(
                    'The issue type to get template for (Task, Epic, Story, Bug, Subtask, Spike). If not provided, returns information about all ticket types.'
                ),
            includeTemplate: z
                .boolean()
                .optional()
                .describe('Whether to include the full template content (default: true)'),
            includeRequirements: z
                .boolean()
                .optional()
                .describe('Whether to include framework requirements (default: true)'),
        },
    }, async (args: {
        issueType?: string;
        includeTemplate?: boolean;
        includeRequirements?: boolean;
    }) => {
        try {
            const includeTemplate = args.includeTemplate !== false;
            const includeRequirements = args.includeRequirements !== false;

            if (!args.issueType) {
                // Return information about all ticket types
                const allFrameworks = getAllFrameworks();
                const frameworkList = Object.entries(allFrameworks).map(([type, framework]) => {
                    let info = `## ${type}\n${framework.description}`;
                    
                    if (includeRequirements) {
                        info += `\n\n**Required fields:** ${framework.required.join(', ')}`;
                        info += `\n**Recommended fields:** ${framework.recommended.join(', ')}`;
                    }
                    
                    return info;
                }).join('\n\n---\n\n');

                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `# Jira Ticket Type Frameworks\n\nHere are all available ticket types and their requirements:\n\n${frameworkList}\n\n**Usage:** Call this tool again with a specific issueType to get detailed templates and examples.`
                        }
                    ]
                };
            }

            // Get specific ticket type information
            const issueType = args.issueType;
            const template = getTicketTemplate(issueType);
            const requirements = getFrameworkRequirements(issueType);
            const description = getFrameworkDescription(issueType);

            if (!requirements) {
                return createErrorResponse(`Unknown issue type: ${issueType}. Available types: Task, Epic, Story, Bug, Subtask, Spike`);
            }

            let response = `# ${issueType} Ticket Framework\n\n`;
            response += `${description}\n\n`;

            if (includeRequirements) {
                response += `## Framework Requirements\n\n`;
                response += `**Required fields:** ${requirements.required.join(', ')}\n`;
                response += `**Recommended fields:** ${requirements.recommended.join(', ')}\n\n`;
            }

            if (includeTemplate && template) {
                response += `## Template Content\n\n`;
                
                if (template.description) {
                    response += `### Description Template\n\`\`\`\n${template.description}\n\`\`\`\n\n`;
                }
                
                if (template.implementationDetails) {
                    response += `### Implementation Details Template\n\`\`\`\n${template.implementationDetails}\n\`\`\`\n\n`;
                }
                
                if (template.acceptanceCriteria) {
                    response += `### Acceptance Criteria Template\n\`\`\`\n${template.acceptanceCriteria}\n\`\`\`\n\n`;
                }
                
                if (template.testStrategy) {
                    response += `### Test Strategy Template\n\`\`\`\n${template.testStrategy}\n\`\`\`\n\n`;
                }
            }

            // Add specific guidance based on ticket type
            response += `## Best Practices\n\n`;
            
            if (issueType === 'Task') {
                response += `- Break down complex tasks into smaller, manageable pieces\n`;
                response += `- Include clear technical specifications in implementation details\n`;
                response += `- Define measurable completion criteria\n`;
                response += `- Consider both positive and negative test cases\n`;
            } else if (issueType === 'Spike') {
                response += `- Focus on investigation and research, not implementation\n`;
                response += `- Clearly define what questions need to be answered\n`;
                response += `- Set time boundaries for the investigation\n`;
                response += `- Plan deliverables that help with decision-making\n`;
            } else if (issueType === 'Bug') {
                response += `- Provide clear, step-by-step reproduction instructions\n`;
                response += `- Include environment details and browser/platform information\n`;
                response += `- Assess impact and severity accurately\n`;
                response += `- Consider regression testing for related functionality\n`;
            } else if (issueType === 'Story') {
                response += `- Write from the user's perspective using "As a... I want... So that..." format\n`;
                response += `- Focus on business value and user benefits\n`;
                response += `- Include acceptance criteria that can be tested\n`;
                response += `- Consider edge cases and error scenarios\n`;
            } else if (issueType === 'Epic') {
                response += `- Define high-level goals and success metrics\n`;
                response += `- Break down into smaller stories or tasks\n`;
                response += `- Consider dependencies and sequencing\n`;
                response += `- Plan for iterative delivery and feedback\n`;
            } else if (issueType === 'Subtask') {
                response += `- Keep scope focused and specific to parent task\n`;
                response += `- Ensure clear dependencies and sequencing\n`;
                response += `- Define completion criteria that contribute to parent goal\n`;
                response += `- Consider integration points with other subtasks\n`;
            }

            logger.info(`Provided ${issueType} ticket template and guidance`);

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: response
                    }
                ]
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Error in get-ticket-template tool: ${errorMessage}`);
            return createErrorResponse(`Failed to get ticket template: ${errorMessage}`);
        }
    });
} 