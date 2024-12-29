import {
	HeadingCache,
	MetadataCache,
	getAllTags as ObsidianGetAllTags,
	TFile,
	Vault,
} from 'obsidian';
import { getAllTagsFromText } from './util/utils';

export interface ISRFile {
	// file: TFile;
	get path(): string | null;
	get basename(): string;
	getAllTags(): string[];
	getFlashcardTags(flashcardTagsSetting: string[]): string[];
	getQuestionContext(cardLine: number): string[];
	read(): Promise<string>;
	write(content: string): Promise<void>;
}

/**
 * Represents a file in the Spaced Repetition system.
 */
export class SrTFile implements ISRFile {
	file: TFile;
	vault: Vault;
	metadataCache: MetadataCache;

	/**
	 * Constructs a new SrTFile instance.
	 * @param vault - The vault instance.
	 * @param metadataCache - The metadata cache instance.
	 * @param file - The file instance.
	 */
	constructor(vault: Vault, metadataCache: MetadataCache, file: TFile) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.file = file;
	}

	/**
	 * Gets the path of the file.
	 * @returns The path of the file.
	 */
	get path(): string {
		return this.file.path;
	}

	/**
	 * Gets the basename of the file.
	 * @returns The basename of the file.
	 */
	get basename(): string {
		return this.file.basename;
	}

	/**
	 * Gets all tags in the file.
	 * @returns An array of all tags in the file.
	 */
	getAllTags(): string[] {
		const fileCachedData = this.metadataCache.getFileCache(this.file) || {};
		return ObsidianGetAllTags(fileCachedData) || [];
	}

	/**
	 * Filter out tags that are flashcard tags based on flashcardTagsSetting
	 * For example: flashcardTagsSetting = ['#flashcard', '#flashcards']
	 * And allTags = ['#flashcards/dev', '#tag1', '#tag2', '#flashcard', '#flashcards/language']
	 * Return ['#flashcards/dev', '#flashcard', '#flashcards/language']
	 */
	getFlashcardTags(flashcardTagsSetting: string[]): string[] {
		const allTags = this.getAllTags();
		return allTags.filter((tag) =>
			flashcardTagsSetting.some(
				(flashcardTag) =>
					tag === flashcardTag || tag.startsWith(flashcardTag + '/'),
			),
		);
	}

	/**
	 * Gets the context of a question in the file.
	 * @param cardLine - The line number of the card.
	 * @returns An array of headings leading to the card.
	 */
	getQuestionContext(cardLine: number): string[] {
		const fileCachedData = this.metadataCache.getFileCache(this.file) || {};
		const headings: HeadingCache[] = fileCachedData.headings || [];
		const stack: HeadingCache[] = [];
		for (const heading of headings) {
			if (heading.position.start.line > cardLine) {
				break;
			}

			while (
				stack.length > 0 &&
				stack[stack.length - 1].level >= heading.level
			) {
				stack.pop();
			}

			stack.push(heading);
		}

		const result = [];
		for (const headingObj of stack) {
			headingObj.heading = headingObj.heading
				.replace(/\[\^\d+\]/gm, '')
				.trim();
			result.push(headingObj.heading);
		}
		return result;
	}

	/**
	 * Reads the content of the file.
	 * @returns A promise that resolves with the content of the file.
	 */
	async read(): Promise<string> {
		return await this.vault.read(this.file);
	}

	/**
	 * Writes content to the file.
	 * @param content - The content to write to the file.
	 * @returns A promise that resolves when the writing is complete.
	 */
	async write(content: string): Promise<void> {
		await this.vault.modify(this.file, content);
	}
}

export class UnitTestSRFile implements ISRFile {
	content: string;
	_path: string | null;

	constructor(content: string, path: string | null = null) {
		this.content = content;
		this._path = path;
	}

	get path(): string | null {
		return this._path;
	}

	get basename(): string {
		return '';
	}

	getAllTags(): string[] {
		return getAllTagsFromText(this.content);
	}

	getFlashcardTags(flashcardTagsSetting: string[]): string[] {
		return [];
	}

	// eslint-disable-next-line  @typescript-eslint/no-unused-vars
	getQuestionContext(cardLine: number): string[] {
		return [];
	}

	async read(): Promise<string> {
		return this.content;
	}

	async write(content: string): Promise<void> {
		this.content = content;
	}
}
