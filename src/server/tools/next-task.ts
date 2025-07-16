/**
 * tools/next-task.ts
 * Tool to find the next Jira task to work on
 */

import { z } from 'zod';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { logger } from '../../utils/logger';
import { findNextJiraTask } from '../../utils/jira/jira-utils';
import { createErrorResponse } from '../../utils/utils';
import { useSessionConfigs } from '../../utils/config';

export function registerNextTaskTool(server: McpServer, getSessionConfig?: () => any): void {
    server.registerTool('next_jira_task', {
        title: 'Find Next Jira Task',
        description: 'Find the next Jira task to work on based on dependencies and status',
        inputSchema: {
            parentKey: z
                .string()
                .describe(
                    'Parent Jira issue key (epic or task with subtasks) to filter tasks by, if no parent key is provided, pass in "all" as the parameter'
                ),
            projectKey: z
                .string()
                .describe(
                    'The project key to filter tasks by (e.g., "JAR", "PROJ"). Required so it knows which project to look in'
                ),
            assigneeEmail: z
                .string()
                .optional()
                .describe(
                    'Optional assignee email to filter tasks assigned to a specific user. If not provided, returns tasks assigned to anyone'
                ),
            assignedToMe: z
                .boolean()
                .optional()
                .describe(
                    'If true, automatically filters tasks assigned to the current authenticated user. Works for both OAuth and header-based authentication. Takes precedence over assigneeEmail if both are provided.'
                ),
        },
    }, async (args: {
        parentKey: string;
        projectKey: string;
        assigneeEmail?: string;
        assignedToMe?: boolean;
    }) => {
        try {
            // Get configurations using the shared config hook
            const { jiraConfig } = useSessionConfigs(getSessionConfig, logger);

            // Check if parentKey is 'all' and set to empty string to fetch all tasks
            const parentKey = args.parentKey === 'all' ? '' : args.parentKey;

            // Handle assignedToMe parameter - extract current user's email if needed
            let finalAssigneeEmail = args.assigneeEmail;
            
            if (args.assignedToMe) {
                // Get current user's email from session config
                if (getSessionConfig) {
                    const sessionConfig = getSessionConfig();
                    const currentUserEmail = sessionConfig.JIRA_EMAIL;
                    
                    if (currentUserEmail) {
                        finalAssigneeEmail = currentUserEmail;
                        const authType = sessionConfig.IS_OAUTH ? 'OAuth' : 'header-based';
                        logger.info(`🎯 Using assignedToMe=true with ${authType} authentication: ${currentUserEmail}`);
                    } else {
                        logger.warn('⚠️  assignedToMe=true but no email found in session config, will search all tasks');
                    }
                } else {
                    logger.warn('⚠️  assignedToMe=true but no session config available, will search all tasks');
                }
            }

            logger.info(`Finding next task with args: ${JSON.stringify({
                ...args,
                resolvedAssigneeEmail: finalAssigneeEmail
            })}`);

            // Call the findNextJiraTask function with parentKey and optional filters
            const result = await findNextJiraTask(
                parentKey,
                logger,
                {
                    jiraConfig,
                    projectKey: args.projectKey,
                    assigneeEmail: finalAssigneeEmail
                }
            );

            if (!result.success) {
                logger.error(`Failed to find next task: ${result.error?.message || 'Unknown error'}`);
                return createErrorResponse(`Failed to find next task: ${result.error?.message || 'Unknown error'}`);
            }

            // If no next task found
            if (!result.data?.nextTask) {
                const assigneeInfo = finalAssigneeEmail ? ` assigned to ${finalAssigneeEmail}` : '';
                const message = `No eligible next task found${assigneeInfo}. All tasks are either completed or have unsatisfied dependencies`;
                logger.info(message);
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: message
                        }
                    ]
                };
            }

            // Return the next task data
            const nextTask = result.data.nextTask;
            logger.info(`Successfully found next task: ${nextTask.id || 'No available tasks'}`);
            
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: typeof nextTask === 'object'
                            ? JSON.stringify(nextTask, null, 2)
                            : String(nextTask)
                    }
                ]
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : '';
            logger.error(`Error in next-jira-task tool: ${errorMessage}\n${errorStack}`);
            return createErrorResponse(`Failed to find next task: ${errorMessage}`);
        }
    });
}
