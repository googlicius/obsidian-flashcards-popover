/* eslint-disable no-mixed-spaces-and-tabs */
import { Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

export type CensorEffectValue = {
	from: number;
	to: number;
	type: 'censored' | 'uncensored';
};

const highlightMark = Decoration.mark({
	class: 'cm-highlight',
});

const censorEffect = StateEffect.define<CensorEffectValue>({
	map: (value, change) => ({
		from: change.mapPos(value.from),
		to: change.mapPos(value.to),
		type: value.type,
	}),
});

const censorField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(censoredTexts, tr) {
		censoredTexts = censoredTexts.map(tr.changes);

		for (const effect of tr.effects)
			if (effect.is(censorEffect)) {
				const censoredMark = Decoration.mark({
					class: 'cm-censored',
					attributes: {
						title: 'Click to show the answer',
						'data-effect-value': JSON.stringify(effect.value),
					},
				});

				censoredTexts = censoredTexts.update({
					...(effect.value.type === 'censored'
						? {
								add: [
									censoredMark.range(
										effect.value.from,
										effect.value.to,
									),
								],
								filter: (_from, _to, value) =>
									value.eq(highlightMark),
						  }
						: {
								add: [
									highlightMark.range(
										effect.value.from,
										effect.value.to,
									),
								],
								filter: (_from, _to, value) =>
									value.eq(censoredMark),
						  }),
				});
			}

		return censoredTexts;
	},
	provide(field) {
		return EditorView.decorations.from(field);
	},
});

/**
 * Censor the content between range `from` and `to`.
 */
export function doCensor(from: number, to: number, view: EditorView): void {
	const effects = [censorEffect.of({ from, to, type: 'censored' })];
	view.dispatch({ effects });
}

/**
 * Un-censor the content between range `from` and `to`.
 */
export function doUnCensor(from: number, to: number, view: EditorView): void {
	const effects = [censorEffect.of({ from, to, type: 'uncensored' })];
	view.dispatch({ effects });
}

export const censorTextExtension: Extension = [censorField];
