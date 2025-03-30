import { Card } from './Card';
import { FlashcardReviewMode } from './FlashcardReviewSequencer';
import { Question } from './Question';
import { IQuestionPostponementList } from './QuestionPostponementList';
import { TopicPath } from './TopicPath';

export enum CardListType {
	NewCard,
	DueCard,
	All,
}

export class Deck {
	public deckName: string;
	public newFlashcards: Card[];
	public dueFlashcards: Card[];
	public subdecks: Deck[];
	public parent: Deck | null;
	public preferredCardListType: CardListType | null = null;

	constructor(deckName: string, parent: Deck | null) {
		this.deckName = deckName;
		this.newFlashcards = [];
		this.dueFlashcards = [];
		this.subdecks = [];
		this.parent = parent;
	}

	public getCardCount(
		cardListType: CardListType,
		includeSubdeckCounts: boolean,
	): number {
		let result = 0;
		if (
			cardListType == CardListType.NewCard ||
			cardListType == CardListType.All
		)
			result += this.newFlashcards.length;
		if (
			cardListType == CardListType.DueCard ||
			cardListType == CardListType.All
		)
			result += this.dueFlashcards.length;

		if (includeSubdeckCounts) {
			for (const deck of this.subdecks) {
				result += deck.getCardCount(cardListType, includeSubdeckCounts);
			}
		}
		return result;
	}

	//
	// Returns a count of the number of this question's cards are present in this deck.
	// (The returned value would be <= question.cards.length)
	//
	public getQuestionCardCount(question: Question): number {
		let result = 0;
		result += this.getQuestionCardCountForCardListType(
			question,
			this.newFlashcards,
		);
		result += this.getQuestionCardCountForCardListType(
			question,
			this.dueFlashcards,
		);
		return result;
	}

	private getQuestionCardCountForCardListType(
		question: Question,
		cards: Card[],
	): number {
		let result = 0;
		for (let i = 0; i < cards.length; i++) {
			// const card = cards[i];
			if (Object.is(question, cards[i].question)) result++;
		}
		return result;
	}

	static get emptyDeck(): Deck {
		return new Deck('Root', null);
	}

	get isRootDeck() {
		return this.parent == null;
	}

	getDeck(topicPath: TopicPath): Deck {
		const desk = this._getOrCreateDeck(topicPath, false) as Deck;
		return desk;
	}

	getOrCreateDeck(topicPath: TopicPath): Deck {
		return this._getOrCreateDeck(topicPath, true) as Deck;
	}

	private _getOrCreateDeck(
		topicPath: TopicPath,
		createAllowed: boolean,
	): Deck | null {
		if (!topicPath) {
			console.warn('Something wrong with topicPath here');
			return this;
		}
		if (!topicPath.hasPath) {
			return this;
		}
		const t: TopicPath = topicPath.clone();
		const deckName = t.shift() as string;
		for (const subdeck of this.subdecks) {
			if (deckName === subdeck.deckName) {
				return subdeck._getOrCreateDeck(t, createAllowed);
			}
		}

		let result: Deck | null = null;
		if (createAllowed) {
			const subdeck: Deck = new Deck(deckName, this /* parent */);
			this.subdecks.push(subdeck);
			result = subdeck._getOrCreateDeck(t, createAllowed);
		}
		return result;
	}

	getTopicPath(): TopicPath {
		const list: string[] = [];
		// eslint-disable-next-line  @typescript-eslint/no-this-alias
		let deck: Deck = this;
		while (!deck.isRootDeck) {
			list.push(deck.deckName);
			deck = deck.parent as Deck;
		}
		return new TopicPath(list.reverse());
	}

	getRootDeck(): Deck {
		// eslint-disable-next-line  @typescript-eslint/no-this-alias
		let deck: Deck = this;
		while (!deck.isRootDeck) {
			deck = deck.parent as Deck;
		}
		return deck;
	}

	/**
	 * @deprecated Not use index anymore
	 */
	getCard(index: number, cardListType: CardListType): Card {
		const cardList: Card[] = this.getCardListForCardType(cardListType);
		return cardList[index];
	}

	getCardListForCardType(cardListType: CardListType): Card[] {
		switch (cardListType) {
			case CardListType.DueCard:
				return this.dueFlashcards;
			case CardListType.NewCard:
				return this.newFlashcards;
			case CardListType.All:	
				return [...this.newFlashcards, ...this.dueFlashcards];
			default:
				throw new Error('Invalid card list type');
		}
	}

