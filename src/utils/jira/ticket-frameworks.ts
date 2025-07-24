/**
 * utils/jira/ticket-frameworks.ts
 * Ticket type frameworks and template generation utilities
 */

export interface TicketFramework {
    required: string[];
    recommended: string[];
    description: string;
    template?: {
        description?: string;
        implementationDetails?: string;
        acceptanceCriteria?: string;
        testStrategy?: string;
    };
}

export const TICKET_FRAMEWORKS: Record<string, TicketFramework> = {
    Task: {
        required: ['description', 'implementationDetails', 'acceptanceCriteria', 'testStrategy'],
        recommended: ['parentKey', 'priority'],
        description: 'Tasks require: description, implementation details, acceptance criteria, and test strategy',
        template: {
            description: `## Overview
Brief description of what needs to be implemented and why.

## Context
- Business requirement or technical need
- Dependencies or related work
- Impact or benefits`,
            implementationDetails: `- Step 1: Detailed implementation step
- Step 2: Another implementation step
- Step 3: Final implementation step

**Technical considerations:**
- Architecture decisions
- Dependencies to consider
- Performance implications

**Code changes:**
\`\`\`typescript
// Example code structure
\`\`\``,
            acceptanceCriteria: `- [ ] Functional requirement 1 is met
- [ ] Functional requirement 2 is met
- [ ] Edge cases are handled appropriately
- [ ] Performance requirements are satisfied
- [ ] Security considerations are addressed
- [ ] Documentation is updated`,
            testStrategy: `**Unit Tests:**
- Test core functionality
- Test edge cases
- Test error handling

**Integration Tests:**
- Test API endpoints
- Test database interactions
- Test external service integrations

**Manual Testing:**
- [ ] Test happy path scenarios
- [ ] Test error scenarios
- [ ] Test performance under load`
        }
    },
    Story: {
        required: ['description', 'acceptanceCriteria'],
        recommended: ['implementationDetails', 'testStrategy', 'parentKey'],
        description: 'Stories require: description and acceptance criteria. Implementation details and test strategy are recommended',
        template: {
            description: `## User Story
As a [user type], I want [functionality] so that [benefit/value].

## Background
Context about why this story is needed and how it fits into the larger product vision.

## Business Value
- Key benefit 1
- Key benefit 2
- Measurable impact`,
            acceptanceCriteria: `**Given** [initial context]
**When** [action is performed]
**Then** [expected outcome]

**Additional criteria:**
- [ ] User can successfully complete the main workflow
- [ ] Error states are handled gracefully
- [ ] UI/UX meets design requirements
- [ ] Accessibility requirements are met`
        }
    },
    Bug: {
        required: ['description', 'acceptanceCriteria', 'testStrategy'],
        recommended: ['implementationDetails', 'priority'],
        description: 'Bugs require: description (with reproduction steps), acceptance criteria (fix validation), and test strategy',
        template: {
            description: `## Summary
Brief description of the bug and its impact.

## Reproduction Steps
1. Step 1 to reproduce
2. Step 2 to reproduce
3. Step 3 to reproduce

## Expected Behavior
What should happen instead.

## Actual Behavior
What is currently happening.

## Environment
- Browser/Platform: 
- Version: 
- Additional context:

## Impact
- Severity: [High/Medium/Low]
- Affected users: [All users/Specific group/etc.]
- Workaround available: [Yes/No]`,
            acceptanceCriteria: `- [ ] Bug is no longer reproducible following the original steps
- [ ] Fix doesn't introduce new issues or regressions
- [ ] Related functionality still works as expected
- [ ] Edge cases are properly handled
- [ ] Fix is validated across different environments`,
            testStrategy: `**Regression Testing:**
- Verify the original issue is fixed
- Test related functionality for regressions
- Test edge cases and boundary conditions

**Manual Testing:**
- [ ] Reproduce original bug (should be fixed)
- [ ] Test related workflows
- [ ] Test across different browsers/devices

**Automated Testing:**
- Add unit tests to prevent regression
- Update integration tests if needed`
        }
    },
    Spike: {
        required: ['description'],
        recommended: ['acceptanceCriteria'],
        description: 'Spikes require: description with investigation scope, business context, and expected deliverables. Use description field for detailed investigation plan',
        template: {
            description: `## Summary
High-level overview of what needs to be investigated.

## Business Context
- Why is this investigation needed?
- What business problem are we trying to solve?
- How does this fit into our roadmap?

## Investigation Scope

### Areas to Research:
1. **Technical Analysis**
   - Current system architecture
   - Technical constraints and limitations
   - Performance implications

2. **Implementation Options**
   - Option 1: [Brief description]
   - Option 2: [Brief description]
   - Option 3: [Brief description]

3. **Risk Assessment**
   - Technical risks
   - Business risks
   - Timeline risks

### Out of Scope:
- Items explicitly not included in this investigation

## Deliverables
- Technical analysis document
- Recommendation with pros/cons of each option
- Implementation plan outline
- Effort estimation for recommended approach
- Risk mitigation strategies`,
            acceptanceCriteria: `- [ ] All investigation areas have been thoroughly researched
- [ ] Technical options are clearly documented with pros/cons
- [ ] Recommended approach is identified and justified
- [ ] Implementation effort is estimated
- [ ] Risks and mitigation strategies are identified
- [ ] Stakeholders can make informed decisions based on findings`
        }
    },
    Epic: {
        required: ['description', 'acceptanceCriteria'],
        recommended: ['implementationDetails'],
        description: 'Epics require: description (high-level overview) and acceptance criteria (completion criteria)',
        template: {
            description: `## Epic Overview
High-level description of the feature or initiative and its strategic importance.

## Business Goals
- Primary business objective
- Key success metrics
- Expected outcomes

## User Impact
- Who will benefit from this epic
- How it improves user experience
- Business value delivered

## Scope
### Included:
- Major feature 1
- Major feature 2
- Major feature 3

### Out of Scope:
- Items explicitly not included in this epic`,
            acceptanceCriteria: `- [ ] All major features are delivered and functional
- [ ] User acceptance testing is completed successfully
- [ ] Performance requirements are met
- [ ] Security requirements are satisfied
- [ ] Documentation is complete
- [ ] Training materials are prepared (if needed)
- [ ] Success metrics show positive impact`
        }
    },
    Subtask: {
        required: ['description', 'parentKey'],
        recommended: ['implementationDetails', 'acceptanceCriteria'],
        description: 'Subtasks require: description and parentKey. Implementation details and acceptance criteria are recommended',
        template: {
            description: `## Subtask Overview
Specific task that contributes to the parent story/task completion.

## Context
How this subtask fits into the larger work item and why it's needed.

## Scope
Specific deliverables and boundaries for this subtask.`,
            implementationDetails: `- Specific implementation steps for this subtask
- Technical considerations unique to this work
- Dependencies on other subtasks or external work`,
            acceptanceCriteria: `- [ ] Specific deliverable is completed
- [ ] Quality standards are met
- [ ] Integration with parent work is successful
- [ ] No blocking issues remain`
        }
    }
};

