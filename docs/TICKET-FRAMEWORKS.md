# Jira Ticket Type Frameworks

This document describes the ticket type framework system implemented in the cintra-taskmaster tool. The framework ensures that different Jira ticket types follow consistent structures and include all necessary information.

## Overview

The ticket framework system provides:
- **Validation**: Ensures tickets have required fields based on their type
- **Templates**: Provides structured templates for each ticket type
- **Guidance**: Offers best practices and recommendations
- **Consistency**: Maintains standardized ticket structures across the organization

## Supported Ticket Types

### Task
**Purpose**: Implementation work with clear technical requirements

**Required Fields:**
- `description` - Overview and context
- `implementationDetails` - Technical approach and steps  
- `acceptanceCriteria` - Completion criteria and requirements
- `testStrategy` - Testing approach

**Recommended Fields:** `parentKey`, `priority`

**Use Cases:**
- Feature implementation
- Technical improvements
- Infrastructure changes
- Code refactoring

### Spike
**Purpose**: Investigation and research work

**Required Fields:**
- `description` - Investigation scope, business context, areas to research, deliverables

**Recommended Fields:** `acceptanceCriteria`

**Use Cases:**
- Technical feasibility studies
- Architecture investigations
- Research tasks
- Proof of concepts

**Example Structure** (based on GROOT-252):
```markdown
## Summary
High-level overview of investigation

## Business Context  
- Why is this needed?
- What problem are we solving?
- How does this fit our roadmap?

## Investigation Scope
### Areas to Research:
1. Technical Analysis
2. Implementation Options  
3. Risk Assessment

## Deliverables
- Technical analysis document
- Recommendations with pros/cons
- Implementation plan outline
- Effort estimation
```

### Bug
**Purpose**: Issue resolution with clear reproduction and validation

**Required Fields:**
- `description` - Reproduction steps, impact, current behavior
- `acceptanceCriteria` - Fix validation criteria
- `testStrategy` - Regression testing approach

**Recommended Fields:** `implementationDetails`, `priority`

**Use Cases:**
- Production issues
- Functionality defects
- Performance problems
- UI/UX issues

### Story
**Purpose**: User-focused features with business value

**Required Fields:**
- `description` - User story and business value
- `acceptanceCriteria` - Completion criteria

**Recommended Fields:** `implementationDetails`, `testStrategy`, `parentKey`

**Use Cases:**
- User features
- Business requirements
- Customer-facing improvements
- Workflow enhancements

### Epic
**Purpose**: Large initiatives broken down into smaller work items

**Required Fields:**
- `description` - High-level overview and goals
- `acceptanceCriteria` - Epic completion criteria

**Recommended Fields:** `implementationDetails`

**Use Cases:**
- Major feature sets
- Strategic initiatives
- Cross-team projects
- Quarterly objectives

### Subtask
**Purpose**: Specific work items that contribute to parent tasks

**Required Fields:**
- `description` - Specific task details
- `parentKey` - Link to parent task/story

**Recommended Fields:** `implementationDetails`, `acceptanceCriteria`

**Use Cases:**
- Task breakdown
- Parallel work streams
- Specialized work items
- Team coordination

## Using the Framework

### Creating Tickets with Framework Validation

The `add_jira_issue` tool automatically validates tickets against their framework requirements:

```javascript
// This will fail validation - missing required fields for Task
add_jira_issue({
    title: "Implement user authentication",
    issueType: "Task",
    description: "Add login functionality"
    // Missing: implementationDetails, acceptanceCriteria, testStrategy
})

// This will pass validation - all required fields present
add_jira_issue({
    title: "Implement user authentication", 
    issueType: "Task",
    description: "Add login functionality with OAuth integration",
    implementationDetails: "- Integrate OAuth provider\n- Create login UI\n- Add session management",
    acceptanceCriteria: "- [ ] Users can log in with OAuth\n- [ ] Sessions persist correctly",
    testStrategy: "Unit tests for auth service, integration tests for login flow",
    projectKey: "PROJ"
})
```