	appendCard(topicPath: TopicPath, cardObj: Card): void {
		const deck: Deck = this.getOrCreateDeck(topicPath) as Deck;
		const cardList: Card[] = deck.getCardListForCardType(
			cardObj.cardListType,
		);

		cardList.push(cardObj);
	}

	addCards(cards: Card[]): void {
		for (const card of cards) {
			if (card.isNew) {
				this.newFlashcards.push(card);
			} else {
				this.dueFlashcards.push(card);
			}
		}
	}

	deleteCard(card: Card): boolean {
		let idx = this.newFlashcards.indexOf(card);
		
		if (idx != -1) {
			this.newFlashcards.splice(idx, 1);
			return true;
		}

		idx = this.dueFlashcards.indexOf(card);

		if (idx != -1) {
			this.dueFlashcards.splice(idx, 1);
			return true;
		}

		return false;
	}

	/**
	 * Delete card by front and back, this function mutate the listCard
	 */
	deleteCardByCriteria(front: string, back: string, listCard: Card[]) {
		const foundCard = listCard.find((card) => card.back === back && card.front === front);

		if (foundCard) {
			const idx = listCard.indexOf(foundCard);
			listCard.splice(idx, 1);
			return true;
		}

		return false;
	}

	deleteCardAtIndex(index: number, cardListType: CardListType): void {
		const cardList: Card[] = this.getCardListForCardType(cardListType);
		cardList.splice(index, 1);
	}

	toDeckArray(): Deck[] {
		const result: Deck[] = [];
		result.push(this);
		for (const subdeck of this.subdecks) {
			result.push(...subdeck.toDeckArray());
		}
		return result;
	}

	sortSubdecksList(): void {
		this.subdecks.sort((a, b) => {
			if (a.deckName < b.deckName) {
				return -1;
			} else if (a.deckName > b.deckName) {
				return 1;
			}
			return 0;
		});

		for (const deck of this.subdecks) {
			deck.sortSubdecksList();
		}
	}

	debugLogToConsole(desc: string | null = null) {
		let str: string = desc != null ? `${desc}: ` : '';
		console.log((str += this.toString()));
	}

	toString(indent = 0): string {
		let result = '';
		let indentStr: string = ' '.repeat(indent * 4);

		result += `${indentStr}${this.deckName}\r\n`;
		indentStr += '  ';
		for (let i = 0; i < this.newFlashcards.length; i++) {
			const card = this.newFlashcards[i];
			result += `${indentStr}New: ${i}: ${card.front}::${card.back}\r\n`;
		}
		for (let i = 0; i < this.dueFlashcards.length; i++) {
			const card = this.dueFlashcards[i];
			const s = card.isDue ? 'Due' : 'Not due';
			result += `${indentStr}${s}: ${i}: ${card.front}::${card.back}\r\n`;
		}

		for (const subdeck of this.subdecks) {
			result += subdeck.toString(indent + 1);
		}
		return result;
	}

	clone(): Deck {
		return this.copyWithCardFilter(() => true);
	}

	copyWithCardFilter(
		predicate: (value: Card) => boolean,
		parent: Deck | null = null,
	): Deck {
		const result: Deck = new Deck(this.deckName, parent);
		result.newFlashcards = [
			...this.newFlashcards.filter((card) => predicate(card)),
		];
		result.dueFlashcards = [
			...this.dueFlashcards.filter((card) => predicate(card)),
		];

		for (const s of this.subdecks) {
			const newParent = result;
			const newDeck = s.copyWithCardFilter(predicate, newParent);
			result.subdecks.push(newDeck);
		}
		return result;
	}

	static otherListType(cardListType: CardListType): CardListType | null {
		let result: CardListType;

		if (cardListType == CardListType.NewCard) {
			result = CardListType.DueCard;
		}
		else if (cardListType == CardListType.DueCard || cardListType == CardListType.All) {
			result = CardListType.NewCard;
		}
		else {
			return null;
		}

		return result;
	}
}

export class DeckTreeFilter {
	static filterForReviewableCards(reviewableDeckTree: Deck): Deck {
		return reviewableDeckTree.copyWithCardFilter(
			(card) => !card.question.hasEditLaterTag,
		);
	}

	static filterForRemainingCards(
		questionPostponementList: IQuestionPostponementList,
		deckTree: Deck,
		reviewMode: FlashcardReviewMode,
	): Deck {
		return deckTree.copyWithCardFilter(
			(card) =>
				(reviewMode == FlashcardReviewMode.Cram ||
					card.isNew ||
					card.isDue) &&
				!questionPostponementList.includes(card.question),
		);
	}
}
