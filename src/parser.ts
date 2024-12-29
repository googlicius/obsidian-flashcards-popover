import { CardType } from './enums';

/**
 * Returns flashcards found in `text`
 *
 * @param text - The text to extract flashcards from
 * @param singlelineCardSeparator - Separator for inline basic cards
 * @param singlelineReversedCardSeparator - Separator for inline reversed cards
 * @param multilineCardSeparator - Separator for multiline basic cards
 * @param multilineReversedCardSeparator - Separator for multiline basic card
 * @param allTags - All tags in the text
 * @returns An array of [CardType, card text, line number, tag] tuples
 */
export function parse(
	text: string,
	singlelineCardSeparator: string,
	singlelineReversedCardSeparator: string,
	multilineCardSeparator: string,
	multilineReversedCardSeparator: string,
	convertHighlightsToClozes: boolean,
	convertBoldTextToClozes: boolean,
	convertCurlyBracketsToClozes: boolean,
	allTags: string[] = [],
): [CardType, string, number, string][] {
	let cardText = '';
	const cards: [CardType, string, number, string][] = [];
	let cardType: CardType | null = null;
	let lineNo = 0;
	let currentTag = '';

	// Convert tags array to regex pattern
    const tagPattern = allTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    
    // Create regex that matches tags only when they're on their own line
	const regex = new RegExp(`^[\\t ]*(${tagPattern})[\\t ]*$`, 'g');

	const lines: string[] = text.replaceAll('\r\n', '\n').split('\n');
	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i];

		if (currentLine.length === 0) {
			if (cardType) {
				cards.push([cardType, cardText, lineNo, currentTag]);
				cardType = null;
			}

			cardText = '';
			continue;
		} else if (regex.test(currentLine)) {
			// Is a tag
			currentTag = currentLine.trim();
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
			cards.push([cardType, cardText, lineNo, currentTag]);
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
		cards.push([cardType, cardText, lineNo, currentTag]);
	}

	return cards;
}
