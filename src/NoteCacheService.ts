import { App, getAllTags, TFile } from 'obsidian';
import { PluginData } from './interfaces';
import { Database, FlashcardNote } from './db';

export class NoteCacheService {
	private flashcardNotes: { [x: string]: FlashcardNote };
	private db: Database;

	constructor(
		private app: App,
		private pluginData: PluginData,
	) {
		this.db = new Database(app.vault.getName());
		this.ensureAllNotesLoaded();
	}

	get cachedNotes() {
		return this.flashcardNotes;
	}

	private async ensureAllNotesLoaded(reload = false): Promise<void> {
		if (!this.flashcardNotes || reload) {
			this.flashcardNotes = {};
			// const notes = await this.prisma.flashcardNote.findMany();
			const notes = await this.db.flashcardNotes.toArray();
			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				this.flashcardNotes[note.path] = note;
			}
		}
	}

	/**
	 * Updates the cache for a single file
	 */
	async updateNoteCacheForFile(file: TFile) {
		const fileCachedData = this.app.metadataCache.getFileCache(file);

		if (!fileCachedData) return;

		const tags = getAllTags(fileCachedData) || [];

		// Check if the file has any flashcard tags
		const hasFlashcardTags = this.pluginData.settings.flashcardTags.some(
			(flashcardTag) =>
				tags.some(
					(tag) =>
						tag === flashcardTag ||
						tag.startsWith(flashcardTag + '/'),
				),
		);

		if (hasFlashcardTags) {
			// Update or create the cache entry in the database
			await this.db.upsertFlashcardNote(file, tags);

			this.flashcardNotes[file.path] = {
				path: file.path,
				lastModified: new Date(),
				tags,
			};

			return file.path;
		}

		
		// Remove from cache if it exists but no longer has flashcard tags
		if (this.flashcardNotes[file.path]) {
			delete this.flashcardNotes[file.path];
			return this.db.flashcardNotes.delete(file.path);
		}
	}

	async deleteNoteCache(file: TFile) {
		const fileCachedData = this.app.metadataCache.getFileCache(file);
		delete this.flashcardNotes[file.path];
		
		if (!fileCachedData) {
			return;
		}

		await this.db.flashcardNotes.delete(file.path);
	}

	async getNotesToProcess(): Promise<TFile[]> {
		const notesToProcess: TFile[] = [];
		await this.ensureAllNotesLoaded();

		for (const key in this.flashcardNotes) {
			const note = this.flashcardNotes[key];
			const file = this.app.vault.getAbstractFileByPath(note.path);
			if (file instanceof TFile) {
				notesToProcess.push(file);
			}
		}

		return notesToProcess;
	}

	/**
	 * Updates the note cache by scanning for files with flashcard tags
	 */
	async updateNoteCache(forceFullScan = false) {
		const startTime = performance.now();

		const metadata = await this.db.flashcardNoteMetadata.limit(1).first();
		const lastFullScan = metadata ? metadata.lastFullScan.getTime() : 0;
		const cacheAge = Date.now() - lastFullScan;
		const refreshIntervalMs =
			this.pluginData.settings.noteCacheRefreshInterval * 60 * 60 * 1000; // Convert hours to ms
		const needsFullScan = cacheAge > refreshIntervalMs;
		const allFiles = this.app.vault.getMarkdownFiles();

		await this.ensureAllNotesLoaded(needsFullScan || forceFullScan);

		if (needsFullScan || forceFullScan) {
			if (this.pluginData.settings.showDebugMessages) {
				console.log('SR: Performing full note cache scan');
			}

			// Use a transaction for the full scan
			await this.db.transaction('rw', [this.db.flashcardNoteMetadata, this.db.flashcardNotes], async () => {
				// Update or create metadata for the last full scan
				await this.db.upsertMetadata({ lastFullScan: new Date() })
	
				for (const file of allFiles) {
					if (
						this.pluginData.settings.noteFoldersToIgnore.some(
							(folder) => file.path.startsWith(folder),
						)
					) {
						continue;
					}
					
					await this.updateNoteCacheForFile(file);
				}
			});
		} else {
			// For partial updates, use a transaction as well
			await this.db.transaction('rw', [this.db.flashcardNotes], async () => {
				for (const file of allFiles) {
					if (
						this.pluginData.settings.noteFoldersToIgnore.some(
							(folder) => file.path.startsWith(folder),
						)
					) {
						continue;
					}
					const cachedNote = this.flashcardNotes[file.path];
	
					// If the file is not in cache or has been modified, update it
					if (
						!cachedNote ||
						cachedNote.lastModified.getTime() < file.stat.mtime
					) {
						await this.updateNoteCacheForFile(file);
					}
				}
			});

			// Remove deleted files from cache
			// const cachedPaths = Object.keys(this.flashcardNotes);
			// for (const path of cachedPaths) {
			// 	if (!allFiles.some((file) => file.path === path)) {
			// 		delete this.flashcardNotes[path];
			// 	}
			// }
		}

		const endTime = performance.now();
		const executionTime = endTime - startTime;

		if (this.pluginData.settings.showDebugMessages) {
			console.log(`updateNoteCache - SR: Note cache update completed in ${executionTime.toFixed(2)}ms`);
		}
	}

	/**
	 * Gets statistics about the note cache
	 */
	async getCacheStats(): Promise<{ totalNotes: number; cacheAge: string }> {
		const metadata = await this.db.flashcardNoteMetadata.limit(1).first();
		if (!metadata) {
			return { totalNotes: 0, cacheAge: 'Not initialized' };
		}

		const totalNotes = Object.keys(this.flashcardNotes).length;
		const cacheAgeMs = Date.now() - metadata.lastFullScan.getTime();

		// Format the cache age
		let cacheAge: string;
		if (cacheAgeMs < 60 * 1000) {
			cacheAge = `${Math.round(cacheAgeMs / 1000)} seconds`;
		} else if (cacheAgeMs < 60 * 60 * 1000) {
			cacheAge = `${Math.round(cacheAgeMs / (60 * 1000))} minutes`;
		} else if (cacheAgeMs < 24 * 60 * 60 * 1000) {
			cacheAge = `${Math.round(cacheAgeMs / (60 * 60 * 1000))} hours`;
		} else {
			cacheAge = `${Math.round(cacheAgeMs / (24 * 60 * 60 * 1000))} days`;
		}

		return { totalNotes, cacheAge };
	}
}
