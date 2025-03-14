import { TFile } from 'obsidian';

export interface SRSettings {
	// flashcards
	flashcardEasyText: string;
	flashcardGoodText: string;
	flashcardHardText: string;
	flashcardTags: string[];
	convertFoldersToDecks: boolean;
	cardCommentOnSameLine: boolean;
	burySiblingCards: boolean;
	showContextInCards: boolean;
	flashcardHeightPercentage: number;
	flashcardWidthPercentage: number;
	randomizeCardOrder: boolean;
	convertHighlightsToClozes: boolean;
	convertBoldTextToClozes: boolean;
	convertCurlyBracketsToClozes: boolean;
	singleLineCardSeparator: string;
	singleLineReversedCardSeparator: string;
	multilineCardSeparator: string;
	multilineReversedCardSeparator: string;
	editLaterTag: string;
	// notes
	enableNoteReviewPaneOnStartup: boolean;
	tagsToReview: string[];
	noteFoldersToIgnore: string[];
	openRandomNote: boolean;
	autoNextNote: boolean;
	disableFileMenuReviewOptions: boolean;
	maxNDaysNotesReviewQueue: number;
	// UI preferences
	initiallyExpandAllSubdecksInTree: boolean;
	// algorithm
	baseEase: number;
	lapsesIntervalChange: number;
	easyBonus: number;
	maximumInterval: number;
	maxLinkFactor: number;
	// cache settings
	noteCacheRefreshInterval: number; // in hours
	// logging
	showDebugMessages: boolean;
}

export interface PluginData {
	settings: SRSettings;
	buryDate: string;
	// hashes of card texts
	// should work as long as user doesn't modify card's text
	// which covers most of the cases
	buryList: string[];
	historyDeck: string | null;
	noteCache?: FlashcardNoteCache;
}

export interface SchedNote {
	note: TFile;
	dueUnix: number;
}

export interface FlashcardNoteCache {
	version: number;
	lastFullScan: number;
	notes: {
		[path: string]: {
			lastModified: number;
			tags: string[];
		}
	};
}
