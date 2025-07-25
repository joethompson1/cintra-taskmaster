/**
 * utils/jira/ticket-frameworks.ts
 * Ticket type frameworks and template generation utilities
 */

export interface TicketFramework {
    required: string[];
    recommended: string[];
    description: string;
}

/**
 * Generate system prompts for different ticket types
 */
export function getSystemPrompt(issueType: string): string {
    const basePrompt = `You are an expert at creating concise, well-structured Jira tickets following established frameworks. Generate only the essential information needed to complete the work effectively.

Return your response as a JSON object with the following structure (only include fields that are relevant for the ticket type):
{
    "description": "Enhanced description with proper structure and context",
    "implementationDetails": "Technical implementation details and approach",
    "acceptanceCriteria": "Clear acceptance criteria using markdown checklists",
    "testStrategy": "Testing approach and strategy"
}

IMPORTANT FORMATTING RULES:
- Start content directly - NO titles or headers like "**Implementation Details:**" or "## Acceptance Criteria"
- Jira automatically creates panel titles, so content should begin immediately
- Use markdown formatting: **bold**, *italic*, \`code\`, \`\`\`code blocks\`\`\`, - for lists, - [ ] for checklists
- For acceptanceCriteria, use markdown checklists: - [ ] for incomplete items
- Be CONCISE and FOCUSED - provide only essential information
- Avoid repetitive or obvious content`;

    switch (issueType.toLowerCase()) {
        case 'task':
            return `${basePrompt}

For TASK tickets, generate all four fields but keep them concise:
- description: Brief overview, key context, main requirements (2-4 sentences)
- implementationDetails: Essential technical steps and key decisions (bullet points, 3-5 items)
- acceptanceCriteria: Core functional requirements (3-5 checkboxes)
- testStrategy: Key testing areas (brief, 2-3 sentences)

Focus on actionable, essential information only.`;

        case 'story':
            return `${basePrompt}

For STORY tickets, generate:
- description: User story format + brief context (2-3 sentences)
- acceptanceCriteria: Core user acceptance criteria (3-5 checkboxes)
- implementationDetails: (optional) Key technical considerations if relevant
- testStrategy: (optional) User acceptance testing approach if needed

Keep user-focused and concise.`;

        case 'bug':
            return `${basePrompt}

For BUG tickets, generate:
- description: Brief summary, reproduction steps (numbered list), expected vs actual behavior
- acceptanceCriteria: Fix validation criteria (3-4 checkboxes)
- testStrategy: Key regression testing areas (brief)
- implementationDetails: (optional) Technical fix approach if not obvious

Focus on clear reproduction and fix validation.`;

        case 'spike':
            return `${basePrompt}

For SPIKE tickets, generate:
- description: Investigation scope, key questions to answer, expected deliverables (concise)
- acceptanceCriteria: (optional) Research completion criteria (2-3 checkboxes)

Keep research-focused and specific about what needs to be discovered.`;

        case 'epic':
            return `${basePrompt}

For EPIC tickets, generate:
- description: High-level goal, business value, scope overview (3-4 sentences)
- acceptanceCriteria: Major deliverables and success criteria (4-6 checkboxes)
- implementationDetails: (optional) High-level approach if relevant

Focus on strategic outcomes and measurable goals.`;

        case 'subtask':
            return `${basePrompt}

For SUBTASK tickets, generate:
- description: Specific task overview, how it contributes to parent (1-2 sentences)
- implementationDetails: (optional) Specific steps for this subtask
- acceptanceCriteria: (optional) Completion criteria (2-3 checkboxes)

Keep focused and clearly scoped within parent work.`;

        default:
            return `${basePrompt}

Generate appropriate fields based on the ticket type provided. Keep content concise and actionable.`;
    }
}

export const TICKET_FRAMEWORKS: Record<string, TicketFramework> = {
    Task: {
        required: ['description', 'implementationDetails', 'acceptanceCriteria', 'testStrategy'],
        recommended: ['parentKey', 'priority'],
        description: 'Tasks require: description, implementation details, acceptance criteria, and test strategy'
    },
    Story: {
        required: ['description', 'acceptanceCriteria'],
        recommended: ['implementationDetails', 'testStrategy', 'parentKey'],
        description: 'Stories require: description and acceptance criteria. Implementation details and test strategy are recommended'
    },
    Bug: {
        required: ['description', 'acceptanceCriteria', 'testStrategy'],
        recommended: ['implementationDetails', 'priority'],
        description: 'Bugs require: description (with reproduction steps), acceptance criteria (fix validation), and test strategy'
    },
    Spike: {
        required: ['description'],
        recommended: ['acceptanceCriteria'],
        description: 'Spikes require: description with investigation scope, business context, and expected deliverables. Use description field for detailed investigation plan'
    },
    Epic: {
        required: ['description', 'acceptanceCriteria'],
        recommended: ['implementationDetails'],
        description: 'Epics require: description (high-level overview) and acceptance criteria (completion criteria)'
    },
    Subtask: {
        required: ['description', 'parentKey'],
        recommended: ['implementationDetails', 'acceptanceCriteria'],
        description: 'Subtasks require: description and parentKey. Implementation details and acceptance criteria are recommended'
    }
};

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