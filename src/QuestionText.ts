import { NoteCardScheduleParser } from './CardSchedule';
import { TopicPath } from './TopicPath';
import { SRSettings } from './interfaces';
import { cyrb53 } from './util/utils';

//
// QuestionText comprises the following components:
//      1. QuestionTopicPath (optional)
//      2. Actual question text (mandatory)
//      3. Card schedule info as HTML comment (optional)
//
// For example
//
//  Actual question text only:
//      Q1::A1
//
//  Question text with topic path:
//      #flashcards/science  Q2::A2
//
//  Question text with card schedule info:
//      #flashcards/science  Q2::A2 <!--SR:!2023-10-16,34,290-->
//
export class QuestionText {
	// Complete text including all components, as read from file
	original: string;

	// The question topic path (only present if topic path included in original text)
	topicPath: TopicPath;

	/**
	 * The white space after the topic path, before the actualQuestion
	 * We keep this so that when a question is updated, we can retain the original spacing
	 */
	postTopicPathWhiteSpace: string;

	/**
	 * Just the question text, e.g. "Q1::A1"
	 */
	actualQuestion: string;

	// Hash of string  (topicPath + actualQuestion)
	// Explicitly excludes the HTML comment with the scheduling info
	textHash: string;

	constructor(
		original: string,
		topicPath: TopicPath,
		postTopicPathWhiteSpace: string,
		actualQuestion: string,
	) {
		this.original = original;
		this.topicPath = topicPath;
		this.postTopicPathWhiteSpace = postTopicPathWhiteSpace;
		this.actualQuestion = actualQuestion;
		this.textHash = cyrb53(this.formatForNote());
	}

	endsWithCodeBlock(): boolean {
		return this.actualQuestion.endsWith('```');
	}

	static create(original: string, settings: SRSettings): QuestionText {
		const [topicPath, postTopicPathWhiteSpace, actualQuestion] =
			this.splitText(original, settings);

		return new QuestionText(
			original,
			topicPath,
			postTopicPathWhiteSpace,
			actualQuestion,
		);
	}

	static splitText(
		original: string,
		settings: SRSettings,
	): [TopicPath, string, string] {
		const strippedSR =
			NoteCardScheduleParser.removeCardScheduleInfo(original).trim();
		let actualQuestion: string = strippedSR;
		let whiteSpace = '';

		let topicPath: TopicPath = TopicPath.emptyPath;
		if (!settings.convertFoldersToDecks) {
			const t = TopicPath.getTopicPathFromCardText(strippedSR);
			if (t?.hasPath) {
				topicPath = t;
				[actualQuestion, whiteSpace] =
					TopicPath.removeTopicPathFromStartOfCardText(strippedSR);
			}
		}

		return [topicPath, whiteSpace, actualQuestion];
	}

	formatForNote(): string {
		let result = '';
		if (this.topicPath.hasPath) {
			result += this.topicPath.formatAsTag();
			result += this.postTopicPathWhiteSpace ?? ' ';
		}
		result += this.actualQuestion;
		return result;
	}
}
