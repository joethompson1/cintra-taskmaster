/**
 * Integration test for update-task functionality
 * Tests the complete workflow: create -> get -> update -> verify
 */

import request from 'supertest';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { setupMcpServer } from '../server/mcpServer';

// Load environment variables
dotenv.config();

describe('Update Task Integration Test', () => {
    let serverUrl: string;
    let testApp: any;
    let mcpServer: McpServer;
    const toolHandlers: Map<string, any> = new Map();
    
    // Track test tickets for cleanup
    const testTicketsToCleanup: string[] = [];

    beforeAll(async () => {
        // Restore console methods for integration tests
        if ((console.log as any).mockRestore) {
            (console.log as any).mockRestore();
            (console.info as any).mockRestore();
            (console.warn as any).mockRestore();
            (console.error as any).mockRestore();
        }
        
        const PORT = 3336; // Different port from E2E tests
        serverUrl = `http://localhost:${PORT}`;
        
        // Create test server
        const express = require('express');
        testApp = express();
        testApp.use(express.json());

        // Create MCP server instance
        mcpServer = new McpServer({
            name: 'update-task-test-server',
            version: '1.0.0'
        });

        // Capture tool handlers
        const originalRegisterTool = mcpServer.registerTool.bind(mcpServer);
        mcpServer.registerTool = (name: string, config: any, handler: any) => {
            toolHandlers.set(name, handler);
            return originalRegisterTool(name, config, handler);
        };

        // Setup MCP server with tools
        const getSessionConfig = () => ({
            JIRA_API_URL: process.env.JIRA_API_URL,
            JIRA_EMAIL: process.env.JIRA_EMAIL,
            JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
            JIRA_PROJECT: process.env.JIRA_PROJECT,
            BITBUCKET_WORKSPACE: process.env.BITBUCKET_WORKSPACE,
            BITBUCKET_EMAIL: process.env.JIRA_EMAIL,
            BITBUCKET_API_TOKEN: process.env.BITBUCKET_API_TOKEN,
        });
        setupMcpServer(mcpServer, getSessionConfig);

        // Create endpoint to call tools
        testApp.post('/tools/:toolName', async (req: any, res: any) => {
            const { toolName } = req.params;
            const handler = toolHandlers.get(toolName);
            
            if (!handler) {
                return res.status(404).json({ error: `Tool ${toolName} not found` });
            }

            try {
                const result = await handler(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });

        // Health check
        testApp.get('/health', (req: any, res: any) => {
            res.json({ status: 'healthy' });
        });

        // Start server
        await new Promise<void>((resolve) => {
            const server = testApp.listen(PORT, () => {
                console.log(`Update Task Test server listening on port ${PORT}`);
                resolve();
            });
            testApp.server = server;
        });

        console.log('🚀 Update Task Integration Test starting...');
    }, 60000);

    afterAll(async () => {
        // CRITICAL: Clean up test tickets before closing server
        console.log('\n🧹 Cleaning up test tickets...');
        
        for (const ticketId of testTicketsToCleanup) {
            try {
                console.log(`🗑️  Removing test ticket: ${ticketId}`);
                
                const response = await request(serverUrl)
                    .post('/tools/remove_jira_task')
                    .send({ id: ticketId });

                if (response.status === 200) {
                    console.log(`✅ Removed test ticket: ${ticketId}`);
                } else {
                    console.error(`❌ Failed to remove ${ticketId}:`, response.body);
                }
            } catch (error) {
                console.error(`❌ Error removing ${ticketId}:`, error);
            }
        }

        // Close the test server and all connections
        if (testApp?.server) {
            await new Promise<void>((resolve, reject) => {
                // Force close all connections
                testApp.server.close((err: any) => {
                    if (err) {
                        console.error('Error closing server:', err);
                        reject(err);
                    } else {
                        console.log('Test server closed');
                        resolve();
                    }
                });
                
                // Force close any keep-alive connections
                testApp.server.closeAllConnections();
            });
        }
        
        // Close logger transports to prevent open handles
        if (logger && logger.transports) {
            logger.transports.forEach((transport: any) => {
                if (transport.close) {
                    transport.close();
                }
            });
        }
        
        // Clean up any lingering timers or connections
        await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('should respond to health check', async () => {
        const response = await request(serverUrl)
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should complete full workflow: create -> get -> update -> verify formatting preservation', async () => {
        const timestamp = Date.now();
        const testTaskTitle = `Test Task Update ADF Fix ${timestamp}`;
        
        // Step 1: Create a test task
        console.log('\n📝 Step 1: Creating test task...');
        const createResult = await request(serverUrl)
            .post('/tools/add_jira_issue')
            .send({
                title: testTaskTitle,
                description: 'Test task to verify ADF formatting preservation',
                acceptanceCriteria: `- [ ] First acceptance criterion with **Framework**: React Native
- [ ] Second criterion with *emphasis*
- [ ] Third criterion with code \`example\``,
                details: `## Implementation Steps
- **Framework**: React Native
- **Architecture**: Clean architecture
- **Database**: PostgreSQL`,
                testStrategy: 'Unit tests for all methods',
                priority: 'Medium',
                issueType: 'Task',
                projectKey: process.env.JIRA_PROJECT || 'JAR'
            });
        
        expect(createResult.status).toBe(200);
        expect(createResult.body).toHaveProperty('content');
        
        // Extract the task ID from the response
        const createResponseText = createResult.body.content[0]?.text;
        const taskIdMatch = createResponseText?.match(/([A-Z]+-\d+)/);
        const taskId = taskIdMatch?.[0];
        
        expect(taskId).toBeDefined();
        expect(taskId).toMatch(/[A-Z]+-\d+/);
        
        // IMPORTANT: Register this ticket for cleanup
        testTicketsToCleanup.push(taskId);
        
        console.log(`✅ Created test task: ${taskId}`);
        
        // Step 2: Get the task to verify initial state
        console.log('\n📋 Step 2: Fetching initial task state...');
        const getResult = await request(serverUrl)
            .post('/tools/get_jira_task')
            .send({
                id: taskId,
                includeImages: false,
                includeComments: false,
                includeContext: false
            });
        
        expect(getResult.status).toBe(200);
        expect(getResult.body).toHaveProperty('content');
        
        const initialTaskData = JSON.parse(getResult.body.content[0].text);
        console.log('Initial acceptance criteria:', initialTaskData.acceptanceCriteria);
        console.log('Initial details:', initialTaskData.details);
        
        // Verify initial state has unchecked boxes
        expect(initialTaskData.acceptanceCriteria).toContain('[ ]');
        expect(initialTaskData.details).toContain('**Framework**: React Native');
        
        // Step 3: Update the task with checked boxes
        console.log('\n✏️  Step 3: Updating task with checked acceptance criteria...');
        const updateResult = await request(serverUrl)
            .post('/tools/update_jira_task')
            .send({
                id: taskId,
                prompt: `- [x] First acceptance criterion with **Framework**: React Native
- [x] Second criterion with *emphasis*
- [ ] Third criterion with code \`example\``
            });
        
        expect(updateResult.status).toBe(200);
        expect(updateResult.body).toHaveProperty('content');
        
        console.log('✅ Task updated successfully');
        
        // Step 4: Verify the update preserved formatting
        console.log('\n🔍 Step 4: Verifying formatting preservation...');
        const verifyResult = await request(serverUrl)
            .post('/tools/get_jira_task')
            .send({
                id: taskId,
                includeImages: false,
                includeComments: false,
                includeContext: false
            });
        
        expect(verifyResult.status).toBe(200);
        const verifyTaskData = JSON.parse(verifyResult.body.content[0].text);
        
        console.log('Updated acceptance criteria:', verifyTaskData.acceptanceCriteria);
        
        // Verify the formatting was preserved
        expect(verifyTaskData.acceptanceCriteria).toContain('[x]'); // Boxes should be checked
        expect(verifyTaskData.acceptanceCriteria).toContain('**Framework**: React Native'); // Bold text preserved
        expect(verifyTaskData.acceptanceCriteria).toContain('*emphasis*'); // Italic preserved
        expect(verifyTaskData.acceptanceCriteria).toContain('`example`'); // Code preserved
        
        console.log('✅ Formatting preservation verified!');
        
        // Step 5: Test updating a different section
        console.log('\n🔄 Step 5: Testing details section update...');
        const detailsUpdateResult = await request(serverUrl)
            .post('/tools/update_jira_task')
            .send({
                id: taskId,
                prompt: `## Implementation Steps
- **Framework**: React Native with TypeScript
- **Architecture**: Clean architecture with MVVM
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest and React Native Testing Library`
            });
        
        expect(detailsUpdateResult.status).toBe(200);
        console.log('✅ Updated implementation details');
        
        // Step 6: Final verification
        console.log('\n🔍 Step 6: Final verification...');
        const finalVerifyResult = await request(serverUrl)
            .post('/tools/get_jira_task')
            .send({
                id: taskId,
                includeImages: false,
                includeComments: false,
                includeContext: false
            });
        
        expect(finalVerifyResult.status).toBe(200);
        const finalTaskData = JSON.parse(finalVerifyResult.body.content[0].text);
        
        // Verify acceptance criteria is still updated (unchanged from step 3)
        expect(finalTaskData.acceptanceCriteria).toContain('[x]');
        expect(finalTaskData.acceptanceCriteria).toContain('**Framework**: React Native');
        
        // Verify details section was updated with new content
        expect(finalTaskData.details).toContain('React Native with TypeScript');
        expect(finalTaskData.details).toContain('Prisma ORM');
        expect(finalTaskData.details).toContain('Jest and React Native Testing Library');
        
        console.log('✅ All updates successful with formatting preserved!');
        console.log(`\n🎉 Test completed successfully for task: ${taskId}`);
        console.log('✅ ADF formatting preservation fix is working correctly!');
    }, 120000); // 2 minute timeout for full workflow
}); 