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
- Avoid repetitive or obvious content

 USER STORY FORMATTING INSTRUCTIONS:
 When generating the description, you MUST express the user requirement(s) as one or more user stories wrapped in fenced code blocks. Prefer using a language tag of \`user-story\`.

 You MAY optionally append a short, human-readable title after the language tag which will be used as the user story's title by the system:

 \`\`\`user-story Payment method selection on checkout
 As a [user/role], I want [goal/functionality], so that [benefit/value].
 Given ...
 When ...
 Then ...
 \`\`\`

 If no explicit title is provided after \`user-story\`, the system will derive the title automatically from the "I want ..." clause.

 Within each code block:
- Keep the classic structure on separate lines: As a ..., I want ..., so that ...
- Follow with BDD lines on separate lines: Given, And, When, Then, And

If the context implies multiple scenarios, ROLES, or distinct outcomes, generate MULTIPLE user stories, each in its own separate fenced code block. Additional narrative/context may follow after the blocks.

CRITICAL: The system will automatically detect user stories inside fenced code blocks and format them with a generated "User story: <title>" heading, preserving each line on its own line inside the code block.`;

    switch (issueType.toLowerCase()) {
         case 'task':
            return `${basePrompt}

For TASK tickets, generate all four fields using user story format:
- description: **MUST wrap user stories in triple backtick code fences**:
  • Wrap each user story in its own fenced code block (\`\`\`user-story preferred; optionally add a short title after the tag)
  • Write as lines: As a ..., I want ..., so that ...; then BDD lines (Given/When/Then/And) each on a new line
  • If multiple scenarios exist, include multiple user-story code blocks
  • System will automatically title each block; additional context can follow after the blocks
- implementationDetails: Essential technical steps and key decisions (bullet points, 3-5 items)
- acceptanceCriteria: Core functional requirements (3-5 checkboxes)
- testStrategy: Key testing areas (brief, 2-3 sentences)

CRITICAL: Always wrap user stories in fenced code blocks so the system can detect and format them. If multiple scenarios exist, include multiple blocks.`;

         case 'story':
            return `${basePrompt}

For STORY tickets, generate:
- description: **MUST wrap user stories in triple backtick code fences**:
  • Wrap each user story in its own fenced code block (\`\`\`user-story preferred; optionally add a short title after the tag)
  • Lines: As a ..., I want ..., so that ...; plus BDD lines (Given/When/Then/And)
  • If multiple scenarios exist, include multiple user-story code blocks
  • Additional context can follow after the blocks
- acceptanceCriteria: Core user acceptance criteria (3-5 checkboxes)
- implementationDetails: (optional) Key technical considerations if relevant
- testStrategy: (optional) User acceptance testing approach if needed

CRITICAL: Always wrap user stories in fenced code blocks so the system can detect and format them. If multiple scenarios exist, include multiple blocks.`;

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
- description: **MUST wrap user stories in triple backtick code fences**:
  • Wrap each high-level user story in its own fenced code block (\`\`\`user-story preferred; optionally add a short title after the tag)
  • Lines: As a ..., I want ..., so that ...; plus BDD lines (Given/When/Then/And)
  • If multiple major scenarios exist, include multiple user-story code blocks
  • Additional scope overview can follow after the blocks
- acceptanceCriteria: Major deliverables and success criteria (4-6 checkboxes)
- implementationDetails: (optional) High-level approach if relevant

CRITICAL: Always wrap user stories in fenced code blocks so the system can detect and format them. If multiple scenarios exist, include multiple blocks.`;

         case 'subtask':
            return `${basePrompt}

For SUBTASK tickets, generate:
- description: **SHOULD wrap user stories in triple backtick code fences when applicable**:
  • IF user-facing: Wrap the user-facing story in a fenced code block (\`\`\`user-story preferred; optionally add a short title after the tag)
  • Lines: As a ..., I want ..., so that ...; plus BDD lines (Given/When/Then/And)
  • IF technical: Describe specific task and how it contributes to parent (no markers needed)
  • Additional context can follow after the block(s)
- implementationDetails: (optional) Specific steps for this subtask
- acceptanceCriteria: (optional) Completion criteria (2-3 checkboxes)

PREFERRED: Use user story format within fenced code blocks when the subtask delivers user-facing value.`;

        default:
            return `${basePrompt}

Generate appropriate fields based on the ticket type provided. Keep content concise and actionable.`;
    }
}

export const TICKET_FRAMEWORKS: Record<string, TicketFramework> = {
    Task: {
        required: ['description', 'implementationDetails', 'acceptanceCriteria', 'testStrategy'],
        recommended: ['parentKey', 'priority'],
        description: 'Tasks require: user story format description ("As a [user], I want [goal], So that [benefit]"), implementation details, acceptance criteria, and test strategy'
    },
    Story: {
        required: ['description', 'acceptanceCriteria'],
        recommended: ['implementationDetails', 'testStrategy', 'parentKey'],
        description: 'Stories require: user story format description ("As a [user], I want [goal], So that [benefit]") and acceptance criteria. Implementation details and test strategy are recommended'
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
        description: 'Epics require: user story format description ("As a [stakeholder], I want [high-level goal], So that [business value]") and acceptance criteria (completion criteria)'
    },
    Subtask: {
        required: ['description', 'parentKey'],
        recommended: ['implementationDetails', 'acceptanceCriteria'],
        description: 'Subtasks require: description (preferably user story format when applicable) and parentKey. Implementation details and acceptance criteria are recommended'
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