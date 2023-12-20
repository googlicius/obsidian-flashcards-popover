import { CardScheduleInfo } from './CardSchedule';
import { Question } from './Question';
import { CardListType } from './enums';

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

	numberOfLinesFront(): number {
		return this.front.split('\n').length;
	}

	numberOfLinesBack(): number {
		return this.back.split('\n').length;
	}

	backLineNo(): number {
		if (this.question.isSingleLineQuestion) {
			return this.question.lineNoModified;
		}

		const questionOriginalSplitted =
			this.question.questionText.original.split('\n');

		const backSplitted = this.back.split('\n');

		return questionOriginalSplitted[0].trim() === backSplitted[0].trim()
			? this.question.lineNoModified
			: this.question.lineNoModified + this.numberOfLinesFront() + 1;
	}

	frontLineNo(): number {
		if (this.question.isSingleLineQuestion) {
			return this.question.lineNoModified;
		}

		const questionOriginalSplitted =
			this.question.questionText.original.split('\n');

		const frontSplitted = this.front.split('\n');

		return questionOriginalSplitted[0].trim() === frontSplitted[0].trim()
			? this.question.lineNoModified
			: this.question.lineNoModified + this.numberOfLinesBack() + 1;
	}

	backContainsLinkOnly(): boolean {
		return this.back.startsWith('[[') && this.back.endsWith(']]');
	}
}
