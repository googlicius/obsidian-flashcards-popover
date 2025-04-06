import Dexie, { Table } from 'dexie';
import { TFile } from 'obsidian';

// Define TypeScript interfaces for your models
export interface FlashcardNote {
	path: string;
	lastModified: Date;
	tags: string[];
	createdAt?: Date;
	updatedAt?: Date;
}

export interface FlashcardNoteMetadata {
	id?: number;
	lastFullScan: Date;
}

// Initialize Dexie database
export class Database extends Dexie {
	flashcardNotes: Table<FlashcardNote, string>;
	flashcardNoteMetadata: Table<FlashcardNoteMetadata, number>;

	constructor(name: string) {
		super(`sr-data-${name.trim()}`);
		this.version(1).stores({
			flashcardNotes: '&path, lastModified, tags, createdAt, updatedAt',
			flashcardNoteMetadata: '++id, lastFullScan',
		});
	}

	async upsertFlashcardNote(file: TFile, tags: string[], existingNote?: FlashcardNote) {
		existingNote = typeof existingNote === 'undefined' ? await this.flashcardNotes.get({ path: file.path }) : existingNote;

		if (existingNote) {
			// Update the existing note
			return this.flashcardNotes.update(existingNote.path, {
				lastModified: new Date(file.stat.mtime),
				tags,
			});
		} else {
			// Insert a new note
			return this.flashcardNotes.add({
				path: file.path,
				lastModified: new Date(file.stat.mtime),
				tags,
			});
		}
	}

	async upsertMetadata(input: FlashcardNoteMetadata) {
		const metadata = await this.flashcardNoteMetadata.limit(1).first();

		if (!metadata) {
			return this.flashcardNoteMetadata.add({
				lastFullScan: input.lastFullScan,
			});
		} else {
			return this.flashcardNoteMetadata.update(metadata.id!, {
				lastFullScan: input.lastFullScan,
			});
		}
	}
}
