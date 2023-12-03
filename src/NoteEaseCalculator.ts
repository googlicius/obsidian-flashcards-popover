import { CardScheduleInfo } from './CardSchedule';
import { Note } from './Note';
import { SRSettings } from './interfaces';

export class NoteEaseCalculator {
	static Calculate(note: Note, settings: SRSettings): number {
		let totalEase = 0;
		let scheduledCount = 0;

		note.questionList.forEach((question) => {
			question.cards
				.filter((card) => card.hasSchedule)
				.forEach((card) => {
					totalEase += (card.scheduleInfo as CardScheduleInfo).ease;
					scheduledCount++;
				});
		});

		let result = 0;
		if (scheduledCount > 0) {
			const flashcardsInNoteAvgEase: number = totalEase / scheduledCount;
			const flashcardContribution: number = Math.min(
				1.0,
				Math.log(scheduledCount + 0.5) / Math.log(64),
			);
			result =
				flashcardsInNoteAvgEase * flashcardContribution +
				settings.baseEase * (1.0 - flashcardContribution);
		}
		return result;
	}
}
