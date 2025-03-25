import { Card } from './Card';
import { CardScheduleInfo, ICardScheduleCalculator } from './CardSchedule';
import { CardListType, Deck } from './Deck';
import { IDeckTreeIterator } from './DeckTreeIterator';
import { Note } from './Note';
import { Question } from './Question';
import { IQuestionPostponementList } from './QuestionPostponementList';
import { QuestionText } from './QuestionText';
import { TopicPath } from './TopicPath';
import { SRSettings } from './interfaces';
import { ReviewResponse } from './scheduling';

export interface IFlashcardReviewSequencer {
	get hasCurrentCard(): boolean;
	get currentCard(): Card | null;
	get currentQuestion(): Question | null;
	get currentNote(): Note | null;
	get currentDeck(): Deck | null;
	get originalDeckTree(): Deck;
	readonly deckTreeIterator: IDeckTreeIterator;

	setDeckTree(originalDeckTree: Deck, remainingDeckTree: Deck): void;
	setCurrentDeckTree(topicPath: TopicPath): void;
	getDeckStats(topicPath: TopicPath): DeckStats;
	skipCurrentCard(): void;
	determineCardSchedule(
		response: ReviewResponse,
		card: Card,
	): CardScheduleInfo;
	processReview(response: ReviewResponse): Promise<void>;
	updateCurrentQuestionText(text: string): Promise<void>;
	moveCurrentCardToEndOfList(): void;
}

export class DeckStats {
	dueCount: number;
	newCount: number;
	totalCount: number;

	constructor(dueCount: number, newCount: number, totalCount: number) {
		this.dueCount = dueCount;
		this.newCount = newCount;
		this.totalCount = totalCount;
	}
}

export enum FlashcardReviewMode {
	Cram,
	Review,
}

/**
 * The FlashcardReviewSequencer class is responsible for managing the review sequence of flashcards.
 * It determines the order in which flashcards are reviewed, processes user responses, and updates card schedules.
 */
export class FlashcardReviewSequencer implements IFlashcardReviewSequencer {
	private _originalDeckTree: Deck;
	private remainingDeckTree: Deck;
	private reviewMode: FlashcardReviewMode;
	private settings: SRSettings;
	private cardScheduleCalculator: ICardScheduleCalculator;
	private questionPostponementList: IQuestionPostponementList;
	readonly deckTreeIterator: IDeckTreeIterator;

	constructor(
		reviewMode: FlashcardReviewMode,
		deckTreeIterator: IDeckTreeIterator,
		settings: SRSettings,
		cardScheduleCalculator: ICardScheduleCalculator,
		questionPostponementList: IQuestionPostponementList,
	) {
		this.reviewMode = reviewMode;
		this.deckTreeIterator = deckTreeIterator;
		this.settings = settings;
		this.cardScheduleCalculator = cardScheduleCalculator;
		this.questionPostponementList = questionPostponementList;
	}

	get hasCurrentCard(): boolean {
		return this.deckTreeIterator.currentCard != null;
	}

	get currentCard(): Card | null {
		return this.deckTreeIterator.currentCard;
	}

	get currentQuestion(): Question | null {
		return this.currentCard?.question || null;
	}

	get currentDeck(): Deck | null {
		return this.deckTreeIterator.currentDeck;
	}

	get currentNote(): Note | null {
		return this.currentQuestion?.note || null;
	}

	/**
	 * Sets the deck tree for the review sequencer.
	 * @param originalDeckTree - The original deck tree.
	 * @param remainingDeckTree - The remaining deck tree.
	 */
	setDeckTree(originalDeckTree: Deck, remainingDeckTree: Deck): void {
		this._originalDeckTree = originalDeckTree;
		this.remainingDeckTree = remainingDeckTree;
		this.setCurrentDeckTree(TopicPath.emptyPath);
	}

	/**
	 * Sets the current deck for the review sequencer.
	 * @param topicPath - The topic path of the deck to be set as current.
	 */
	setCurrentDeckTree(topicPath: TopicPath): void {
		const deckTree: Deck = this.remainingDeckTree.getDeck(topicPath);
		this.deckTreeIterator.setDeckTree(deckTree);
		this.deckTreeIterator.nextCard();
	}

