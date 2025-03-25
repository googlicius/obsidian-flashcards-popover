import { Card } from './Card';
import { CardListType, Deck } from './Deck';
import { CardType } from './enums';
import { Question } from './Question';
import { TopicPath } from './TopicPath';
import { globalRandomNumberProvider } from './util/RandomNumberProvider';

export enum CardListOrder {
	NewFirst,
	DueFirst,
	Random,
}
export enum OrderMethod {
	Sequential,
	Random,
}
export enum IteratorDeckSource {
	UpdatedByIterator,
	CloneBeforeUse,
}

export interface IIteratorOrder {
	// Choose decks in sequential order, or randomly
	deckOrder: OrderMethod;

	// Within a deck, choose: new cards first, due cards first, or randomly
	cardListOrder: CardListOrder;

	// Within a card list (i.e. either new or due), choose cards sequentially or randomly
	cardOrder: OrderMethod;
}

export interface IDeckTreeIterator {
	get currentDeck(): Deck | null;
	get currentCard(): Card | null;
	get hasCurrentCard(): boolean;
	setDeckTree(deck: Deck): void;
	deleteCurrentCardAndMoveNextCard(): boolean;
	deleteCurrentQuestionAndMoveNextCard(): boolean;
	burySiblings(): void;
	moveCurrentCardToEndOfList(): void;
	nextCard(): boolean;
	addFollowUpDeck(deck: Deck, topicPath: TopicPath): void;
}

class SingleDeckIterator {
	deck: Deck;
	iteratorOrder: IIteratorOrder;
	cardIdx: number | null;
	cardListType?: CardListType;

	get hasCurrentCard(): boolean {
		return this.cardIdx !== null;
	}

	get currentCard(): Card | null {
		if (this.cardIdx == null || this.cardListType == null) return null;
		return this.deck.getCard(this.cardIdx, this.cardListType);
	}

	get preferredCardListType() {
		if (this.deck.preferredCardListType) {
			return this.deck.preferredCardListType;
		}
		return this.iteratorOrder.cardListOrder == CardListOrder.DueFirst
			? CardListType.DueCard
			: CardListType.NewCard;
	}

	constructor(iteratorOrder: IIteratorOrder) {
		this.iteratorOrder = iteratorOrder;
	}

	setDeck(deck: Deck): void {
		this.deck = deck;
		this.setCardListType(undefined);
	}

	private setCardListType(cardListType: CardListType | undefined): void {
		this.cardListType = cardListType;
		this.cardIdx = null;
	}

	nextCard(): boolean {
		// First return cards in the preferred list
		if (this.cardListType == null) {
			this.setCardListType(this.preferredCardListType);
		}

		if (!this.nextCardWithinList()) {
			const otherListType = Deck.otherListType(this.cardListType!);
			if (
				this.cardListType == this.preferredCardListType &&
				otherListType !== null
			) {
				// Nothing left in the preferred list, so try the non-preferred list type
				this.setCardListType(otherListType);
				if (!this.nextCardWithinList()) {
					this.setCardListType(undefined);
				}
			} else {
				this.cardIdx = null;
			}
		}
		return this.cardIdx != null;
	}

	private nextCardWithinList(): boolean {
		const cardList: Card[] = this.deck.getCardListForCardType(
			this.cardListType!,
		);

		let currentSequenceId = '';
		let nextToSequenceId = '';
		const cardIdx = this.cardIdx;

		if (this.hasCurrentCard) {
			currentSequenceId = this.currentCard!.question.sequenceId;
			nextToSequenceId = cardList[cardIdx! + 1]?.question.sequenceId;

			this.deleteCurrentCard();
		}

		if (cardList.length === 0) {
			return false;
		}

		if (currentSequenceId && nextToSequenceId === currentSequenceId) {
			this.cardIdx = cardIdx || 0;
			return true;
		}

		switch (this.iteratorOrder.cardOrder) {
			case OrderMethod.Sequential:
				this.cardIdx = 0;
				break;
			case OrderMethod.Random:
				this.cardIdx = globalRandomNumberProvider.getInteger(
					0,
					cardList.length - 1,
				);
				break;
		}

		const nextSequenceId = cardList[this.cardIdx!].question.sequenceId;

		if (
			(!currentSequenceId && nextSequenceId) ||
			(currentSequenceId &&
				nextSequenceId &&
				currentSequenceId !== nextSequenceId)
		) {
			// Iterate to the first card with a sequenceId
			while (
				this.cardIdx! < cardList.length &&
				cardList[this.cardIdx! - 1] &&
				cardList[this.cardIdx! - 1].question.sequenceId ===
					nextSequenceId
			) {
				this.cardIdx!--;
			}
		}

		return true;
	}

	deleteCurrentQuestion(): void {
		this.ensureCurrentCard();
		const q: Question = this.currentCard!.question;

		// A question could have some cards in the new list and some in the due list
		this.deleteQuestionFromList(q, CardListType.NewCard);
		this.deleteQuestionFromList(q, CardListType.DueCard);

		this.setNoCurrentCard();
	}

