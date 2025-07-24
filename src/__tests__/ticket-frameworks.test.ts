/**
 * __tests__/ticket-frameworks.test.ts
 * Tests for ticket framework validation and template functionality
 */

import {
    validateTicketFramework,
    getTicketTemplate,
    getFrameworkRequirements,
    getFrameworkDescription,
    getAllFrameworks,
    TICKET_FRAMEWORKS
} from '../utils/jira/ticket-frameworks';

describe('Ticket Frameworks', () => {
    describe('validateTicketFramework', () => {
        it('should validate Task tickets require all essential fields', () => {
            const result = validateTicketFramework('Task', {
                title: 'Test Task'
            });

            expect(result.isValid).toBe(false);
            expect(result.missingRequired).toEqual([
                'description',
                'implementationDetails', 
                'acceptanceCriteria',
                'testStrategy'
            ]);
            expect(result.suggestions).toContain('Task tickets require: description, implementationDetails, acceptanceCriteria, testStrategy');
        });

        it('should validate Task tickets pass with all required fields', () => {
            const result = validateTicketFramework('Task', {
                title: 'Test Task',
                description: 'Task description',
                implementationDetails: 'Implementation details',
                acceptanceCriteria: 'Acceptance criteria',
                testStrategy: 'Test strategy'
            });

            expect(result.isValid).toBe(true);
            expect(result.missingRequired).toEqual([]);
        });

        it('should validate Spike tickets require only description', () => {
            const result = validateTicketFramework('Spike', {
                title: 'Test Spike'
            });

            expect(result.isValid).toBe(false);
            expect(result.missingRequired).toEqual(['description']);
        });

        it('should validate Spike tickets pass with description', () => {
            const result = validateTicketFramework('Spike', {
                title: 'Test Spike',
                description: 'Investigation scope and deliverables'
            });

            expect(result.isValid).toBe(true);
            expect(result.missingRequired).toEqual([]);
        });

        it('should validate Bug tickets require description, acceptance criteria, and test strategy', () => {
            const result = validateTicketFramework('Bug', {
                title: 'Test Bug'
            });

            expect(result.isValid).toBe(false);
            expect(result.missingRequired).toEqual([
                'description',
                'acceptanceCriteria',
                'testStrategy'
            ]);
        });

        it('should validate Subtask tickets require description and parentKey', () => {
            const result = validateTicketFramework('Subtask', {
                title: 'Test Subtask'
            });

            expect(result.isValid).toBe(false);
            expect(result.missingRequired).toEqual(['description', 'parentKey']);
        });

        it('should handle unknown ticket types gracefully', () => {
            const result = validateTicketFramework('UnknownType', {
                title: 'Test'
            });

            expect(result.isValid).toBe(true);
            expect(result.missingRequired).toEqual([]);
            expect(result.suggestions).toEqual([]);
        });

        it('should handle empty string fields as missing', () => {
            const result = validateTicketFramework('Task', {
                title: 'Test Task',
                description: '',
                implementationDetails: '   ',
                acceptanceCriteria: 'Valid criteria',
                testStrategy: 'Valid strategy'
            });

            expect(result.isValid).toBe(false);
            expect(result.missingRequired).toContain('description');
            expect(result.missingRequired).toContain('implementationDetails');
        });
    });

    describe('getTicketTemplate', () => {
        it('should return template for Task tickets', () => {
            const template = getTicketTemplate('Task');
            
            expect(template).toBeDefined();
            expect(template?.description).toContain('## Overview');
            expect(template?.implementationDetails).toContain('Step 1');
            expect(template?.acceptanceCriteria).toContain('- [ ]');
            expect(template?.testStrategy).toContain('Unit Tests');
        });

        it('should return template for Spike tickets', () => {
            const template = getTicketTemplate('Spike');
            
            expect(template).toBeDefined();
            expect(template?.description).toContain('## Summary');
            expect(template?.description).toContain('## Business Context');
            expect(template?.description).toContain('## Investigation Scope');
            expect(template?.description).toContain('## Deliverables');
        });

        it('should return null for unknown ticket types', () => {
            const template = getTicketTemplate('UnknownType');
            expect(template).toBeNull();
        });
    });

    describe('getFrameworkRequirements', () => {
        it('should return requirements for valid ticket types', () => {
            const requirements = getFrameworkRequirements('Task');
            
            expect(requirements).toBeDefined();
            expect(requirements?.required).toEqual([
                'description',
                'implementationDetails',
                'acceptanceCriteria',
                'testStrategy'
            ]);
            expect(requirements?.recommended).toEqual(['parentKey', 'priority']);
        });

        it('should return null for unknown ticket types', () => {
            const requirements = getFrameworkRequirements('UnknownType');
            expect(requirements).toBeNull();
        });
    });

    describe('getFrameworkDescription', () => {
        it('should return description for valid ticket types', () => {
            const description = getFrameworkDescription('Task');
            expect(description).toContain('Tasks require: description, implementation details, acceptance criteria, and test strategy');
        });

        it('should return null for unknown ticket types', () => {
            const description = getFrameworkDescription('UnknownType');
            expect(description).toBeNull();
        });
    });

    describe('getAllFrameworks', () => {
        it('should return all defined frameworks', () => {
            const frameworks = getAllFrameworks();
            
            expect(frameworks).toBeDefined();
            expect(Object.keys(frameworks)).toContain('Task');
            expect(Object.keys(frameworks)).toContain('Spike');
            expect(Object.keys(frameworks)).toContain('Bug');
            expect(Object.keys(frameworks)).toContain('Story');
            expect(Object.keys(frameworks)).toContain('Epic');
            expect(Object.keys(frameworks)).toContain('Subtask');
        });

        it('should ensure all frameworks have required properties', () => {
            const frameworks = getAllFrameworks();
            
            Object.entries(frameworks).forEach(([type, framework]) => {
                expect(framework.required).toBeDefined();
                expect(framework.recommended).toBeDefined();
                expect(framework.description).toBeDefined();
                expect(Array.isArray(framework.required)).toBe(true);
                expect(Array.isArray(framework.recommended)).toBe(true);
                expect(typeof framework.description).toBe('string');
            });
        });
    });

    describe('Framework consistency', () => {
        it('should ensure Spike framework matches GROOT-252 example', () => {
            const spikeFramework = TICKET_FRAMEWORKS.Spike;
            
            // Spike should require only description (where all investigation details go)
            expect(spikeFramework.required).toEqual(['description']);
            expect(spikeFramework.recommended).toContain('acceptanceCriteria');
            
            // Template should include investigation structure
            const template = getTicketTemplate('Spike');
            expect(template?.description).toContain('Investigation Scope');
            expect(template?.description).toContain('Business Context');
            expect(template?.description).toContain('Deliverables');
        });

        it('should ensure all ticket types have meaningful templates', () => {
            const ticketTypes = ['Task', 'Story', 'Bug', 'Spike', 'Epic', 'Subtask'];
            
            ticketTypes.forEach(type => {
                const template = getTicketTemplate(type);
                expect(template).toBeDefined();
                expect(template?.description).toBeDefined();
                expect(template?.description!.length).toBeGreaterThan(50);
            });
        });
    });
}); 