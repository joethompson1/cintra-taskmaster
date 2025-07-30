/**
 * tools/add-task.ts
 * Tool to create new Jira issues with AI-generated ticket-type-specific frameworks
 */

import { z } from 'zod';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { logger } from '../../utils/logger';
import { createJiraIssue, addIssueDependencies } from '../../utils/jira/jira-utils';
import { JiraTicket } from '../../utils/jira/jira-ticket';
import { createErrorResponse } from '../../utils/utils';
import { useSessionConfigs } from '../../utils/config';
import { TICKET_FRAMEWORKS } from '../../utils/jira/ticket-frameworks';
import { generateTicketFields } from '../../utils/ai/ai-ticket-generator';

export function registerAddTaskTool(server: McpServer, getSessionConfig?: () => any): void {
    server.registerTool('add_jira_issue', {
        title: 'Add Jira Issue',
        description: `Creates a new issue in Jira with AI-generated ticket-type-specific frameworks. 

The tool accepts basic ticket information and uses Claude to intelligently generate detailed, framework-compliant content based on the ticket type:

**Supported Ticket Types:**
- **Task**: Comprehensive implementation tickets with technical details
- **Story**: User-focused features with clear acceptance criteria  
- **Bug**: Issue reports with reproduction steps and fix validation
- **Spike**: Research tickets with investigation scope and deliverables
- **Epic**: High-level initiatives with strategic goals
- **Subtask**: Focused work items linked to parent tickets

The AI will automatically generate appropriate fields like implementationDetails, acceptanceCriteria, and testStrategy based on the ticket type and framework requirements.`,
        inputSchema: {
            title: z
                .string()
                .describe('The title/summary for the new issue (plain text, no markdown)'),
            description: z
                .string()
                .optional()
                .describe('Basic description or context for the ticket. The AI will enhance this with framework-specific structure.'),
            issueType: z
                .string()
                .optional()
                .describe('The issue type (default: Task). Available: Task, Epic, Story, Bug, Subtask, Spike'),
            parentKey: z
                .string()
                .optional()
                .describe('The Jira key of the Epic/parent to link this issue to (e.g., \'PROJ-5\'). Required for Subtasks.'),
            priority: z
                .string()
                .optional()
                .describe('Jira priority name (e.g., \'Medium\', \'High\')'),
            assignee: z
                .string()
                .optional()
                .describe('Jira account ID or email of the assignee'),
            labels: z
                .array(z.string())
                .optional()
                .describe('List of labels to add to the ticket, dont add labels unless specially asked by the user'),
            dependsOn: z
                .string()
                .optional()
                .describe('Jira issue key that this issue depends on (e.g., "PROJ-123"). Will create a "depends on" link after issue creation.'),
            blocks: z
                .string()
                .optional()
                .describe('Jira issue key that this issue will block (e.g., "PROJ-456"). Will create a "blocks" link after issue creation.'),
            projectKey: z
                .string()
                .describe('The Jira project key to create the issue in (e.g., "PROJ"). This parameter is required.'),
        },
    }, async (args: {
        title: string;
        description?: string;
        issueType?: string;
        parentKey?: string;
        priority?: string;
        assignee?: string;
        labels?: string[];
        dependsOn?: string;
        blocks?: string;
        projectKey: string;
    }) => {
        try {
            // Get configurations using the shared config hook
            const { jiraConfig } = useSessionConfigs(getSessionConfig, logger);

            logger.info(`Creating Jira task with AI-generated content: "${args.title}"`);

            // Validate required parameters
            if (!args.title) {
                logger.error('Task title/summary is required');
                return createErrorResponse('Task title/summary is required');
            }

            const issueType = args.issueType || 'Task';
            
            // Validate subtask has parent
            if (issueType.toLowerCase() === 'subtask' && !args.parentKey) {
                logger.error('Subtask requires parentKey');
                return createErrorResponse('Subtask tickets require a parentKey to link to the parent issue');
            }

            // Check if this ticket type is supported
            if (!TICKET_FRAMEWORKS[issueType]) {
                logger.warn(`Unknown ticket type: ${issueType}, proceeding with default framework`);
            }

            logger.info(`Generating ${issueType} framework content using AI...`);

            // Generate detailed ticket fields using Claude
            const generatedFields = await generateTicketFields(
                args.title,
                args.description || '',
                issueType,
                args.priority,
                args.parentKey
            );

            logger.info(`Successfully generated framework content for ${issueType}`);

            if (args.parentKey) {
                logger.info(`Task will be linked to parent/epic: ${args.parentKey}`);
            }

            // Use the JiraTicket class to manage the ticket data and ADF conversion
            const jiraTicket = new JiraTicket({
                title: args.title,
                description: generatedFields.description || args.description || '',
                details: generatedFields.implementationDetails,
                acceptanceCriteria: generatedFields.acceptanceCriteria,
                testStrategy: generatedFields.testStrategy,
                parentKey: args.parentKey,
                priority: args.priority
                    ? args.priority.charAt(0).toUpperCase() + args.priority.slice(1)
                    : 'Medium',
                issueType: issueType,
                assignee: args.assignee,
                labels: args.labels || [],
                dependencies: args.dependsOn ? [args.dependsOn] : []
            });

            // Call the createJiraIssue function
            const result = await createJiraIssue(jiraTicket, {
                jiraConfig,
                log: logger,
                projectKey: args.projectKey
            });

            if (!result.success) {
                const error = result.error;
                logger.error(`Failed to create Jira issue: ${error?.message || 'Unknown error'}`);
                
                let errorMessage = `Failed to create Jira issue: ${error?.message || 'Unknown error'}`;
                
                // Add suggestions if available
                if (error?.suggestions && error.suggestions.length > 0) {
                    errorMessage += '\n\nSuggestions:\n' + error.suggestions.map((s: string) => `- ${s}`).join('\n');
                }
                
                return createErrorResponse(errorMessage);
            }

            // Success response
            const issueData = result.data;
            const successMessage = `Successfully created AI-generated Jira ${jiraTicket.issueType.toLowerCase()} "${args.title}" with key: ${issueData.key}`;
            
            logger.info(successMessage);

            // Create dependency links if dependsOn or blocks are provided
            let dependencyMessage = '';
            if (args.dependsOn || args.blocks) {
                const dependencyResult = await addIssueDependencies(
                    issueData.key,
                    {
                        dependsOn: args.dependsOn,
                        blocks: args.blocks
                    },
                    {
                        jiraConfig,
                        log: logger
                    }
                );

                if (dependencyResult.success && dependencyResult.changes.length > 0) {
                    dependencyMessage = `\n✅ Created dependency links:\n${dependencyResult.changes.map(change => `  - ${change}`).join('\n')}`;
                } else if (dependencyResult.errors.length > 0) {
                    dependencyMessage = `\n⚠️ Issue created but dependency errors occurred:\n${dependencyResult.errors.map(error => `  - ${error}`).join('\n')}`;
                }
            }

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${successMessage}\n\nIssue Details:\n- Key: ${issueData.key}\n- ID: ${issueData.id}\n- Type: ${jiraTicket.issueType}\n- Priority: ${jiraTicket.priority}${args.parentKey ? `\n- Parent: ${args.parentKey}` : ''}${args.assignee ? `\n- Assignee: ${args.assignee}` : ''}${args.dependsOn ? `\n- Depends on: ${args.dependsOn}` : ''}${args.blocks ? `\n- Blocks: ${args.blocks}` : ''}${dependencyMessage}\n\n🤖 Ticket content generated using AI following ${issueType} framework requirements\n📋 Generated fields: ${Object.keys(generatedFields).join(', ')}`
                    }
                ]
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : '';
            logger.error(`Error in add-jira-issue tool: ${errorMessage}\n${errorStack}`);
            return createErrorResponse(`Failed to create Jira issue: ${errorMessage}`);
        }
    });
}
