import { App, Editor, Notice } from 'obsidian';
import { CardScheduleInfo } from 'src/CardSchedule';
import {
	FlashcardReviewMode,
	IFlashcardReviewSequencer,
} from 'src/FlashcardReviewSequencer';
import { backIcon, refreshIcon, skipIcon } from 'src/icon/icons';
import { SRSettings } from 'src/interfaces';
import { t } from 'src/lang/helpers';
import { ReviewResponse, textInterval } from 'src/scheduling';
import tippy from 'tippy.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from 'vhtml';

export class FlashCardTippy {
	private target: HTMLElement;
	private settings: SRSettings;
	private reviewSequencer: IFlashcardReviewSequencer;
	private reviewMode: FlashcardReviewMode;
	private app: App;

	constructor(
		target: HTMLElement,
		settings: SRSettings,
		reviewSequencer: IFlashcardReviewSequencer,
		reviewMode: FlashcardReviewMode,
		app: App,
	) {
		this.target = target;
		this.settings = settings;
		this.reviewSequencer = reviewSequencer;
		this.reviewMode = reviewMode;
		this.app = app;
	}

	open() {
		// const deck: Deck = this.reviewSequencer.currentDeck;
		if (!this.reviewSequencer.hasCurrentCard) {
			new Notice('There is no card to review!');
			return;
		}

		const goodSchedule: CardScheduleInfo =
			this.reviewSequencer.determineCardSchedule(
				ReviewResponse.Good,
				this.reviewSequencer.currentCard,
			);

		const easySchedule: CardScheduleInfo =
			this.reviewSequencer.determineCardSchedule(
				ReviewResponse.Easy,
				this.reviewSequencer.currentCard,
			);

		const hardSchedule: CardScheduleInfo =
			this.reviewSequencer.determineCardSchedule(
				ReviewResponse.Hard,
				this.reviewSequencer.currentCard,
			);

		const schedule = this.reviewSequencer.currentCard
			.scheduleInfo as CardScheduleInfo;

		const tippyContentEl = document.createElement('div');
		tippyContentEl.addClass('tippy-content-wrapper');
		tippyContentEl.innerHTML = (
			<div class="sr-tippy-container">
				<div class="sr-flashcard-menu">
					<button class="sr-flashcard-menu-item" aria-label="Back">
						{backIcon}
					</button>
					<button
						class="sr-flashcard-menu-item"
						aria-label={t('RESET_CARD_PROGRESS')}
					>
						{refreshIcon}
					</button>
					<button class="sr-flashcard-menu-item" aria-label="Skip">
						{skipIcon}
					</button>
				</div>

				<div class="sr-flashcard-info">
					{t('CURRENT_EASE_HELP_TEXT')} {schedule.ease ?? t('NEW')}
					<br />
					{t('CURRENT_INTERVAL_HELP_TEXT')}{' '}
					{textInterval(schedule.interval, false)}
					<br />
					{t('CARD_GENERATED_FROM', {
						notePath:
							this.reviewSequencer.currentQuestion.note.filePath,
					})}
				</div>

				<div class="sr-tippy-flashcard-response">
					<button id="sr-hard-btn">
						{this.settings.flashcardHardText} -{' '}
						{textInterval(hardSchedule.interval, false)}
					</button>

					<button id="sr-good-btn">
						{this.settings.flashcardGoodText} -{' '}
						{textInterval(goodSchedule.interval, false)}
					</button>

					<button id="sr-easy-btn">
						{this.settings.flashcardEasyText} -{' '}
						{textInterval(easySchedule.interval, false)}
					</button>
				</div>
			</div>
		);

		// Add event listeners
		tippyContentEl.find('#sr-good-btn').addEventListener('click', () => {
			tippyInstance.destroy();
			this.processReview(ReviewResponse.Good);
		});

		tippyContentEl.find('#sr-hard-btn').addEventListener('click', () => {
			tippyInstance.destroy();
			this.processReview(ReviewResponse.Hard);
		});

		tippyContentEl.find('#sr-easy-btn').addEventListener('click', () => {
			tippyInstance.destroy();
			this.processReview(ReviewResponse.Easy);
		});

		console.log('OPENING TIPPY...', this.target, tippyContentEl);

		const tippyInstance = tippy(this.target, {
			content: tippyContentEl,
			trigger: 'click',
			allowHTML: true,
			arrow: true,
			interactive: true,
			appendTo: document.body,
			maxWidth: '600px',
			onHidden(instance) {
				instance.destroy();
			},
		});
	}

	private async processReview(response: ReviewResponse): Promise<void> {
		await this.reviewSequencer.processReview(response);
		// console.log(`processReview: ${response}: ${this.currentCard?.front ?? 'None'}`)
		await this.handleNextCard();
	}

	private async handleNextCard(): Promise<void> {
		if (this.reviewSequencer.currentCard != null)
			await this.traverseCurrentCard();
		else {
			new Notice('All card reviewed!');
			// this.renderDecksList()
		}
	}

	private async traverseCurrentCard() {
		await this.app.workspace.openLinkText(
			this.reviewSequencer.currentNote.file.basename,
			this.reviewSequencer.currentNote.file.path as string,
		);

		const editor = this.app.workspace.activeEditor?.editor as Editor;
		const lineNo = editor.lastLine();

		for (let index = 0; index < lineNo; index++) {
			const line = editor.getLine(index);
			if (
				line.includes(
					this.reviewSequencer.currentCard.question.questionText
						.actualQuestion,
				)
			) {
				editor.setCursor({ line: index, ch: 0 });
				break;
			}
		}
	}
}
