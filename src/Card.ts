import { CardScheduleInfo } from './CardSchedule';
import { Question } from './Question';
import { FOLLOW_UP_REGEX, TIMER_REGEX } from './constants';
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

	getTimerPosition(): { start: number; end: number }[] {
		const lines = this.front.split('\n');
		const positions = [];

		for (let i = 0; i < lines.length; i++) {
			const match = lines[i].match(TIMER_REGEX);
			if (match) {
				console.log('MATCH', lines[i], match[0]);
				const start = lines[i].indexOf(match[0]);
				const end = start + match[0].length;
				positions.push({ start, end });
			}
		}

		return positions;
	}

	hasTimer(): boolean {
		const pattern = new RegExp(TIMER_REGEX, 'g');
		return pattern.test(this.front)
	}

	timerLineNo(): number {
		const lines = this.front.split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (TIMER_REGEX.test(lines[i])) {
				return this.question.lineNoModified + i;
			}
		}
		return -1;
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

	hasFollowUpLink(): boolean {
		const links = this.getFollowUpInternalLinks();
		return links.length > 0;
	}

	getFollowUpInternalLinks(): string[] {
		const matchesIterator = this.back.matchAll(new RegExp(FOLLOW_UP_REGEX, 'g'));
		const matches = [...matchesIterator].map((item) => item[0]);
		return matches;
	}
}
