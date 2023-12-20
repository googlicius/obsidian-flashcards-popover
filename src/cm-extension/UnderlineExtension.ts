import { StateEffect, StateField } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	keymap,
} from '@codemirror/view';

const addUnderline = StateEffect.define<{ from: number; to: number }>({
	map: ({ from, to }, change) => ({
		from: change.mapPos(from),
		to: change.mapPos(to),
	}),
});

const underlineMark = Decoration.mark({ class: 'cm-underline' });

const underlineField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(underlines, tr) {
		underlines = underlines.map(tr.changes);
		for (const effect of tr.effects)
			if (effect.is(addUnderline)) {
				underlines = underlines.update({
					add: [
						underlineMark.range(effect.value.from, effect.value.to),
					],
				});
			}
		return underlines;
	},
	provide: (f) => EditorView.decorations.from(f),
});

const underlineTheme = EditorView.baseTheme({
	'.cm-underline': {
		textDecoration: 'underline',
	},
});

export function underlineSelection(view: EditorView) {
	const effects: StateEffect<unknown>[] = view.state.selection.ranges
		.filter((r) => !r.empty)
		.map(({ from, to }) => {
			console.log('OF', addUnderline.of({ from, to }));
			return addUnderline.of({ from, to });
		});
	if (!effects.length) return false;

	// console.log('EFFECT', effects);

	view.dispatch({ effects });
	return true;
}

const underlineKeymap = keymap.of([
	{
		key: 'Mod-u',
		preventDefault: true,
		run: underlineSelection,
	},
]);

export const underlineExtension = [
	underlineKeymap,
	underlineField,
	underlineTheme,
];
