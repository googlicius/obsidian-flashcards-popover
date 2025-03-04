/* eslint-disable no-mixed-spaces-and-tabs */
import { Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

export type ObscureEffectValue = {
	from: number;
	to: number;
	type: 'obscured' | 'unobscured';
};

const highlightMark = Decoration.mark({
	class: 'cm-highlight',
});

const obscureEffect = StateEffect.define<ObscureEffectValue>({
	map: (value, change) => ({
		from: change.mapPos(value.from),
		to: change.mapPos(value.to),
		type: value.type,
	}),
});

const obscureField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(obscuredTexts, tr) {
		obscuredTexts = obscuredTexts.map(tr.changes);

		for (const effect of tr.effects)
			if (effect.is(obscureEffect)) {
				const obscuredMark = Decoration.mark({
					class: 'cm-obscured',
					attributes: {
						title: 'Click to show the answer',
						'data-effect-value': JSON.stringify(effect.value),
					},
				});

				obscuredTexts = obscuredTexts.update({
					...(effect.value.type === 'obscured'
						? {
								add: [
									obscuredMark.range(
										effect.value.from,
										effect.value.to,
									),
								],
								// filter: (_from, _to, value) =>
								// 	value.eq(highlightMark),
						  }
						: {
								add: [
									highlightMark.range(
										effect.value.from,
										effect.value.to,
									),
								],
								filter: (_from, _to, value) =>
									value.eq(obscuredMark),
						  }),
				});
			}

		return obscuredTexts;
	},
	provide(field) {
		return EditorView.decorations.from(field);
	},
});

function findMarkedRangesInRange(
	doc: string,
	rangeFrom: number,
	rangeTo: number,
): { from: number; to: number }[] {
	const ranges: { from: number; to: number }[] = [];
	const text = doc.slice(rangeFrom, rangeTo);
	let pos = 0; // Relative to the sliced text

	while (pos < text.length) {
		const start = text.indexOf('==', pos);
		if (start === -1) break;

		const endMarkerStart = text.indexOf('==', start + 2);
		if (endMarkerStart === -1) break;

		const absoluteStart = rangeFrom + start;
		const absoluteEnd = rangeFrom + endMarkerStart + 2;

		// Ensure the range stays within bounds
		if (absoluteEnd <= rangeTo) {
			ranges.push({
				from: absoluteStart, // Start at the first ==
				to: absoluteEnd, // End after the second ==
			});
		}

		pos = endMarkerStart + 2; // Move past the closing ==
	}

	return ranges;
}

/**
 * Obscure only the ==-marked content between range `from` and `to`.
 */
export function obscureMarked(
	from: number,
	to: number,
	view: EditorView,
): void {
	const docText = view.state.doc.toString();
	const markedRanges = findMarkedRangesInRange(docText, from, to);

	if (markedRanges.length > 0) {
		const effects = markedRanges.map((range) =>
			obscureEffect.of({
				from: range.from,
				to: range.to,
				type: 'obscured',
			}),
		);
		view.dispatch({ effects });
	}
	// No fallback - only obscures marked text, does nothing if no == found
}

/**
 * Obscure the content between range `from` and `to`.
 */
export function obscure(from: number, to: number, view: EditorView): void {
	const effects = [obscureEffect.of({ from, to, type: 'obscured' })];
	view.dispatch({ effects });
}

/**
 * Un-obscure the content between range `from` and `to`.
 */
export function unObscure(from: number, to: number, view: EditorView): void {
	const effects = [obscureEffect.of({ from, to, type: 'unobscured' })];
	view.dispatch({ effects });
}

export const obscureTextExtension: Extension = [obscureField];