	burySiblings() {
		if (!this.hasCurrentCard) return;


		if (
			[CardType.MultiLineReversed, CardType.SingleLineReversed].includes(
				this.currentCard!.question.questionType,
			)
		) {
			const siblingCard = this.currentCard!.question.cards.find(
				(item) => !Object.is(item, this.currentCard),
			);
			if (siblingCard) {
				this.deck.deleteCard(siblingCard);
			}
		}
	}

	private deleteQuestionFromList(
		q: Question,
		cardListType: CardListType,
	): void {
		const cards: Card[] = this.deck.getCardListForCardType(cardListType);
		for (let i = cards.length - 1; i >= 0; i--) {
			if (Object.is(q, cards[i].question)) {
				this.deck.deleteCardAtIndex(i, cardListType);
			}
		}
	}

	deleteCurrentCard(): void {
		try {
			this.ensureCurrentCard();
			this.deck.deleteCard(this.currentCard!);
			this.setNoCurrentCard();
		} catch (error) {
			console.log('ERR', error);
		}
	}

	moveCurrentCardToEndOfList(): void {
		this.ensureCurrentCard();
		const cardList: Card[] = this.deck.getCardListForCardType(
			this.cardListType!,
		);
		if (cardList.length === 0) return;
		const card = this.currentCard;
		this.deck.deleteCardAtIndex(this.cardIdx as number, this.cardListType!);
		this.deck.appendCard(TopicPath.emptyPath, card!);
		this.setNoCurrentCard();
	}

	private setNoCurrentCard() {
		this.cardIdx = null;
	}

	private ensureCurrentCard() {
		if (this.cardIdx == null || this.cardListType == null)
			throw 'no current card';
	}
}

export class DeckTreeIterator implements IDeckTreeIterator {
	deckTree: Deck;
	deckSource: IteratorDeckSource;

	singleDeckIterator: SingleDeckIterator;
	deckArray: Deck[];

	get hasCurrentCard(): boolean {
		return this.singleDeckIterator.hasCurrentCard;
	}

	get currentDeck(): Deck | null {
		return this.singleDeckIterator.deck || null;
	}

	get currentCard(): Card | null {
		if (!this.singleDeckIterator.hasCurrentCard) return null;
		return this.singleDeckIterator.currentCard;
	}

	constructor(iteratorOrder: IIteratorOrder, deckSource: IteratorDeckSource) {
		this.singleDeckIterator = new SingleDeckIterator(iteratorOrder);
		this.deckSource = deckSource;
	}

	setDeckTree(deckTree: Deck): void {
		// We don't want to change the supplied deck, so first clone
		if (this.deckSource == IteratorDeckSource.CloneBeforeUse)
			deckTree = deckTree.clone();

		this.deckTree = deckTree;
		this.deckArray = deckTree.toDeckArray();
		this.singleDeckIterator.setDeck(this.getNextDeck()!);
	}

	addFollowUpDeck(deck: Deck, topicPath: TopicPath): void {
		// By adding follow-up deck, it means current card has just reviewed, so delete it.
		this.singleDeckIterator.deleteCurrentCard();
		this.deckArray.unshift(this.singleDeckIterator.deck);
		this.singleDeckIterator.setDeck(deck);

		// Remove the cards are added in follow-up deck from the other decks.
		// Currently remove the last path
		const foundDeck = this.deckArray.find(
			(item) => item.deckName === topicPath.path.last(),
		);

		if (foundDeck) {
			const allCards = [...deck.newFlashcards, ...deck.dueFlashcards];
			for (const card of allCards) {
				foundDeck.deleteCardByCriteria(
					card.front,
					card.back,
					foundDeck.newFlashcards,
				);
				foundDeck.deleteCardByCriteria(
					card.front,
					card.back,
					foundDeck.dueFlashcards,
				);
			}
		}
	}

	private getNextDeck(): Deck | null {
		return this.deckArray.shift() || null;
	}

	/**
	 * Moves to the next card in the deck tree.
	 *
	 * This method iterates through the cards in the current deck using the singleDeckIterator.
	 * If there are no more cards in the current deck, it moves to the next deck in the deckArray.
	 * This process continues until a card is found or all decks have been exhausted.
	 *
	 * @returns {boolean} True if a next card was found, false if there are no more cards in any deck.
	 */
	nextCard(): boolean {
		let currentDeck: Deck | null = this.singleDeckIterator.deck;

		if (!currentDeck && this.deckArray.length > 0) {
			currentDeck = this.getNextDeck()!;
			this.singleDeckIterator.setDeck(currentDeck);
		}

		while (currentDeck) {
			if (this.singleDeckIterator.nextCard()) {
				return true;
			}

			currentDeck = this.getNextDeck();

			if (currentDeck) {
				this.singleDeckIterator.setDeck(currentDeck);
			}
		}

		return false;
	}

	deleteCurrentQuestionAndMoveNextCard(): boolean {
		this.singleDeckIterator.deleteCurrentQuestion();
		return this.nextCard();
	}

	burySiblings(): void {
		this.singleDeckIterator.burySiblings();
	}

	deleteCurrentCardAndMoveNextCard(): boolean {
		this.singleDeckIterator.deleteCurrentCard();
		return this.nextCard();
	}

	moveCurrentCardToEndOfList(): void {
		this.singleDeckIterator.moveCurrentCardToEndOfList();
	}
}
