import { Card } from './Card';
import { CardScheduleInfo } from './CardSchedule';
import { Note } from './Note';
import { QuestionText } from './QuestionText';
import { TopicPath } from './TopicPath';
import { SR_HTML_COMMENT_BEGIN, SR_HTML_COMMENT_END } from './constants';
import { CardType } from './enums';
import { SRSettings } from './interfaces';
import { parse } from './parser';
import { MultiLineTextFinder } from './util/MultiLineTextFinder';
import { similarity } from './util/similarity';

export class Question {
	note: Note;
	questionType: CardType;
	topicPath: TopicPath;
	questionText: QuestionText;
	lineNo: number;
	hasEditLaterTag: boolean;
	questionContext: string[];
	cards: Card[];
	hasChanged: boolean;
	sequenceId = '';
	private _lineNoModified: number | null;

	/**
	 * Modified `lineNo` because the original `lineNo` is not correct with multi-line question.
	 */
	get lineNoModified(): number {
		if (this._lineNoModified) return this._lineNoModified;

		// Not support single line question.
		if (this.isSingleLineQuestion || this.questionType === CardType.Cloze) {
			return this.lineNo;
		}

		const splitter =
			this.questionType === CardType.MultiLineBasic ? '?' : '??';

		const question = this.questionText.actualQuestion.split(
			`\n${splitter}\n`,
		)[0];

		this._lineNoModified = this.lineNo - question.split('\n').length;

		return this._lineNoModified;
	}

	get isSingleLineQuestion(): boolean {
		return (
			this.questionType === CardType.SingleLineBasic ||
			this.questionType === CardType.SingleLineReversed
		);
	}

	constructor(init?: Partial<Question>) {
		Object.assign(this, init);
	}

	setCardList(cards: Card[]): void {
		this.cards = cards;
		this.cards.forEach((card) => (card.question = this));
	}

	updateQuestionText(noteText: string, settings: SRSettings): string {
		const questionsParsed = this.questionsParsedSortedBySimilarity(
			noteText,
			settings,
		);
		const [cardType, originalText, lineNo, , sequenceId, similar] = questionsParsed[0];

		const question = Question.Create(
			settings,
			cardType,
			this.topicPath,
			originalText,
			lineNo,
			this.note.file.getQuestionContext(lineNo),
			sequenceId
		);

		if (similar >= 0.7) {
			this.questionText = question.questionText;
		}

		// Get the entire text for the question including:
		//      1. the topic path (if present),
		//      2. the question text
		//      3. the schedule HTML comment (if present)
		const replacementText = this.formatForNote(settings);

		let newText = MultiLineTextFinder.findAndReplace(
			noteText,
			originalText,
			replacementText,
		);
		if (newText) {
			this.questionText = QuestionText.create(replacementText, settings);
		} else {
			console.error(
				`updateQuestionText: Text not found: ${originalText.substring(
					0,
					100,
				)} in note: ${noteText.substring(0, 100)}`,
			);
			newText = noteText;
		}
		return newText;
	}

	/**
	 * Flashcards are sorted by the similarity of this question text.
	 */
	private questionsParsedSortedBySimilarity(
		fileText: string,
		settings: SRSettings,
	): Array<[CardType, string, number, string, string, number]> {
		const parsed = parse(
			fileText,
			settings.singleLineCardSeparator,
			settings.singleLineReversedCardSeparator,
			settings.multilineCardSeparator,
			settings.multilineReversedCardSeparator,
			settings.convertHighlightsToClozes,
			settings.convertBoldTextToClozes,
			settings.convertCurlyBracketsToClozes,
		);

		return parsed
			.map((item) => {
				return [
					...item,
					similarity(item[1], this.questionText.original),
				] as [CardType, string, number, string, string, number];
			})
			.sort((a, b) => {
				const similarA = a[5];
				const similarB = b[5];
				return similarB - similarA;
			});
	}

	/**
	 * Update line number as content of the note could be changed.
	 */
	async updateLineNo(settings: SRSettings): Promise<void> {
		const fileText: string = await this.note.file.read();
		const questionsParsed = this.questionsParsedSortedBySimilarity(
			fileText,
			settings,
		);

		const [cardType, originalText, lineNo, , sequenceId] = questionsParsed[0];

		const question = Question.Create(
			settings,
			cardType,
			this.topicPath,
			originalText,
			lineNo,
			this.note.file.getQuestionContext(lineNo),
			sequenceId,
		);

		this.lineNo = question.lineNo;
		this._lineNoModified = null;
	}

	async writeQuestion(settings: SRSettings): Promise<void> {
		const fileText: string = await this.note.file.read();

		const newText: string = this.updateQuestionText(fileText, settings);
		await this.note.file.write(newText);
		this.hasChanged = false;
	}

	static Create(
		settings: SRSettings,
		questionType: CardType,
		noteTopicPath: TopicPath,
		originalText: string,
		lineNo: number,
		context: string[],
		sequenceId = '',
	): Question {
		const hasEditLaterTag = originalText.includes(settings.editLaterTag);
		const questionText: QuestionText = QuestionText.create(
			originalText,
			settings,
		);

		let topicPath: TopicPath = noteTopicPath;
		if (questionText.topicPath.hasPath) {
			topicPath = questionText.topicPath;
		}

		const result: Question = new Question({
			questionType,
			topicPath,
			questionText,
			lineNo,
			hasEditLaterTag,
			questionContext: context,
			cards: [],
			hasChanged: false,
			sequenceId,
		});

		return result;
	}

	private getHtmlCommentSeparator(settings: SRSettings): string {
		let sep: string = settings.cardCommentOnSameLine ? ' ' : '\n';
		// Override separator if last block is a codeblock
		if (this.questionText.endsWithCodeBlock() && sep !== '\n') {
			sep = '\n';
		}
		return sep;
	}

	private formatScheduleAsHtmlComment(settings: SRSettings): string {
		let result: string = SR_HTML_COMMENT_BEGIN;

		// We always want the correct schedule format, so we use this if there is no schedule for a card

		for (let i = 0; i < this.cards.length; i++) {
			const card: Card = this.cards[i];
			const schedule: CardScheduleInfo = card.hasSchedule
				? (card.scheduleInfo as CardScheduleInfo)
				: CardScheduleInfo.getDummyScheduleForNewCard(settings);
			result += schedule.formatSchedule();
		}
		result += SR_HTML_COMMENT_END;
		return result;
	}

	private formatForNote(settings: SRSettings): string {
		let result: string = this.questionText.formatForNote();
		if (this.cards.some((card) => card.hasSchedule)) {
			result +=
				this.getHtmlCommentSeparator(settings) +
				this.formatScheduleAsHtmlComment(settings);
		}
		return result;
	}
}
