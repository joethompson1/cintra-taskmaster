import { JiraTicket } from '../../utils/jira/jira-ticket';

/**
 * Unit tests for user story extraction and title formatting from fenced code blocks
 */
describe('User Story Extraction and Title Formatting', () => {
    const fence = (title: string | null, bodyLines: string[]): string => {
        const head = '```user-story' + (title ? ' ' + title : '');
        return [head, ...bodyLines, '```'].join('\n');
    };

    test('extracts explicit title from user-story fence label', () => {
        const description = fence('Payment method selection on checkout', [
            'As a shopper, I want to select a saved card, so that I can check out quickly.',
            'Given I have saved cards',
            'When I open the payment step',
            'Then the saved cards are listed'
        ]);

        const ticket = new JiraTicket({ title: 't', description });
        const adf = ticket.toADF();

        expect(adf.content).toBeDefined();
        // Expect two nodes: title paragraph + codeBlock (no other description)
        expect(adf.content.length).toBe(2);

        const titleNode = adf.content[0];
        expect(titleNode.type).toBe('paragraph');
        expect(titleNode.content?.[0]?.text).toBe('User story: Payment method selection on checkout');
        expect(titleNode.content?.[0]?.marks?.[0]?.type).toBe('strong');

        const codeNode = adf.content[1];
        expect(codeNode.type).toBe('codeBlock');
        const codeText = codeNode.content?.[0]?.text as string;
        expect(codeText).toContain('As a shopper');
        expect(codeText).toContain('I want to select a saved card');
        expect(codeText).toContain('Given I have saved cards');
        expect(codeText).toContain('When I open the payment step');
        expect(codeText).toContain('Then the saved cards are listed');
    });

    test('derives title from I want clause when no fence title is given', () => {
        const description = fence(null, [
            'As a developer, I want to generate titles automatically, so that I save time.',
            'Given user stories are provided without explicit titles',
            'When the system processes the stories',
            'Then a title is derived from the I want clause'
        ]);

        const ticket = new JiraTicket({ title: 't', description });
        const adf = ticket.toADF();

        const titleNode = adf.content?.[0];
        expect(titleNode.type).toBe('paragraph');
        // Derived from "I want to generate titles automatically"
        expect(titleNode.content?.[0]?.text).toBe('User story: To generate titles automatically');
        expect(titleNode.content?.[0]?.marks?.[0]?.type).toBe('strong');
    });

    test('detects user story via BDD lines even without As/I want when labeled user-story', () => {
        const description = fence(null, [
            'Given I am logged in',
            'When I visit the dashboard',
            'Then I see my widgets'
        ]);

        const ticket = new JiraTicket({ title: 't', description });
        const adf = ticket.toADF();

        const titleNode = adf.content?.[0];
        expect(titleNode.type).toBe('paragraph');
        // No explicit title or I want clause -> falls back to generic title
        expect(titleNode.content?.[0]?.text).toBe('User story:');
    });

    test('handles multiple user stories: explicit title and fallback numbering/title', () => {
        const description = [
            fence('First story title', [
                'As a user, I want feature A, so that I benefit X.',
                'Given precondition A',
                'When action A',
                'Then result A'
            ]),
            '',
            fence(null, [
                'Given only BDD lines here',
                'When processing',
                'Then it works'
            ])
        ].join('\n');

        const ticket = new JiraTicket({ title: 't', description });
        const adf = ticket.toADF();

        // Expect: title + code, title + code = 4 nodes
        expect(adf.content.length).toBe(4);

        const title1 = adf.content[0];
        const title2 = adf.content[2];
        expect(title1.content?.[0]?.text).toBe('User story: First story title');
        // Second has no explicit/I want -> expect numbered fallback
        expect((title2.content?.[0]?.text || '').toLowerCase()).toBe('user story 2:');
    });

    test('non-user-story fenced code blocks are preserved as-is without inserting title nodes', () => {
        const description = [
            'Intro paragraph before code.',
            '```json',
            '{"a":1}',
            '```',
            '',
            'Conclusion paragraph after code.'
        ].join('\n');

        const ticket = new JiraTicket({ title: 't', description });
        const adf = ticket.toADF();

        // Expect: intro paragraph, code block, conclusion paragraph (no inserted user story title)
        const types = adf.content.map(n => n.type);
        expect(types).toEqual(['paragraph', 'codeBlock', 'paragraph']);
        // Ensure first paragraph contains 'Intro paragraph'
        const firstParaText = (adf.content[0].content || []).map((n: any) => n.text || '').join('');
        expect(firstParaText).toContain('Intro paragraph before code');
        // Code block preserved
        expect(adf.content[1].type).toBe('codeBlock');
        // Last paragraph contains 'Conclusion'
        const lastParaText = (adf.content[2].content || []).map((n: any) => n.text || '').join('');
        expect(lastParaText).toContain('Conclusion paragraph after code');
    });
});