	get originalDeckTree(): Deck {
		return this._originalDeckTree;
	}

	/**
	 * Gets the deck stats for a given topic path.
	 * @param topicPath - The topic path of the deck.
	 * @returns The deck stats.
	 */
	getDeckStats(topicPath: TopicPath): DeckStats {
		const totalCount: number = this._originalDeckTree
			.getDeck(topicPath)
			.getCardCount(CardListType.All, true);
		const remainingDeck: Deck = this.remainingDeckTree.getDeck(topicPath);
		const newCount: number = remainingDeck.getCardCount(
			CardListType.NewCard,
			true,
		);
		const dueCount: number = remainingDeck.getCardCount(
			CardListType.DueCard,
			true,
		);
		return new DeckStats(dueCount, newCount, totalCount);
	}

	/**
	 * Skips the current card in the review sequence.
	 */
	skipCurrentCard(): void {
		this.deckTreeIterator.deleteCurrentQuestionAndMoveNextCard();
	}

	moveCurrentCardToEndOfList(): void {
		this.deckTreeIterator.moveCurrentCardToEndOfList();
	}

	/**
	 * Processes the user's review response.
	 * @param response - The user's review response.
	 */
	async processReview(response: ReviewResponse): Promise<void> {
		switch (this.reviewMode) {
			case FlashcardReviewMode.Review:
				await this.processReview_ReviewMode(response);
				break;

			case FlashcardReviewMode.Cram:
				await this.processReview_CramMode(response);
				break;
		}
	}

	async processReview_ReviewMode(response: ReviewResponse): Promise<void> {
		this.currentCard!.scheduleInfo = this.determineCardSchedule(
			response,
			this.currentCard as Card,
		);

		// Update the source file with the updated schedule
		await this.currentQuestion!.writeQuestion(this.settings);

		// Move/delete the card
		if (response == ReviewResponse.Reset) {
			this.deckTreeIterator.moveCurrentCardToEndOfList();
		} else {
			if (this.settings.burySiblingCards) {
				await this.burySiblingCards();
				this.deckTreeIterator.burySiblings();
			}
		}
		this.deckTreeIterator.nextCard();
	}

	private async burySiblingCards(): Promise<void> {
		// We check if there are any sibling cards still in the deck,
		// We do this because otherwise we would be adding every reviewed card to the postponement list, even for a
		// question with a single card. That isn't consistent with the 1.10.1 behavior
		const remaining = this.currentDeck!.getQuestionCardCount(
			this.currentQuestion as Question,
		);
		if (remaining > 1) {
			this.questionPostponementList.add(this.currentQuestion as Question);
			await this.questionPostponementList.write();
		}
	}

	async processReview_CramMode(response: ReviewResponse): Promise<void> {
		if (response == ReviewResponse.Easy)
			this.deckTreeIterator.deleteCurrentCardAndMoveNextCard();
		else {
			this.deckTreeIterator.moveCurrentCardToEndOfList();
			this.deckTreeIterator.nextCard();
		}
	}

	/**
	 * Determines the card schedule based on the user's review response.
	 * @param response - The user's review response.
	 * @param card - The card being reviewed.
	 * @returns The updated card schedule.
	 */
	determineCardSchedule(
		response: ReviewResponse,
		card: Card,
	): CardScheduleInfo {
		let result: CardScheduleInfo;

		if (response == ReviewResponse.Reset) {
			// Resetting the card schedule
			result = this.cardScheduleCalculator.getResetCardSchedule();
		} else {
			// scheduled card
			if (card.hasSchedule) {
				result = this.cardScheduleCalculator.calcUpdatedSchedule(
					response,
					card.scheduleInfo as CardScheduleInfo,
				);
			} else {
				const currentNote: Note = card.question.note;
				result = this.cardScheduleCalculator.getNewCardSchedule(
					response,
					currentNote.filePath as string,
				);
			}
		}
		return result;
	}

	/**
	 * Updates the text of the current question.
	 * @param text - The new text for the question.
	 */
	async updateCurrentQuestionText(text: string): Promise<void> {
		const q: QuestionText = this.currentQuestion!.questionText;

		q.actualQuestion = text;

		await this.currentQuestion!.writeQuestion(this.settings);
	}
}
