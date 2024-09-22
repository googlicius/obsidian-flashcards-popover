import { App, Modal, Platform } from 'obsidian';
import {
	DeckStats,
	FlashcardReviewMode,
	IFlashcardReviewSequencer,
} from 'src/FlashcardReviewSequencer';
import { TopicPath } from 'src/TopicPath';
import { COLLAPSE_ICON } from 'src/constants';
import { SRSettings } from 'src/interfaces';
import { t } from 'src/lang/helpers';
import type SRPlugin from 'src/main';
import { Deck } from '../Deck';

interface FlashcardModalProps {
	settings: SRSettings;
	reviewSequencer: IFlashcardReviewSequencer;
	reviewMode: FlashcardReviewMode;
	app: App;
	plugin: SRPlugin;
	onTraverseCurrentCard: () => Promise<void>;
	onClose?: () => void;
}

export class FlashcardModal extends Modal {
	public flashcardView: HTMLElement;
	private props: FlashcardModalProps;

	constructor(props: FlashcardModalProps) {
		super(props.app);

		this.props = props;

		this.titleEl.setText(t('DECKS'));
		this.titleEl.addClass('sr-centered');

		if (Platform.isMobile) {
			this.contentEl.style.display = 'block';
		}
		this.modalEl.style.height =
			props.settings.flashcardHeightPercentage + '%';
		this.modalEl.style.width =
			props.settings.flashcardWidthPercentage + '%';

		this.contentEl.style.position = 'relative';
		this.contentEl.style.height = '92%';
		this.contentEl.addClass('sr-modal-content');
	}

	onOpen(): void {
		this.renderDecksList();
	}

	onClose(): void {
		if (this.props.onClose) {
			this.props.onClose();
		}
	}

	renderDecksList(): void {
		const stats: DeckStats = this.props.reviewSequencer.getDeckStats(
			TopicPath.emptyPath,
		);
		this.titleEl.setText(t('DECKS'));
		this.titleEl.innerHTML += `
			<p style="margin:0px;line-height:12px;">
				<span
					style="background-color:#4caf50;color:#ffffff;"
					aria-label=${t('DUE_CARDS')}
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${stats.dueCount.toString()}
				</span>
				<span
					style="background-color:#2196f3;"
					aria-label=${t('NEW_CARDS')}
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${stats.newCount.toString()}
				</span>
				<span
					style="background-color:#ff7043;"
					aria-label=${t('TOTAL_CARDS')}
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${stats.totalCount.toString()}
				</span>
			</p>
		`;
		this.contentEl.empty();
		this.contentEl.setAttribute('id', 'sr-flashcard-view');

		for (const deck of this.props.reviewSequencer.originalDeckTree
			.subdecks) {
			this.renderDeck(deck, this.contentEl, this);
		}
	}

	renderDeck(
		deck: Deck,
		containerEl: HTMLElement,
		modal: FlashcardModal,
	): void {
		const deckView: HTMLElement = containerEl.createDiv('tree-item');

		const deckViewSelf: HTMLElement = deckView.createDiv(
			'tree-item-self tag-pane-tag is-clickable',
		);
		const shouldBeInitiallyExpanded: boolean =
			modal.props.settings.initiallyExpandAllSubdecksInTree;
		let collapsed = !shouldBeInitiallyExpanded;
		let collapseIconEl: HTMLElement | null = null;
		if (deck.subdecks.length > 0) {
			collapseIconEl = deckViewSelf.createDiv(
				'tree-item-icon collapse-icon',
			);
			collapseIconEl.innerHTML = COLLAPSE_ICON;
			(collapseIconEl.childNodes[0] as HTMLElement).style.transform =
				collapsed ? 'rotate(-90deg)' : '';
		}

		const deckViewInner: HTMLElement =
			deckViewSelf.createDiv('tree-item-inner');
		const deckViewInnerText: HTMLElement =
			deckViewInner.createDiv('tag-pane-tag-text');
		deckViewInnerText.innerHTML += `
			<span class="tag-pane-tag-self">${deck.deckName}</span>
		`;
		const deckViewOuter: HTMLElement = deckViewSelf.createDiv(
			'tree-item-flair-outer',
		);
		const deckStats = this.props.reviewSequencer.getDeckStats(
			deck.getTopicPath(),
		);
		deckViewOuter.innerHTML += `
			<span>
				<span
					style="background-color:#4caf50;"
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${deckStats.dueCount.toString()}
				</span>
				<span
					style="background-color:#2196f3;"
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${deckStats.newCount.toString()}
				</span>
				<span
					style="background-color:#ff7043;"
					class="tag-pane-tag-count tree-item-flair sr-deck-counts"
				>
					${deckStats.totalCount.toString()}
				</span>
			</span>
		`;

		const deckViewChildren: HTMLElement =
			deckView.createDiv('tree-item-children');
		deckViewChildren.style.display = collapsed ? 'none' : 'block';
		if (deck.subdecks.length > 0) {
			collapseIconEl?.addEventListener('click', (e) => {
				if (collapsed) {
					(
						collapseIconEl?.childNodes[0] as HTMLElement
					).style.transform = '';
					deckViewChildren.style.display = 'block';
				} else {
					(
						collapseIconEl?.childNodes[0] as HTMLElement
					).style.transform = 'rotate(-90deg)';
					deckViewChildren.style.display = 'none';
				}

				// We stop the propagation of the event so that the click event for deckViewSelf doesn't get called
				// if the user clicks on the collapse icon
				e.stopPropagation();
				collapsed = !collapsed;
			});
		}

		// Add the click handler to deckViewSelf instead of deckViewInner so that it activates
		// over the entire rectangle of the tree item, not just the text of the topic name
		// https://github.com/st3v3nmw/obsidian-spaced-repetition/issues/709
		deckViewSelf.addEventListener('click', () => {
			this.startReviewOfDeck(deck);
		});

		for (const subdeck of deck.subdecks) {
			this.renderDeck(subdeck, deckViewChildren, modal);
		}
	}

	startReviewOfDeck(deck: Deck) {
		this.props.reviewSequencer.setCurrentDeckTree(deck.getTopicPath());
		if (this.props.reviewSequencer.hasCurrentCard) {
			this.traverseCurrentCard();
		} else this.renderDecksList();
	}

	private async traverseCurrentCard() {
		await this.props.onTraverseCurrentCard();
		this.close();
	}
}