### Getting Templates and Guidance

Use the `get_jira_ticket_template` tool to get framework information:

```javascript
// Get all ticket types overview
get_jira_ticket_template()

// Get specific template for Spike tickets
get_jira_ticket_template({ issueType: "Spike" })

// Get requirements only (no templates)
get_jira_ticket_template({ 
    issueType: "Task", 
    includeTemplate: false 
})
```

## Framework Implementation

### Architecture

The framework system consists of:

1. **`ticket-frameworks.ts`** - Core framework definitions and utilities
2. **`add-task.ts`** - Enhanced with framework validation
3. **`get-ticket-template.ts`** - New tool for template access
4. **Framework validation** - Automatic validation during ticket creation

### Key Functions

- `validateTicketFramework(type, fields)` - Validates ticket against framework
- `getTicketTemplate(type)` - Returns template for ticket type
- `getFrameworkRequirements(type)` - Returns required/recommended fields
- `getFrameworkDescription(type)` - Returns framework description

### Validation Logic

1. Check if ticket type has defined framework
2. Validate all required fields are present and non-empty
3. Generate helpful error messages with suggestions
4. Provide framework-specific guidance

## Best Practices

### For Tasks
- Break down complex tasks into manageable pieces
- Include clear technical specifications
- Define measurable completion criteria
- Consider both positive and negative test cases

### For Spikes
- Focus on investigation, not implementation
- Clearly define questions to be answered
- Set time boundaries for investigation
- Plan deliverables that aid decision-making

### For Bugs
- Provide clear, step-by-step reproduction instructions
- Include environment details and platform information
- Assess impact and severity accurately
- Consider regression testing for related functionality

### For Stories
- Write from user's perspective ("As a... I want... So that...")
- Focus on business value and user benefits
- Include testable acceptance criteria
- Consider edge cases and error scenarios

## Error Messages and Troubleshooting

### Common Validation Errors

**"Task ticket does not meet framework requirements"**
- Ensure all required fields are provided: description, implementationDetails, acceptanceCriteria, testStrategy

**"Missing required fields: description, parentKey"**  
- For Subtasks, both description and parentKey are mandatory

**"Unknown issue type: CustomType"**
- Only supported types are: Task, Epic, Story, Bug, Subtask, Spike

### Framework Suggestions

The system provides context-aware suggestions:
- Field-specific guidance based on ticket type
- Template structure recommendations
- Best practice reminders
- Common pitfall warnings

## Extending the Framework

To add new ticket types or modify existing ones:

1. Update `TICKET_FRAMEWORKS` in `ticket-frameworks.ts`
2. Add templates and validation logic
3. Update tool descriptions and documentation
4. Add test cases for new frameworks
5. Update this documentation

## Migration from Legacy Tickets

Existing tickets are not affected by the framework system. The validation only applies to new tickets created through the enhanced tools. Legacy tickets can be gradually updated to follow framework guidelines as they are modified.

## Examples

### Well-Structured Spike (GROOT-252 style)
```markdown
Title: "Investigation - Multiple Payroll Selection in Live Reports"

Description:
## Summary
Investigate technical requirements for enabling multiple payroll selection in live reports system.

## Business Context
- Users need to compare data across multiple payroll periods/entities
- Current workflow requires separate reports and manual consolidation  
- Enhancement will improve reporting efficiency and user experience

## Investigation Scope
### Areas to Research:
1. **Current Architecture Analysis**
   - Document existing payroll selection mechanism
   - Review database schema and relationships
   - Analyze current UI/UX for payroll selection

2. **API & Backend Changes**  
   - Identify data access layer changes needed
   - Review authentication/authorization for multi-payroll access

3. **Front-end Requirements**
   - Design multi-select UI component requirements
   - Assess impact on existing report layouts

## Deliverables
- Understanding of effort needed to proceed
- Specific tickets needed for implementation
- Updated datasets and UI requirements
```

This framework ensures consistent, complete, and actionable tickets across all team members and ticket types. 