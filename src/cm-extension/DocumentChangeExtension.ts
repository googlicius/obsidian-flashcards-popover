import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { debounce } from 'obsidian';

/**
 * Configuration options for the document change extension
 */
export interface DocumentChangeExtensionConfig {
	/**
	 * Callback that gets triggered whenever the document content changes
	 * @param view The editor view
	 * @param docChanged Whether the document content has changed
	 * @param update The ViewUpdate object containing details about the change
	 */
	onChange: (
		view: EditorView,
		docChanged: boolean,
		update: ViewUpdate,
	) => void;

    /**
	 * Debounce time in milliseconds
	 * @default 2000
	 */
	debounceTime?: number;
}

/**
 * Creates a ViewPlugin that tracks document changes in CodeMirror
 */
const documentChangePlugin = (config: DocumentChangeExtensionConfig) => {
	return ViewPlugin.fromClass(
		class {
            private debouncedOnChange: (view: EditorView, docChanged: boolean, update: ViewUpdate) => void;

			constructor(private view: EditorView) {
                // Create a debounced version of the onChange callback
				this.debouncedOnChange = debounce(
					(view: EditorView, docChanged: boolean, update: ViewUpdate) => {
						config.onChange(view, docChanged, update);
					},
					config.debounceTime ?? 2000,
					true
				);
            }

			update(update: ViewUpdate) {
				// docChanged is true when the document content has been modified
				if (update.docChanged) {
					this.debouncedOnChange(this.view, true, update);
				}
			}
		},
	);
};

/**
 * Creates a CodeMirror extension that detects document changes
 * and calls the provided callback function when changes occur
 *
 * @param config Configuration options with onChange callback
 * @returns A CodeMirror extension
 */
export function documentChangeExtension(
	config: DocumentChangeExtensionConfig,
): Extension {
	return documentChangePlugin(config);
}
