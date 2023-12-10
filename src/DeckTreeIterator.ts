import { Card } from './Card';
import { CardListType, Deck } from './Deck';
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
	setDeck(deck: Deck): void;
	deleteCurrentCard(): boolean;
	deleteCurrentQuestion(): boolean;
	moveCurrentCardToEndOfList(): void;
	nextCard(): boolean;
}

class SingleDeckIterator {
	deck: Deck;
	iteratorOrder: IIteratorOrder;
	preferredCardListType: CardListType;
	cardIdx: number | null;
	cardListType?: CardListType;

	get hasCurrentCard(): boolean {
		return this.cardIdx !== null;
	}

	get currentCard(): Card | null {
		if (this.cardIdx == null) return null;
		return this.deck.getCard(this.cardIdx, this.cardListType as any);
	}

	constructor(iteratorOrder: IIteratorOrder) {
		this.iteratorOrder = iteratorOrder;
		this.preferredCardListType =
			this.iteratorOrder.cardListOrder == CardListOrder.DueFirst
				? CardListType.DueCard
				: CardListType.NewCard;
	}

	setDeck(deck: Deck): void {
		this.deck = deck;
		this.setCardListType(undefined);
	}

	private setCardListType(cardListType?: CardListType): void {
		this.cardListType = cardListType;
		this.cardIdx = null;
	}

	nextCard(): boolean {
		// First return cards in the preferred list
		if (this.cardListType == null) {
			this.setCardListType(this.preferredCardListType);
		}

		if (!this.nextCardWithinList()) {
			if (this.cardListType == this.preferredCardListType) {
				// Nothing left in the preferred list, so try the non-preferred list type
				this.setCardListType(Deck.otherListType(this.cardListType));
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
		let result = false;
		const cardList: Card[] = this.deck.getCardListForCardType(
			this.cardListType as any,
		);

		// Delete the current card so we don't return it again
		if (this.hasCurrentCard) {
			this.deleteCurrentCard();
		}
		result = cardList.length > 0;
		if (result) {
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
		}
		return result;
	}

	deleteCurrentQuestion(): void {
		this.ensureCurrentCard();
		const q: Question = this.currentCard!.question;

		// A question could have some cards in the new list and some in the due list
		this.deleteQuestionFromList(q, CardListType.NewCard);
		this.deleteQuestionFromList(q, CardListType.DueCard);

		this.setNoCurrentCard();
	}

	private deleteQuestionFromList(
		q: Question,
		cardListType: CardListType,
	): void {
		const cards: Card[] = this.deck.getCardListForCardType(cardListType);
		for (let i = cards.length - 1; i >= 0; i--) {
			if (Object.is(q, cards[i].question))
				this.deck.deleteCardAtIndex(i, cardListType);
		}
	}

	deleteCurrentCard(): void {
		this.ensureCurrentCard();
		this.deck.deleteCardAtIndex(
			this.cardIdx as any,
			this.cardListType as any,
		);
		this.setNoCurrentCard();
	}

	moveCurrentCardToEndOfList(): void {
		this.ensureCurrentCard();
		const cardList: Card[] = this.deck.getCardListForCardType(
			this.cardListType as any,
		);
		if (cardList.length === 0) return;
		const card = this.currentCard;
		this.deck.deleteCardAtIndex(
			this.cardIdx as number,
			this.cardListType as any,
		);
		this.deck.appendCard(TopicPath.emptyPath, card as any);
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
	preferredCardListType: CardListType;
	iteratorOrder: IIteratorOrder;
	deckSource: IteratorDeckSource;

	singleDeckIterator: SingleDeckIterator;
	deckArray: Deck[];
	deckIdx?: number;

	get hasCurrentCard(): boolean {
		return this.deckIdx != null && this.singleDeckIterator.hasCurrentCard;
	}

	get currentDeck(): Deck | null {
		if (this.deckIdx == null) return null;
		return this.deckArray[this.deckIdx];
	}

	get currentCard(): Card | null {
		if (this.deckIdx == null || !this.singleDeckIterator.hasCurrentCard)
			return null;
		return this.singleDeckIterator.currentCard;
	}

	constructor(iteratorOrder: IIteratorOrder, deckSource: IteratorDeckSource) {
		this.singleDeckIterator = new SingleDeckIterator(iteratorOrder);
		this.iteratorOrder = iteratorOrder;
		this.deckSource = deckSource;
	}

	setDeck(deck: Deck): void {
		// We don't want to change the supplied deck, so first clone
		if (this.deckSource == IteratorDeckSource.CloneBeforeUse)
			deck = deck.clone();

		this.deckTree = deck;
		this.deckArray = deck.toDeckArray();
		this.setDeckIdx(undefined);
	}

	private setDeckIdx(deckIdx?: number): void {
		this.deckIdx = deckIdx;
		if (deckIdx != null)
			this.singleDeckIterator.setDeck(this.deckArray[deckIdx]);
	}

	nextCard(): boolean {
		let result = false;
		if (this.deckIdx == null) {
			this.setDeckIdx(0);
		}
		while ((this.deckIdx as any) < this.deckArray.length) {
			if (this.singleDeckIterator.nextCard()) {
				result = true;
				break;
			}
			(this.deckIdx as any)++;
			if ((this.deckIdx as any) < this.deckArray.length) {
				this.singleDeckIterator.setDeck(
					this.deckArray[this.deckIdx as any],
				);
			}
		}
		if (!result) this.deckIdx = undefined;
		return result;
	}

	deleteCurrentQuestion(): boolean {
		this.singleDeckIterator.deleteCurrentQuestion();
		return this.nextCard();
	}

	deleteCurrentCard(): boolean {
		this.singleDeckIterator.deleteCurrentCard();
		return this.nextCard();
	}

	moveCurrentCardToEndOfList(): void {
		this.singleDeckIterator.moveCurrentCardToEndOfList();
	}
}
