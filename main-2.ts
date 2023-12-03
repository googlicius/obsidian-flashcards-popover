import {
	App,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			'dice',
			'Sample Plugin',
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice('This is a notice!');
			},
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app, this).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			},
		});
		// THis adds an editor command that open a popup at cursor position.
		// this.addCommand({
		// 	id: 'sample-editor-popover',
		// 	name: 'Sample editor popover',
		// 	editorCheckCallback(checking, editor, ctx) {
		// 		// ctx.hoverPopover.
		// 		return true;
		// 	},
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						const file =
							this.app.metadataCache.getFirstLinkpathDest(
								'2023-04-15-Saturday',
								this.app.workspace.getActiveFile()
									?.path as string,
							);
						if (file) {
							new SampleModal(this.app, this, file).open();
						} else {
							new SampleModal(this.app, this).open();
						}
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	file: TFile;
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin, file?: TFile) {
		super(app);
		if (file) {
			this.file = file;
			this.plugin = plugin;
		}
	}

	async onOpen() {
		const { contentEl } = this;
		const fileCache = this.app.metadataCache.getFileCache(this.file);
		if (fileCache) {
			const markdown = await this.app.vault.read(this.file);
			// contentEl.setText(markdown);
			await MarkdownRenderer.render(
				this.app,
				markdown,
				contentEl,
				(this.file.parent as TFolder).path,
				this.plugin,
			);
			// MarkdownRenderer.renderMarkdown(markdownString, containerEl, this.notePath, this.plugin);
			// contentEl.createEl('div', { html });

			// Handle internal links
			contentEl
				.querySelectorAll('a.internal-link')
				.forEach((el: HTMLAnchorElement) => {
					el.onclick = (event: MouseEvent) => {
						event.preventDefault();
						// Open the linked file in a new tab
						const path = el.getAttribute('href') as string;
						const file =
							this.app.metadataCache.getFirstLinkpathDest(
								path,
								this.file.path,
							);
						if (file) {
							this.app.workspace.activeLeaf?.openFile(file);
						}
					};
				});
		} else {
			contentEl.setText('Woah!');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
