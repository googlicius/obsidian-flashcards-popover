import { literalStringReplace, splitTextIntoLineArray } from './utils';

/**
 * The MultiLineTextFinder class is responsible for finding and replacing multi-line text.
 */
export class MultiLineTextFinder {
	/**
	 * Finds and replaces multi-line text in the source text.
	 * @param sourceText - The source text to search in.
	 * @param searchText - The text to search for.
	 * @param replacementText - The text to replace the search text with.
	 * @returns The source text with the search text replaced by the replacement text, or null if the search text was not found.
	 */
	static findAndReplace(
		sourceText: string,
		searchText: string,
		replacementText: string,
	): string | null {
		let result: string | null = null;
		if (sourceText.includes(searchText)) {
			result = literalStringReplace(
				sourceText,
				searchText,
				replacementText,
			);
		} else {
			const sourceTextArray = splitTextIntoLineArray(sourceText);
			const searchTextArray = splitTextIntoLineArray(searchText);
			const lineNo: number | null = MultiLineTextFinder.find(
				sourceTextArray,
				searchTextArray,
			);
			if (lineNo) {
				const replacementTextArray =
					splitTextIntoLineArray(replacementText);
				const linesToRemove: number = searchTextArray.length;
				sourceTextArray.splice(
					lineNo,
					linesToRemove,
					...replacementTextArray,
				);
				result = sourceTextArray.join('\n');
			}
		}
		return result;
	}

	/**
	 * Finds the first occurrence of the search text in the source text.
	 * @param sourceText - The source text to search in.
	 * @param searchText - The text to search for.
	 * @returns The index of the first line of the found text, or null if the search text was not found.
	 */
	static find(sourceText: string[], searchText: string[]): number | null {
		let result: number | null = null;
		let searchIdx = 0;
		const maxSearchIdx: number = searchText.length - 1;
		for (let sourceIdx = 0; sourceIdx < sourceText.length; sourceIdx++) {
			const sourceLine: string = sourceText[sourceIdx].trim();
			const searchLine: string = searchText[searchIdx].trim();
			if (searchLine == sourceLine) {
				if (searchIdx == maxSearchIdx) {
					result = sourceIdx - searchIdx;
					break;
				}
				searchIdx++;
			} else {
				searchIdx = 0;
			}
		}
		return result;
	}
}
