import { bookHeartIcon } from 'src/icon/icons';
import tippy from 'tippy.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from 'vhtml';

interface FlashcardReviewButtonProps {
	onClick: (target: MouseEvent) => void;
}

export class FlashcardReviewButton {
	private props: FlashcardReviewButtonProps;

	constructor(props: FlashcardReviewButtonProps) {
		this.props = props;
	}

	render(target: HTMLElement) {
		const contentEl = document.createElement('div');
		contentEl.innerHTML = (
			<button id="sr-review-btn">{bookHeartIcon}</button>
		);

		contentEl.find('#sr-review-btn').addEventListener('click', (target) => {
			this.props.onClick(target);
		});

		tippy(target, {
			content: contentEl,
			trigger: 'click',
			allowHTML: true,
			interactive: true,
			appendTo: document.body,
			placement: 'left-start',
			hideOnClick: false,
		}).show();
	}
}
