import { App, Notice } from 'obsidian';
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

interface FlashCardReviewPopoverProps {
	target: HTMLElement;
	settings: SRSettings;
	reviewSequencer: IFlashcardReviewSequencer;
	reviewMode: FlashcardReviewMode;
	app: App;
	onBack: () => void;
	onTraverseCurrentCard: () => Promise<void>;
}

/**
 * The FlashCardReviewPopover class is responsible for creating a Tippy.js tooltip
 * for reviewing flashcards.
 */
export class FlashCardReviewPopover {
	private props: FlashCardReviewPopoverProps;

	constructor(props: FlashCardReviewPopoverProps) {
		this.props = props;
	}

	/**
	 * Opens the popover.
	 */
	open() {
		if (!this.props.reviewSequencer.currentCard) {
			new Notice('There is no card to review!');
			return;
		}

		const goodSchedule: CardScheduleInfo =
			this.props.reviewSequencer.determineCardSchedule(
				ReviewResponse.Good,
				this.props.reviewSequencer.currentCard,
			);

		const easySchedule: CardScheduleInfo =
			this.props.reviewSequencer.determineCardSchedule(
				ReviewResponse.Easy,
				this.props.reviewSequencer.currentCard,
			);

		const hardSchedule: CardScheduleInfo =
			this.props.reviewSequencer.determineCardSchedule(
				ReviewResponse.Hard,
				this.props.reviewSequencer.currentCard,
			);

		const schedule = this.props.reviewSequencer.currentCard.scheduleInfo;

		const tippyContentEl = document.createElement('div');
		tippyContentEl.addClass('tippy-content-wrapper');
		tippyContentEl.innerHTML = (
			<div class="sr-tippy-container">
				<div class="sr-flashcard-menu">
					<button
						class="sr-flashcard-menu-item"
						title="Back"
						id="sr-flashcard-back"
					>
						{backIcon}
					</button>
					<button
						class="sr-flashcard-menu-item"
						title={t('RESET_CARD_PROGRESS')}
						disabled={this.props.reviewSequencer.currentCard.isNew}
					>
						{refreshIcon}
					</button>
					<button class="sr-flashcard-menu-item" title="Skip">
						{skipIcon}
					</button>
				</div>

				<div class="sr-flashcard-info">
					{t('CURRENT_EASE_HELP_TEXT')} {schedule?.ease ?? t('NEW')}
					<br />
					{t('CURRENT_INTERVAL_HELP_TEXT')}{' '}
					{textInterval(schedule?.interval, false)}
					<br />
					{t('CARD_GENERATED_FROM', {
						notePath:
							this.props.reviewSequencer.currentQuestion!.note
								.filePath,
					})}
				</div>

				<div class="sr-tippy-flashcard-response">
					<button id="sr-hard-btn">
						{this.props.settings.flashcardHardText} -{' '}
						{textInterval(hardSchedule.interval, false)}
					</button>

					<button id="sr-good-btn">
						{this.props.settings.flashcardGoodText} -{' '}
						{textInterval(goodSchedule.interval, false)}
					</button>

					<button id="sr-easy-btn">
						{this.props.settings.flashcardEasyText} -{' '}
						{textInterval(easySchedule.interval, false)}
					</button>
				</div>
			</div>
		);

		// Add event listeners
		tippyContentEl
			.find('#sr-flashcard-back')
			.addEventListener('click', () => {
				tippyInstance.hide();
				this.props.onBack();
			});

		tippyContentEl.find('#sr-good-btn').addEventListener('click', () => {
			tippyInstance.hide();
			this.processReview(ReviewResponse.Good);
		});

		tippyContentEl.find('#sr-hard-btn').addEventListener('click', () => {
			tippyInstance.hide();
			this.processReview(ReviewResponse.Hard);
		});

		tippyContentEl.find('#sr-easy-btn').addEventListener('click', () => {
			tippyInstance.hide();
			this.processReview(ReviewResponse.Easy);
		});

		const destroyWhenPressEsc = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (tippyInstance.state.isShown) {
					tippyInstance.hide();
				}
			}
		};

		const tippyInstance = tippy(this.props.target, {
			content: tippyContentEl,
			trigger: 'click',
			allowHTML: true,
			arrow: true,
			interactive: true,
			appendTo: document.body,
			maxWidth: '600px',
			onHidden: (instance) => {
				instance.destroy();
				document.removeEventListener('keyup', destroyWhenPressEsc);
			},
			onShown: () => {
				document.addEventListener('keyup', destroyWhenPressEsc);
			},
		});

		tippyInstance.show();
	}

	/**
	 * Processes the user's review response.
	 * @param response - The user's review response.
	 */
	private async processReview(response: ReviewResponse): Promise<void> {
		await this.props.reviewSequencer.processReview(response);
		await this.handleNextCard();
	}

	/**
	 * Handles the next card in the review sequence.
	 */
	private async handleNextCard(): Promise<void> {
		if (this.props.reviewSequencer.currentCard != null)
			this.props.onTraverseCurrentCard();
		else {
			new Notice(`Congratulation! All cards has been reviewed!`);
		}
	}
}
