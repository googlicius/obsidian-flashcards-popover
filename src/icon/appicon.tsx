import { addIcon } from 'obsidian';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { bookHeartIcon } from './icons';

export const ICON_NAME = 'SpacedRepIcon';

export function appIcon123(name = ICON_NAME) {
	addIcon(name, bookHeartIcon);
}
