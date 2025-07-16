/**
 * tools/add-task.ts
 * Tool to create new Jira issues
 */

import { z } from 'zod';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { logger } from '../../utils/logger';
import { createJiraIssue } from '../../utils/jira/jira-utils';
import { JiraTicket } from '../../utils/jira/jira-ticket';
import { createErrorResponse } from '../../utils/utils';
import { useSessionConfigs } from '../../utils/config';

export function registerAddTaskTool(server: McpServer, getSessionConfig?: () => any): void {
    server.registerTool('add_jira_issue', {
        title: 'Add Jira Issue',
        description: 'Creates a new issue in Jira with proper markdown formatting. All text fields support full markdown syntax including headers, lists, code blocks, bold/italic text, and links. The content is automatically converted to Atlassian Document Format (ADF) for optimal Jira display.',
        inputSchema: {
            title: z
                .string()
                .describe(
                    'The title/summary for the new issue (plain text, no markdown)'
                ),
            description: z
                .string()
                .optional()
                .describe(
                    'The main description for the issue. FORMATTING GUIDE: Use markdown syntax - ## for headers, **bold**, *italic*, `inline code`, ```language code blocks```, - for bullet lists, 1. for numbered lists, [link text](url) for links. This will be displayed as the main ticket description in Jira.'
                ),
            issueType: z
                .string()
                .optional()
                .describe(
                    'The issue type for the issue (default: Task, Epic, Story, Bug, Subtask)'
                ),
            implementationDetails: z
                .string()
                .optional()
                .describe(
                    'Implementation details and technical specifications. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates an "Implementation Details" panel title. ❌ WRONG: "**Implementation Steps:**" or "## Details:" or "### Steps:" ✅ CORRECT: "- Create the database schema" Use markdown for structure: **Important:** notes, - Step 1, - Step 2, ```sql code```. This content appears in a pre-titled panel in Jira.'
                ),
            acceptanceCriteria: z
                .string()
                .optional()
                .describe(
                    'Acceptance criteria and requirements that must be met. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates an "Acceptance Criteria" panel title. ❌ WRONG: "**Acceptance Criteria:**" or "## Requirements:" or "### Criteria:" ✅ CORRECT: "- [ ] User can log in successfully" Use markdown checklists: - [ ] for incomplete items, **Must have:** for emphasis. This content appears in a pre-titled panel in Jira.'
                ),
            testStrategy: z
                .string()
                .optional()
                .describe(
                    'Testing approach and strategy. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates a "Test Strategy (TDD)" panel title. ❌ WRONG: "**Test Strategy:**" or "## Testing:" or "### Test Plan:" ✅ CORRECT: "Unit tests will cover all public methods" Use markdown structure: ```bash test commands```, **Target:** for goals, - Test case 1. This content appears in a pre-titled panel in Jira.'
                ),
            parentKey: z
                .string()
                .optional()
                .describe(
                    "The Jira key of the Epic/parent to link this issue to (e.g., 'PROJ-5')"
                ),
            priority: z
                .string()
                .optional()
                .describe("Jira priority name (e.g., 'Medium', 'High')"),
            assignee: z
                .string()
                .optional()
                .describe('Jira account ID or email of the assignee'),
            labels: z
                .array(z.string())
                .optional()
                .describe('List of labels to add, only add labels if specified'),
            projectKey: z
                .string()
                .describe('The Jira project key to create the issue in (e.g., "JAR", "PROJ"). This parameter is required.'),
        },
    }, async (args: {
        title: string;
        description?: string;
        issueType?: string;
        implementationDetails?: string;
        acceptanceCriteria?: string;
        testStrategy?: string;
        parentKey?: string;
        priority?: string;
        assignee?: string;
        labels?: string[];
        projectKey: string;
    }) => {
        try {
            // Get configurations using the shared config hook
            const { jiraConfig } = useSessionConfigs(getSessionConfig, logger);

            logger.info(`Creating Jira task with title "${args.title}"`);

            // Validate required parameters
            if (!args.title) {
                logger.error('Task title/summary is required');
                return createErrorResponse('Task title/summary is required');
            }

            if (args.parentKey) {
                logger.info(`Task will be linked to parent/epic: ${args.parentKey}`);
            }

            // Use the JiraTicket class to manage the ticket data and ADF conversion
            const jiraTicket = new JiraTicket({
                title: args.title,
                description: args.description,
                details: args.implementationDetails,
                acceptanceCriteria: args.acceptanceCriteria,
                testStrategy: args.testStrategy,
                parentKey: args.parentKey,
                priority: args.priority
                    ? args.priority.charAt(0).toUpperCase() + args.priority.slice(1)
                    : 'Medium',
                issueType: args.issueType || 'Task',
                assignee: args.assignee,
                labels: args.labels || []
            });

            // Call the createJiraIssue function
            const result = await createJiraIssue(jiraTicket, {
                jiraConfig,
                log: logger,  // Pass logger in options object
                projectKey: args.projectKey  // This can be undefined, handled by createJiraIssue
            });

            if (!result.success) {
                const error = result.error;
                logger.error(`Failed to create Jira issue: ${error?.message || 'Unknown error'}`);
                
                // Enhanced error message with field-specific suggestions
                let errorMessage = `Failed to create Jira issue: ${error?.message || 'Unknown error'}`;
                
                // Add suggestions if available
                if (error?.suggestions && error.suggestions.length > 0) {
                    errorMessage += '\n\nSuggestions:\n' + error.suggestions.map((s: string) => `- ${s}`).join('\n');
                }
                
                // Add field-specific help for common issues
                if (error?.code === 'MISSING_PROJECT_KEY') {
                    errorMessage += '\n\nTip: Make sure to specify the projectKey parameter when creating an issue.';
                } else if (error?.code === 'INVALID_PROJECT_KEY') {
                    errorMessage += '\n\nTip: Verify the project key exists and you have access to it.';
                }
                
                return createErrorResponse(errorMessage);
            }

            // Success response
            const issueData = result.data;
            const successMessage = `Successfully created Jira ${jiraTicket.issueType.toLowerCase()} "${args.title}" with key: ${issueData.key}`;
            
            logger.info(successMessage);

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${successMessage}\n\nIssue Details:\n- Key: ${issueData.key}\n- ID: ${issueData.id}\n- Type: ${jiraTicket.issueType}\n- Priority: ${jiraTicket.priority}${args.parentKey ? `\n- Parent: ${args.parentKey}` : ''}${args.assignee ? `\n- Assignee: ${args.assignee}` : ''}`
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
