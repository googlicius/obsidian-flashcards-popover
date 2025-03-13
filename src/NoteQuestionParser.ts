import { Card } from './Card';
import { CardScheduleInfo, NoteCardScheduleParser } from './CardSchedule';
import { CardType } from './enums';
import { SRSettings } from './interfaces';
import { parse, Card as ParsedCard } from './parserV2';
import { Question } from './Question';
import { CardFrontBack, CardFrontBackUtil } from './QuestionType';
import { ISRFile } from './SRFile';
import { TopicPath } from './TopicPath';

class ParsedQuestionInfo {
	cardType: CardType;
	cardText: string;
	lineNo: number;
	tag: string;
	sequenceId: string;
	headings: string[];

	constructor(
		cardType: CardType,
		cardText: string,
		lineNo: number,
		tag: string,
		sequenceId: string,
		headings: string[],
	) {
		this.cardType = cardType;
		this.cardText = cardText;
		this.lineNo = lineNo;
		this.tag = tag;
		this.sequenceId = sequenceId;
		this.headings = headings;
	}
}

export class NoteQuestionParser {
	settings: SRSettings;
	noteFile: ISRFile;
	noteTopicPath: TopicPath;
	noteText: string;

	constructor(settings: SRSettings) {
		this.settings = settings;
	}

	/**
	 * Creates a list of questions from a note file.
	 * @param noteFile - The note file to parse questions from.
	 * @param folderTopicPath - The topic path of the folder containing the note.
	 * @returns A list of parsed questions.
	 */
	async createQuestionList(
		noteFile: ISRFile,
		folderTopicPath: TopicPath,
	): Promise<Question[]> {
		this.noteFile = noteFile;
		const noteText: string = await noteFile.read();
		if (this.settings.convertFoldersToDecks) {
			return this.doCreateQuestionList(noteText, folderTopicPath);
		}

		return this.doCreateQuestionList(noteText);
	}

	private doCreateQuestionList(
		noteText: string,
		noteTopicPath?: TopicPath,
	): Question[] {
		this.noteText = noteText;
		if (noteTopicPath) {
			this.noteTopicPath = noteTopicPath;
		}

		const result: Question[] = [];
		const parsedQuestionInfoList = this.parseQuestions();
		for (const t of parsedQuestionInfoList) {
			const parsedQuestionInfo: ParsedQuestionInfo =
				new ParsedQuestionInfo(t.type, t.text, t.lineNumber, t.tag || '', t.sequenceId || '', t.headings || []);
			const question: Question =
				this.createQuestionObject(parsedQuestionInfo);

			// Each rawCardText can turn into multiple CardFrontBack's (e.g. CardType.Cloze, CardType.SingleLineReversed)
			const cardFrontBackList: CardFrontBack[] = CardFrontBackUtil.expand(
				question.questionType,
				question.questionText.actualQuestion,
				this.settings,
			);

			// And if the card has been reviewed, then scheduling info as well
			let cardScheduleInfoList: CardScheduleInfo[] =
				NoteCardScheduleParser.createCardScheduleInfoList(
					question.questionText.original,
				);

			// we have some extra scheduling dates to delete
			const correctLength = cardFrontBackList.length;
			if (cardScheduleInfoList.length > correctLength) {
				question.hasChanged = true;
				cardScheduleInfoList = cardScheduleInfoList.slice(
					0,
					correctLength,
				);
			}

			// Create the list of card objects, and attach to the question
			const cardList: Card[] = this.createCardList(
				cardFrontBackList,
				cardScheduleInfoList,
			);
			question.setCardList(cardList);
			result.push(question);
		}
		return result;
	}

	/**
	 * Parses the questions from the note text.
	 * @returns A list of parsed question information.
	 */
	private parseQuestions(): ParsedCard[] {
		const settings: SRSettings = this.settings;
		const result = parse({
			text: this.noteText,
			singlelineCardSeparator: settings.singleLineCardSeparator,
			singlelineReversedCardSeparator:
				settings.singleLineReversedCardSeparator,
			multilineCardSeparator: settings.multilineCardSeparator,
			multilineReversedCardSeparator:
				settings.multilineReversedCardSeparator,
			convertHighlightsToClozes: settings.convertHighlightsToClozes,
			convertBoldTextToClozes: settings.convertBoldTextToClozes,
			convertCurlyBracketsToClozes: settings.convertCurlyBracketsToClozes,
			allTags: this.noteFile.getFlashcardTags(
				this.settings.flashcardTags,
			),
		});
		return result;
	}

	/**
	 * Creates a question object from the parsed question information.
	 * @param parsedQuestionInfo - The parsed question information.
	 * @returns A question object.
	 */
	private createQuestionObject(
		parsedQuestionInfo: ParsedQuestionInfo,
	): Question {
		const { cardType, cardText, lineNo, tag, sequenceId, headings } =
			parsedQuestionInfo;

		const questionContext: string[] =
			this.noteFile.getQuestionContext(lineNo);
		const result = Question.Create(
			this.settings,
			cardType,
			tag ? TopicPath.getTopicPathFromTag(tag) : this.noteTopicPath,
			cardText,
			lineNo,
			questionContext,
			sequenceId,
			headings,
		);
		return result;
	}

	/**
	 * Creates a list of card objects from the card front/back list and card schedule info list.
	 * @param cardFrontBackList - The list of card front/back.
	 * @param cardScheduleInfoList - The list of card schedule info.
	 * @returns A list of card objects.
	 */
	private createCardList(
		cardFrontBackList: CardFrontBack[],
		cardScheduleInfoList: CardScheduleInfo[],
	): Card[] {
		const siblings: Card[] = [];

		// One card for each CardFrontBack, regardless if there is scheduled info for it
		for (let i = 0; i < cardFrontBackList.length; i++) {
			const { front, back } = cardFrontBackList[i];

			const hasScheduleInfo: boolean = i < cardScheduleInfoList.length;
			const schedule: CardScheduleInfo = cardScheduleInfoList[i];

			const cardObj = new Card({
				front,
				back,
				cardIdx: i,
			});
			cardObj.scheduleInfo =
				hasScheduleInfo && !schedule.isDummyScheduleForNewCard()
					? schedule
					: null;

			siblings.push(cardObj);
		}
		return siblings;
	}

	/**
	 * Determines the topic path from the list of tags.
	 * @param tagList - The list of tags.
	 * @returns The topic path.
	 */
	private determineTopicPathFromTags(tagList: string[]): TopicPath {
		let result: TopicPath = TopicPath.emptyPath;
		outer: for (const tagToReview of this.settings.flashcardTags) {
			for (const tag of tagList) {
				if (tag === tagToReview || tag.startsWith(tagToReview + '/')) {
					result = TopicPath.getTopicPathFromTag(tag);
					break outer;
				}
			}
		}
		return result;
	}
}
