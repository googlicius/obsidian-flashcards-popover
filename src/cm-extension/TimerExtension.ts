import { Extension, StateEffect, StateField } from '@codemirror/state';
import {
	EditorView,
	Decoration,
	DecorationSet,
	WidgetType,
} from '@codemirror/view';

export type TimerEffectValue = {
	from: number;
	type: 'enable' | 'disable';
};

export const timerEffect = StateEffect.define<TimerEffectValue>({
	map: (value, change) => ({
		from: change.mapPos(value.from),
		type: value.type,
	}),
});

const timerField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(timer, tr) {
		timer = timer.map(tr.changes);

		for (const effect of tr.effects) {
			if (effect.is(timerEffect)) {
				const timerDecoration = Decoration.widget({
					widget: new TimerWidget(effect.value),
					side: 1,
				});

				timer = timer.update({
					...(effect.value.type === 'enable'
						? {
							add: [timerDecoration.range(effect.value.from)],
						}
						: {
							filter: () => false,
						}),
				});
			}
		}

		return timer;
	},
	provide: (f) => EditorView.decorations.from(f),
});

class Timer {
	private startTime: number;
	private intervalId: number | null = null;
	private updateCallback: (time: string) => void;

	constructor(updateCallback: (time: string) => void) {
		this.startTime = Date.now();
		this.updateCallback = updateCallback;
	}

	start() {
		this.updateCallback(`0.0s`);
		this.intervalId = window.setInterval(() => {
			const elapsedTime = Date.now() - this.startTime;
			const seconds = (elapsedTime / 1000).toFixed(1);
			this.updateCallback(`${seconds}s`);
		}, 100);
	}

	stop() {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}

class TimerWidget extends WidgetType {
	private timer: Timer;

	constructor(public effectValue: TimerEffectValue) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-timer';
		span.style.userSelect = 'none';
		span.setAttribute(
			'data-effect-value',
			JSON.stringify(this.effectValue),
		);
		this.timer = new Timer((time) => {
			span.textContent = time;
		});
		this.timer.start();
		return span;
	}

	eq(widget: TimerWidget) {
		return widget instanceof this.constructor;
	}

	ignoreEvent(event: Event) {
		return true;
	}

	destroy(dom: HTMLElement) {
		this.timer.stop();
	}
}

export function enableTimer(from: number, view: EditorView) {
	const timerTr = { effects: timerEffect.of({ from, type: 'enable' }) };
	view.dispatch(timerTr);
}

export function disableTimer(from: number, view: EditorView) {
	view.dispatch({ effects: timerEffect.of({ from, type: 'disable' }) });
}

export const timerExtension: Extension = [timerField];
