import { Decoration, ViewPlugin, DecorationSet } from '@codemirror/view';
import { EditorView, ViewUpdate } from '@codemirror/view';

const startMark = Decoration.mark({ class: 'cm-start-token' });
const endMark = Decoration.mark({ class: 'cm-end-token' });

const highlightPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView) {
			const decorations = [];
			const text = view.state.doc.toString();

			const matches = text.matchAll(/(@start|@end)/g);
			for (const match of matches) {
				const from = match.index!;
				const to = from + match[0].length;
				decorations.push(
					match[0] === '@start'
						? startMark.range(from, to)
						: endMark.range(from, to),
				);
			}

			return Decoration.set(decorations);
		}
	},
	{
		decorations: (v) => v.decorations,
	},
);

export const blockExtension = [highlightPlugin];
