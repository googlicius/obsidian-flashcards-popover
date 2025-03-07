import { App, Notice } from 'obsidian';
import { CardScheduleInfo } from 'src/CardSchedule';
import { FOLLOW_UP_PATH_REGEX } from 'src/constants';
import {
	FlashcardReviewMode,
	IFlashcardReviewSequencer,
} from 'src/FlashcardReviewSequencer';
import { backIcon, closeIcon, refreshIcon, skipIcon } from 'src/icon/icons';
import { SRSettings } from 'src/interfaces';
import { t } from 'src/lang/helpers';
import SRPlugin from 'src/main';
import { ReviewResponse, textInterval } from 'src/scheduling';
import { sleep } from 'src/util/utils';
import tippy from 'tippy.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from 'vhtml';

interface FlashCardReviewPopoverProps {
	target: HTMLElement;
	settings: SRSettings;
	reviewSequencer: IFlashcardReviewSequencer;
	reviewMode: FlashcardReviewMode;
	app: App;
	plugin: SRPlugin;
	onBack: () => void;
	traverseCurrentCard: () => Promise<void>;
	addFollowUpDeck: (links: string[]) => void;
}

/**
 * The FlashCardReviewPopover class is responsible for creating a Tippy.js tooltip
 * for reviewing flashcards.
 */
export class FlashCardReviewPopover {
	private props: FlashCardReviewPopoverProps;
	private selectedFollowUpInternalLinks: string[] = [];

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
		const followInternalLinks =
			this.props.reviewSequencer.currentCard.getFollowUpInternalLinks();

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
					<button
						class="sr-flashcard-menu-item"
						title="Skip"
						id="sr-flashcard-skip"
					>
						{skipIcon}
					</button>
					<button
						class="sr-flashcard-menu-item"
						title="Cancel review"
						id="sr-flashcard-cancel"
					>
						{closeIcon}
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
					{followInternalLinks.length > 0 && (
						<div>
							<div style="margin-top: 15px;">
								<strong>Follow Up:</strong>
							</div>
							{followInternalLinks.map((link) => {
								const match = link.match(FOLLOW_UP_PATH_REGEX);
								return (
									<div style="margin-top: 5px;">
										<label>
											<input
												type="checkbox"
												class="sr-follow-up-checkbox"
												data-link={link}
												checked
											/>{' '}
											{match
												? match[1]
												: 'Review follow-up cards before continuing'}
										</label>
									</div>
								);
							})}
						</div>
					)}
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
				tippyInstance.destroy();
				this.props.onBack();
			});

		tippyContentEl
			.find('#sr-flashcard-skip')
			.addEventListener('click', () => {
				tippyInstance.destroy();
				this.skipCurrentCard();
			});

		tippyContentEl
			.find('#sr-flashcard-cancel')
			.addEventListener('click', () => {
				this.cancelReview();
				tippyInstance.destroy();
			});

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

		if (followInternalLinks.length > 0) {
			// Initialize with all links
            this.selectedFollowUpInternalLinks = [...followInternalLinks];

			tippyContentEl.findAll('.sr-follow-up-checkbox').map((el) => {
				el.addEventListener('change', (event) => {
					const checkbox = event.target as HTMLInputElement;
					const link = checkbox.getAttr('data-link') as string;
					const index =
						this.selectedFollowUpInternalLinks.indexOf(link);

					if (index > -1) {
						this.selectedFollowUpInternalLinks.splice(index, 1);
					} else {
						this.selectedFollowUpInternalLinks.push(link);
					}
				});
			});
		}

		const destroyWhenPressEsc = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && tippyInstance.state.isShown) {
				tippyInstance.destroy();
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
			},
			onShown: () => {
				document.addEventListener('keyup', destroyWhenPressEsc);
			},
			onDestroy: () => {
				document.removeEventListener('keyup', destroyWhenPressEsc);
			},
		});

		tippyInstance.show();
	}

	/**
	 * Processes the user's review response.
	 * @param response - The user's review response.
	 */
	private async processReview(response: ReviewResponse): Promise<void> {
		await sleep(200);
		if (this.selectedFollowUpInternalLinks.length > 0) {
			this.props.addFollowUpDeck(this.selectedFollowUpInternalLinks);
		}

		await this.props.reviewSequencer.processReview(response);
		await this.handleNextCard();
	}

	private cancelReview(): void {
		this.props.reviewSequencer.moveCurrentCardToEndOfList();
		new Notice('Reviewing is canceled, see you next time!');
		this.props.plugin.isReviewing = false;
	}

	/**
	 * Handles the next card in the review sequence.
	 */
	private async handleNextCard(): Promise<void> {
		if (this.props.reviewSequencer.currentCard != null) {
			await this.props.reviewSequencer.currentCard.question.updateLineNo(
				this.props.settings,
			);
			this.props.traverseCurrentCard();
		} else {
			new Notice(`Congratulation! All cards has been reviewed!`);
			this.props.plugin.isReviewing = false;
		}
	}

	private async skipCurrentCard(): Promise<void> {
		this.props.reviewSequencer.skipCurrentCard();
		// console.log(`skipCurrentCard: ${this.currentCard?.front ?? 'None'}`)
		await this.handleNextCard();
	}
}
