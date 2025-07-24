/**
 * tools/add-task.ts
 * Tool to create new Jira issues with ticket-type-specific frameworks
 */

import { z } from 'zod';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { logger } from '../../utils/logger';
import { createJiraIssue } from '../../utils/jira/jira-utils';
import { JiraTicket } from '../../utils/jira/jira-ticket';
import { createErrorResponse } from '../../utils/utils';
import { useSessionConfigs } from '../../utils/config';
import { validateTicketFramework, TICKET_FRAMEWORKS, getFrameworkDescription } from '../../utils/jira/ticket-frameworks';

export function registerAddTaskTool(server: McpServer, getSessionConfig?: () => any): void {
    server.registerTool('add_jira_issue', {
        title: 'Add Jira Issue',
        description: `Creates a new issue in Jira with proper markdown formatting and ticket-type-specific frameworks. 

**TICKET TYPE FRAMEWORKS:**

**Task**: Requires description, implementationDetails, acceptanceCriteria, testStrategy
- Use description for overview and context
- Use implementationDetails for technical approach and steps
- Use acceptanceCriteria for completion criteria and requirements
- Use testStrategy for testing approach

**Spike**: Requires description with investigation scope
- Use description for: investigation scope, business context, areas to research, expected deliverables
- Structure: Summary, Description, Business Context, Investigation Scope, Deliverable

**Bug**: Requires description, acceptanceCriteria, testStrategy
- Use description for reproduction steps, impact, and current behavior
- Use acceptanceCriteria for fix validation criteria
- Use testStrategy for regression testing approach

**Story**: Requires description, acceptanceCriteria
- Use description for user story and business value
- Use acceptanceCriteria for completion criteria

**Epic**: Requires description, acceptanceCriteria
- Use description for high-level overview and goals
- Use acceptanceCriteria for epic completion criteria

**Subtask**: Requires description, parentKey
- Use description for specific task details
- Must link to parent task/story

All text fields support full markdown syntax. Content is automatically converted to Atlassian Document Format (ADF).`,
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
                    'The main description for the issue. CONTEXT-SENSITIVE USAGE: For Tasks - overview and context; For Spikes - investigation scope, business context, areas to research, deliverables; For Bugs - reproduction steps, impact, current behavior; For Stories - user story and business value. FORMATTING: Use markdown syntax - ## for headers, **bold**, *italic*, `inline code`, ```language code blocks```, - for bullet lists, 1. for numbered lists, [link text](url) for links.'
                ),
            issueType: z
                .string()
                .optional()
                .describe(
                    'The issue type (default: Task). Available: Task, Epic, Story, Bug, Subtask, Spike. Each type has specific framework requirements - see tool description for details.'
                ),
            implementationDetails: z
                .string()
                .optional()
                .describe(
                    'Implementation details and technical specifications. REQUIRED FOR: Task. RECOMMENDED FOR: Story, Bug. FOR TASKS: technical approach, architecture decisions, step-by-step implementation. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates an "Implementation Details" panel title. ❌ WRONG: "**Implementation Steps:**" ✅ CORRECT: "- Create the database schema"'
                ),
            acceptanceCriteria: z
                .string()
                .optional()
                .describe(
                    'Acceptance criteria and requirements that must be met. REQUIRED FOR: Task, Story, Bug, Epic. RECOMMENDED FOR: Subtask, Spike. FOR TASKS/STORIES: completion criteria; FOR BUGS: fix validation criteria; FOR SPIKES: investigation success criteria. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates an "Acceptance Criteria" panel title. ❌ WRONG: "**Acceptance Criteria:**" ✅ CORRECT: "- [ ] User can log in successfully"'
                ),
            testStrategy: z
                .string()
                .optional()
                .describe(
                    'Testing approach and strategy. REQUIRED FOR: Task, Bug. RECOMMENDED FOR: Story. FOR TASKS: comprehensive testing approach; FOR BUGS: regression testing strategy. 🚨 CRITICAL: START DIRECTLY WITH CONTENT - NO TITLES OR HEADERS AT ALL. Jira automatically creates a "Test Strategy (TDD)" panel title. ❌ WRONG: "**Test Strategy:**" ✅ CORRECT: "Unit tests will cover all public methods"'
                ),
            parentKey: z
                .string()
                .optional()
                .describe(
                    "The Jira key of the Epic/parent to link this issue to (e.g., 'PROJ-5'). REQUIRED FOR: Subtask. RECOMMENDED FOR: Task, Story, Bug."
                ),
            priority: z
                .string()
                .optional()
                .describe("Jira priority name (e.g., 'Medium', 'High'). RECOMMENDED FOR: Task, Bug."),
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

            const issueType = args.issueType || 'Task';
            
            // Validate ticket framework
            const validation = validateTicketFramework(issueType, args);
            if (!validation.isValid) {
                const errorMessage = `${issueType} ticket does not meet framework requirements.\n\n${validation.suggestions.join('\n')}`;
                logger.error(errorMessage);
                return createErrorResponse(errorMessage);
            }

            if (args.parentKey) {
                logger.info(`Task will be linked to parent/epic: ${args.parentKey}`);
            }

            // Log framework compliance
            logger.info(`Creating ${issueType} ticket following framework requirements`);

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
                issueType: issueType,
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
                
                // Add framework suggestions
                const frameworkSuggestions = validation.suggestions;
                if (frameworkSuggestions.length > 0) {
                    errorMessage += '\n\nFramework Guidelines:\n' + frameworkSuggestions.map((s: string) => `- ${s}`).join('\n');
                }
                
                // Add field-specific help for common issues
                if (error?.code === 'MISSING_PROJECT_KEY') {
                    errorMessage += '\n\nTip: Make sure to specify the projectKey parameter when creating an issue.';
                } else if (error?.code === 'INVALID_PROJECT_KEY') {
                    errorMessage += '\n\nTip: Verify the project key exists and you have access to it.';
                }
                
                return createErrorResponse(errorMessage);
            }

            // Success response with framework compliance note
            const issueData = result.data;
            const frameworkDescription = getFrameworkDescription(issueType);
            const successMessage = `Successfully created Jira ${jiraTicket.issueType.toLowerCase()} "${args.title}" with key: ${issueData.key}`;
            
            logger.info(successMessage);

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${successMessage}\n\nIssue Details:\n- Key: ${issueData.key}\n- ID: ${issueData.id}\n- Type: ${jiraTicket.issueType}\n- Priority: ${jiraTicket.priority}${args.parentKey ? `\n- Parent: ${args.parentKey}` : ''}${args.assignee ? `\n- Assignee: ${args.assignee}` : ''}\n\n✅ Ticket follows ${issueType} framework requirements${frameworkDescription ? `\n📋 Framework: ${frameworkDescription}` : ''}`
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
