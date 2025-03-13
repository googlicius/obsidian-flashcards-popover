import { CardType } from './enums';
import { generateRandomString } from './util/generateRandomString';

export interface ParseOptions {
	text: string;
	singlelineCardSeparator?: string;
	singlelineReversedCardSeparator?: string;
	multilineCardSeparator?: string;
	multilineReversedCardSeparator?: string;
	convertHighlightsToClozes?: boolean;
	convertBoldTextToClozes?: boolean;
	convertCurlyBracketsToClozes?: boolean;
	allTags?: string[];
}

export interface Card {
	type: CardType;
	text: string;
	lineNumber: number;
	tag?: string;
	sequenceId?: string;
	headings?: string[];
}

/**
 * Returns flashcards found in `text`
 *
 * @param options - Options for parsing flashcards
 * @returns An array of card objects
 */
export function parse({
	text,
	singlelineCardSeparator = '::',
	singlelineReversedCardSeparator = ':::',
	multilineCardSeparator = '?',
	multilineReversedCardSeparator = '??',
	convertHighlightsToClozes = true,
	convertBoldTextToClozes = true,
	convertCurlyBracketsToClozes = true,
	allTags = [],
}: ParseOptions): Card[] {
	let cardText = '';
	const cards: Card[] = [];
	let cardType: CardType | null = null;
	let lineNo = 0;
	let currentTag: string | undefined = undefined;
	let sequenceId: string | undefined = undefined;
	let tagRegex: RegExp | null = null;
	
	// Track headings and the line number where the current tag was found
	const headings: string[] = [];
	// Regular expression to match Markdown headings (# Heading)
	const headingRegex = /^(#{1,6})\s+(.+)$/;

	if (allTags.length > 0) {
		// Convert tags array to regex pattern
		const tagPattern = allTags
			.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join('|');

		// Create tag regex that matches tags only when they're on their own line
		tagRegex = new RegExp(`(?!.*::)(${tagPattern})\\b.*$`);
	}

	const blockRegex = /(@start|@end).*$/;

	const lines: string[] = text.replaceAll('\r\n', '\n').split('\n');
	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i];
		const nextLine = lines[i + 1];

		// Check if the line is a heading and add it to the headings array
		const headingMatch = currentLine.match(headingRegex);
		if (headingMatch) {
			headings.push(headingMatch[2].trim());
		}

		if (currentLine.length === 0) {
			if (cardType) {
				// Create a card with headings if there's a current tag and headings
				cards.push({
					type: cardType,
					text: cardText,
					lineNumber: lineNo,
					tag: currentTag,
					sequenceId,
					headings: headings.length > 0 ? [...headings] : undefined,
				});
				cardType = null;
			}

			cardText = '';
			continue;
		} else if (
			tagRegex &&
			tagRegex.test(currentLine) &&
			(!nextLine || !['?', '??'].includes(nextLine.trim()))
		) {
			// Is a tag
			const match = currentLine.match(tagRegex) as string[];
			currentTag = match[1];
			// Reset headings when tag changes
			headings.length = 0;
		} else if (blockRegex.test(currentLine)) {
			// Is a block
			sequenceId = currentLine.startsWith('@start')
				? generateRandomString()
				: '';
		} else if (
			currentLine.startsWith('<!--') &&
			!currentLine.startsWith('<!--SR:')
		) {
			while (i + 1 < lines.length && !currentLine.includes('-->')) i++;
			i++;
			continue;
		}

		if (cardText.length > 0) {
			cardText += '\n';
		}
		cardText += currentLine.trimEnd();

		if (
			currentLine.includes(singlelineReversedCardSeparator) ||
			currentLine.includes(singlelineCardSeparator)
		) {
			cardType = lines[i].includes(singlelineReversedCardSeparator)
				? CardType.SingleLineReversed
				: CardType.SingleLineBasic;
			cardText = lines[i];
			lineNo = i;
			if (i + 1 < lines.length && lines[i + 1].startsWith('<!--SR:')) {
				cardText += '\n' + lines[i + 1];
				i++;
			}
			
			// Create a card with headings if there's a current tag and headings
			cards.push({
				type: cardType,
				text: cardText,
				lineNumber: lineNo,
				tag: currentTag,
				sequenceId,
				headings: headings.length > 0 ? [...headings] : undefined,
			});
			cardType = null;
			cardText = '';
		} else if (
			cardType === null &&
			((convertHighlightsToClozes && /==.*?==/gm.test(currentLine)) ||
				(convertBoldTextToClozes &&
					/\*\*.*?\*\*/gm.test(currentLine)) ||
				(convertCurlyBracketsToClozes && /{{.*?}}/gm.test(currentLine)))
		) {
			cardType = CardType.Cloze;
			lineNo = i;
		} else if (currentLine.trim() === multilineCardSeparator) {
			cardType = CardType.MultiLineBasic;
			lineNo = i;
		} else if (currentLine.trim() === multilineReversedCardSeparator) {
			cardType = CardType.MultiLineReversed;
			lineNo = i;
		} else if (
			currentLine.startsWith('```') ||
			currentLine.startsWith('~~~')
		) {
			const matches = currentLine.match(/`+|~+/);
			const codeBlockClose = matches && matches[0];
			if (codeBlockClose) {
				while (
					i + 1 < lines.length &&
					!lines[i + 1].startsWith(codeBlockClose)
				) {
					i++;
					cardText += '\n' + lines[i];
				}
				cardText += '\n' + codeBlockClose;
				i++;
			}
		}
	}

	if (cardType && cardText) {
		// Create a card with headings if there's a current tag and headings
		cards.push({
			type: cardType,
			text: cardText,
			lineNumber: lineNo,
			tag: currentTag,
			sequenceId,
			headings: headings.length > 0 ? [...headings] : undefined,
		});
	}

	return cards;
}
