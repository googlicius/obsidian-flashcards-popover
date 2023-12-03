import { CardScheduleInfo } from './CardSchedule';
import { Question } from './Question';
import { CardListType } from './enums';
// import { Question } from './Question';

export class Card {
	question: Question;
	cardIdx: number;

	// scheduling
	get hasSchedule(): boolean {
		return this.scheduleInfo != null;
	}
	scheduleInfo: CardScheduleInfo | null;

	// visuals
	front: string;
	back: string;

	constructor(init?: Partial<Card>) {
		Object.assign(this, init);
	}

	get cardListType(): CardListType {
		return this.hasSchedule ? CardListType.DueCard : CardListType.NewCard;
	}

	get isNew(): boolean {
		return !this.hasSchedule;
	}

	get isDue(): boolean {
		return this.hasSchedule && this.scheduleInfo
			? this.scheduleInfo.isDue()
			: false;
	}

	formatSchedule(): string {
		let result = '';
		if (this.hasSchedule && this.scheduleInfo)
			result = this.scheduleInfo.formatSchedule();
		else result = 'New';
		return result;
	}
}
