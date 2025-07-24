/**
 * Unit tests for ADF to Markdown conversion
 * Tests how the system converts Jira's ADF format back to markdown
 */

import { JiraTicket } from '../../utils/jira/jira-ticket';

describe('ADF to Markdown Conversion', () => {
    describe('Simple ADF structures', () => {
        test('should convert basic paragraph with bold text', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'This is '
                            },
                            {
                                type: 'text',
                                text: 'bold text',
                                marks: [
                                    {
                                        type: 'strong'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: ' in a paragraph.'
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Basic Paragraph Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected: "This is **bold text** in a paragraph."');
            
            expect(markdown).toBe('This is **bold text** in a paragraph.');
        });

        test('should convert paragraph with italic and code formatting', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Use '
                            },
                            {
                                type: 'text',
                                text: 'npm install',
                                marks: [
                                    {
                                        type: 'code'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: ' to install '
                            },
                            {
                                type: 'text',
                                text: 'dependencies',
                                marks: [
                                    {
                                        type: 'em'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: '.'
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Italic and Code Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected: "Use `npm install` to install *dependencies*."');
            
            expect(markdown).toBe('Use `npm install` to install *dependencies*.');
        });

        test('should convert links', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Visit '
                            },
                            {
                                type: 'text',
                                text: 'our website',
                                marks: [
                                    {
                                        type: 'link',
                                        attrs: {
                                            href: 'https://example.com'
                                        }
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: ' for more info.'
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Link Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected: "Visit [our website](https://example.com) for more info."');
            
            expect(markdown).toBe('Visit [our website](https://example.com) for more info.');
        });
    });

    describe('Complex ADF structures', () => {
        test('should convert bullet list with bold labels', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Language Parsers',
                                                marks: [
                                                    {
                                                        type: 'strong'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                text: ': AST generation for each supported language'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Analysis Engine',
                                                marks: [
                                                    {
                                                        type: 'strong'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                text: ': Static analysis with ML-powered insights'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Database',
                                                marks: [
                                                    {
                                                        type: 'strong'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                text: ': PostgreSQL with '
                                            },
                                            {
                                                type: 'text',
                                                text: 'Redis',
                                                marks: [
                                                    {
                                                        type: 'code'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                text: ' for caching'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Bullet List with Bold Labels Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected: "- **Language Parsers**: AST generation for each supported language\\n- **Analysis Engine**: Static analysis with ML-powered insights\\n- **Database**: PostgreSQL with `Redis` for caching"');
            
            expect(markdown).toBe('- **Language Parsers**: AST generation for each supported language\n- **Analysis Engine**: Static analysis with ML-powered insights\n- **Database**: PostgreSQL with `Redis` for caching');
        });

        test('should convert task list (checkboxes)', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'taskList',
                        attrs: {
                            localId: 'task-list-1'
                        },
                        content: [
                            {
                                type: 'taskItem',
                                attrs: {
                                    localId: 'task-1',
                                    state: 'TODO'
                                },
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'First task with '
                                            },
                                            {
                                                type: 'text',
                                                text: 'bold',
                                                marks: [
                                                    {
                                                        type: 'strong'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                text: ' text'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'taskItem',
                                attrs: {
                                    localId: 'task-2',
                                    state: 'DONE'
                                },
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Completed task'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Task List Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected: "- [ ] First task with **bold** text\\n- [x] Completed task"');
            
            expect(markdown).toBe('- [ ] First task with **bold** text\n- [x] Completed task');
        });

        test('should convert panel with rich content', () => {
            const mockADF = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'panel',
                        attrs: {
                            panelType: 'success'
                        },
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Acceptance Criteria',
                                        marks: [
                                            {
                                                type: 'strong'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'taskList',
                                attrs: {
                                    localId: 'acceptance-criteria'
                                },
                                content: [
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            localId: 'criteria-1',
                                            state: 'TODO'
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'System responds to '
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: 'voice commands',
                                                        marks: [
                                                            {
                                                                type: 'strong'
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            localId: 'criteria-2',
                                            state: 'DONE'
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'API integration with '
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: 'external service',
                                                        marks: [
                                                            {
                                                                type: 'em'
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockADF.content);
            
            console.log('=== Panel with Rich Content Test ===');
            console.log('Input ADF:', JSON.stringify(mockADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('Expected panel content with title and checkboxes');
            
            // The exact expected output depends on how panels are handled
            expect(markdown).toContain('**Acceptance Criteria**');
            expect(markdown).toContain('- [ ] System responds to **voice commands**');
            expect(markdown).toContain('- [x] API integration with *external service*');
        });
    });

    describe('Real Jira ADF simulation', () => {
        test('should convert a complete Jira ticket ADF structure', () => {
            // This simulates what a real Jira ticket looks like in ADF format
            const mockJiraADF = {
                version: 1,
                type: 'doc',
                content: [
                    // Main description
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Build a sophisticated voice assistant with '
                            },
                            {
                                type: 'text',
                                text: 'AI capabilities',
                                marks: [
                                    {
                                        type: 'strong'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: ' and smart home integration.'
                            }
                        ]
                    },
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Key features include:'
                            }
                        ]
                    },
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Voice recognition with '
                                            },
                                            {
                                                type: 'text',
                                                text: 'wake word',
                                                marks: [
                                                    {
                                                        type: 'strong'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Smart home device control'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    // Acceptance Criteria Panel
                    {
                        type: 'panel',
                        attrs: {
                            panelType: 'success'
                        },
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Acceptance Criteria',
                                        marks: [
                                            {
                                                type: 'strong'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'taskList',
                                content: [
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            state: 'TODO'
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Voice Commands',
                                                        marks: [
                                                            {
                                                                type: 'strong'
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: ': System responds to "Hey Assistant" wake word'
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            state: 'DONE'
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Device Control',
                                                        marks: [
                                                            {
                                                                type: 'strong'
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: ': Can control lights and temperature'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    // Implementation Details Panel
                    {
                        type: 'panel',
                        attrs: {
                            panelType: 'info'
                        },
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Implementation Details',
                                        marks: [
                                            {
                                                type: 'strong'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Framework',
                                        marks: [
                                            {
                                                type: 'strong'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'text',
                                        text: ': React Native with '
                                    },
                                    {
                                        type: 'text',
                                        text: 'TypeScript',
                                        marks: [
                                            {
                                                type: 'code'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Database',
                                        marks: [
                                            {
                                                type: 'strong'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'text',
                                        text: ': PostgreSQL for user data'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const markdown = JiraTicket.extractTextFromNodes(mockJiraADF.content);
            
            console.log('=== Complete Jira Ticket ADF Test ===');
            console.log('Input ADF:', JSON.stringify(mockJiraADF, null, 2));
            console.log('Output Markdown:', markdown);
            console.log('========================');
            
            // Test key elements are preserved
            expect(markdown).toContain('Build a sophisticated voice assistant with **AI capabilities**');
            expect(markdown).toContain('**Acceptance Criteria**');
            expect(markdown).toContain('- [ ] **Voice Commands**: System responds to "Hey Assistant" wake word');
            expect(markdown).toContain('- [x] **Device Control**: Can control lights and temperature');
            expect(markdown).toContain('**Implementation Details**');
            expect(markdown).toContain('**Framework**: React Native with `TypeScript`');
            expect(markdown).toContain('**Database**: PostgreSQL for user data');
        });
    });

    describe('Markdown to ADF Conversion', () => {
        test('should convert multiple bold elements in the same paragraph', () => {
            const markdownText = '**Purpose:** Testing ticket creation with minimal fields\n**Created:** Automated test via MCP server\n**Board:** JAR';
            
            const jiraTicket = new JiraTicket({
                title: 'Test Ticket',
                description: markdownText
            });
            
            const adf = jiraTicket.toADF();
            
            console.log('=== Multiple Bold Elements Test ===');
            console.log('Input Markdown:', markdownText);
            console.log('Output ADF:', JSON.stringify(adf, null, 2));
            console.log('========================');
            
            // The ADF should have proper strong marks for "Purpose:", "Created:", and "Board:"
            expect(adf.content).toBeDefined();
            expect(adf.content.length).toBeGreaterThan(0);
            
            // UPDATED: Lines starting with bold formatting should be separate paragraphs for proper Jira rendering
            const paragraphs = adf.content.filter((node: any) => node.type === 'paragraph');
            expect(paragraphs.length).toBe(3); // Should be 3 separate paragraphs to avoid embedded newlines
            
            // Verify each paragraph has the correct bold element
            const boldTexts = paragraphs.map((p: any) => {
                if (p.content) {
                    const boldNode = p.content.find((node: any) => 
                        node.marks && node.marks.some((mark: any) => mark.type === 'strong')
                    );
                    return boldNode ? boldNode.text : null;
                }
                return null;
            }).filter(Boolean);

            // Should have 3 bold elements: "Purpose:", "Created:", "Board:"
            expect(boldTexts.length).toBe(3);
            expect(boldTexts).toEqual(['Purpose:', 'Created:', 'Board:']);
            
            // Verify no embedded newlines in any text nodes
            const allTextNodes: any[] = [];
            const extractTextNodes = (content: any[]) => {
                content.forEach((node: any) => {
                    if (node.type === 'text') {
                        allTextNodes.push(node);
                    } else if (node.content) {
                        extractTextNodes(node.content);
                    }
                });
            };
            extractTextNodes(adf.content);
            
            // Critical: No text node should contain embedded newlines
            const hasEmbeddedNewlines = allTextNodes.some(node => node.text && node.text.includes('\n'));
            expect(hasEmbeddedNewlines).toBe(false);
        });

        test('should convert multiple bold elements in a single line', () => {
            const markdownText = 'This has **first bold** and **second bold** text in one line.';
            
            const jiraTicket = new JiraTicket({
                title: 'Test Ticket',
                description: markdownText
            });
            
            const adf = jiraTicket.toADF();
            
            console.log('=== Multiple Bold in Single Line Test ===');
            console.log('Input Markdown:', markdownText);
            console.log('Output ADF:', JSON.stringify(adf, null, 2));
            console.log('========================');
            
            // The ADF should have proper strong marks for both bold elements
            expect(adf.content).toBeDefined();
            expect(adf.content.length).toBe(1); // Should be 1 paragraph
            
            const paragraph = adf.content[0];
            expect(paragraph.type).toBe('paragraph');
            expect(paragraph.content).toBeDefined();
            
            if (paragraph.content) {
                // Should have multiple nodes: text -> bold -> text -> bold -> text
                expect(paragraph.content.length).toBe(5);
                
                // Check structure
                expect(paragraph.content[0].text).toBe('This has ');
                expect(paragraph.content[1].text).toBe('first bold');
                expect(paragraph.content[1].marks?.[0]?.type).toBe('strong');
                expect(paragraph.content[2].text).toBe(' and ');
                expect(paragraph.content[3].text).toBe('second bold');
                expect(paragraph.content[3].marks?.[0]?.type).toBe('strong');
                expect(paragraph.content[4].text).toBe(' text in one line.');
            }
        });

        test('should handle mixed formatting', () => {
            const markdownText = '**Bold text** with *italic text* and `code text` plus [link text](https://example.com)';
            
            const jiraTicket = new JiraTicket({
                title: 'Test Ticket',
                description: markdownText
            });
            
            const adf = jiraTicket.toADF();
            
            console.log('=== Mixed Formatting Test ===');
            console.log('Input Markdown:', markdownText);
            console.log('Output ADF:', JSON.stringify(adf, null, 2));
            console.log('========================');
            
            // The ADF should have all different types of formatting
            expect(adf.content).toBeDefined();
            expect(adf.content.length).toBe(1); // Should be 1 paragraph
            
            const paragraph = adf.content[0];
            expect(paragraph.type).toBe('paragraph');
            expect(paragraph.content).toBeDefined();
            
            if (paragraph.content) {
                // Find each formatted element
                const boldNode = paragraph.content.find((node: any) => 
                    node.marks && node.marks.some((mark: any) => mark.type === 'strong')
                );
                expect(boldNode).toBeDefined();
                expect(boldNode?.text).toBe('Bold text');
                
                const italicNode = paragraph.content.find((node: any) => 
                    node.marks && node.marks.some((mark: any) => mark.type === 'em')
                );
                expect(italicNode).toBeDefined();
                expect(italicNode?.text).toBe('italic text');
                
                const codeNode = paragraph.content.find((node: any) => 
                    node.marks && node.marks.some((mark: any) => mark.type === 'code')
                );
                expect(codeNode).toBeDefined();
                expect(codeNode?.text).toBe('code text');
                
                const linkNode = paragraph.content.find((node: any) => 
                    node.marks && node.marks.some((mark: any) => mark.type === 'link')
                );
                expect(linkNode).toBeDefined();
                expect(linkNode?.text).toBe('link text');
            }
        });
    });
}); 