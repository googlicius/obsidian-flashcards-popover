import { Note } from './Note';
import { NoteQuestionParser } from './NoteQuestionParser';
import { ISRFile } from './SRFile';
import { TopicPath } from './TopicPath';
import { SRSettings } from './interfaces';

export class NoteParser {
	settings: SRSettings;
	noteText: string;

	constructor(settings: SRSettings) {
		this.settings = settings;
	}

	async parse(noteFile: ISRFile, folderTopicPath: TopicPath): Promise<Note> {
		const questionParser: NoteQuestionParser = new NoteQuestionParser(
			this.settings,
		);
		const questions = await questionParser.createQuestionList(
			noteFile,
			folderTopicPath,
		);

		const result: Note = new Note(noteFile, questions);
		return result;
	}
}
