import moment from 'moment';
import {
	escapeRegexString,
	getAllTagsFromText,
	literalStringReplace,
	splitTextIntoLineArray,
	ticksFromDate,
} from './utils';

describe('getAllTagsFromText', () => {
	it('should return all tags from the text', () => {
		const text = 'This is a test #tag1 and another #tag2';
		const expectedTags = ['#tag1', '#tag2'];
		const result = getAllTagsFromText(text);
		expect(result).toEqual(expectedTags);
	});

	it('should return an empty array if there are no tags', () => {
		const text = 'This is a test with no tags';
		const expectedTags: string[] = [];
		const result = getAllTagsFromText(text);
		expect(result).toEqual(expectedTags);
	});
});

describe('splitTextIntoLineArray', () => {
	it('should split text into lines', () => {
		const text = 'Line 1\nLine 2\nLine 3';
		const expected = ['Line 1', 'Line 2', 'Line 3'];
		const result = splitTextIntoLineArray(text);
		expect(result).toEqual(expected);
	});
});

describe('ticksFromDate', () => {
	it('should return correct ticks from date', () => {
		const year = 2022;
		const month = 0; // January
		const day = 1;
		const expected = moment({ year, month, day }).utc().valueOf();
		const result = ticksFromDate(year, month, day);
		expect(result).toEqual(expected);
	});
});

describe('literalStringReplace', () => {
	it('should replace a substring in a string', () => {
		const text = 'Hello, world!';
		const searchStr = 'world';
		const replacementStr = 'Jest';
		const expected = 'Hello, Jest!';
		const result = literalStringReplace(text, searchStr, replacementStr);
		expect(result).toEqual(expected);
	});
});

describe('escapeRegexString', () => {
	it('should escape special regex characters in a string', () => {
		const text = 'Hello, $world^!';
		const expected = 'Hello, \\$world\\^!';
		const result = escapeRegexString(text);
		expect(result).toEqual(expected);
	});
});