export function validateTicketFramework(issueType: string, fields: Record<string, any>): {
    isValid: boolean;
    missingRequired: string[];
    suggestions: string[];
} {
    const framework = TICKET_FRAMEWORKS[issueType];
    if (!framework) {
        return { isValid: true, missingRequired: [], suggestions: [] };
    }

    const missingRequired = framework.required.filter(field => 
        !fields[field] || (typeof fields[field] === 'string' && fields[field].trim() === '')
    );
    
    const suggestions: string[] = [];

    if (missingRequired.length > 0) {
        suggestions.push(`${issueType} tickets require: ${framework.required.join(', ')}`);
        suggestions.push(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Add framework-specific suggestions
    if (issueType === 'Task') {
        suggestions.push('Task framework: Use description for overview, implementationDetails for technical approach, acceptanceCriteria for completion criteria, testStrategy for testing approach');
    } else if (issueType === 'Spike') {
        suggestions.push('Spike framework: Use description for investigation scope, business context, areas to research, and expected deliverables');
    } else if (issueType === 'Bug') {
        suggestions.push('Bug framework: Use description for reproduction steps and impact, acceptanceCriteria for fix validation, testStrategy for regression testing');
    }

    return {
        isValid: missingRequired.length === 0,
        missingRequired,
        suggestions
    };
}

export function getTicketTemplate(issueType: string): TicketFramework['template'] | null {
    const framework = TICKET_FRAMEWORKS[issueType];
    return framework?.template || null;
}

export function getFrameworkDescription(issueType: string): string | null {
    const framework = TICKET_FRAMEWORKS[issueType];
    return framework?.description || null;
}

export function getAllFrameworks(): Record<string, TicketFramework> {
    return TICKET_FRAMEWORKS;
}

export function getFrameworkRequirements(issueType: string): { required: string[]; recommended: string[] } | null {
    const framework = TICKET_FRAMEWORKS[issueType];
    if (!framework) return null;
    
    return {
        required: framework.required,
        recommended: framework.recommended
    };
} 