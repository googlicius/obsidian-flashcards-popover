import { Card } from './Card';
import { CardScheduleInfo } from './CardSchedule';
import { Deck } from './Deck';
import {
	CardListOrder,
	DeckTreeIterator,
	IDeckTreeIterator,
	IIteratorOrder,
	IteratorDeckSource,
	OrderMethod,
} from './DeckTreeIterator';
import { Stats } from './stats';

export class DeckTreeStatsCalculator {
	calculate(deckTree: Deck): Stats {
		// Order doesn't matter as long as we iterate over everything
		const iteratorOrder: IIteratorOrder = {
			deckOrder: OrderMethod.Sequential,
			cardListOrder: CardListOrder.DueFirst,
			cardOrder: OrderMethod.Sequential,
		};
		const iterator: IDeckTreeIterator = new DeckTreeIterator(
			iteratorOrder,
			IteratorDeckSource.CloneBeforeUse,
		);
		const result = new Stats();
		iterator.setDeckTree(deckTree);
		while (iterator.nextCard()) {
			const card = iterator.currentCard as Card;
			if (card.hasSchedule) {
				const schedule = card.scheduleInfo as CardScheduleInfo;
				result.update(
					schedule.delayBeforeReviewDaysInt,
					schedule.interval,
					schedule.ease,
				);
			} else {
				result.incrementNew();
			}
		}
		return result;
	}
}
