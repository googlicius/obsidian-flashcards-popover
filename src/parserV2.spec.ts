import { CardType } from './enums';
import { parse } from './parserV2';

jest.mock('./util/generateRandomString', () => ({
	generateRandomString: jest.fn(() => 'faked'),
}));

test('Test parsing of single line basic cards', () => {
	expect(parse({ text: 'Question::Answer' })).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: 'Question::Answer',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'Question::Answer\n<!--SR:!2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: 'Question::Answer\n<!--SR:!2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'Question::Answer <!--SR:2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: 'Question::Answer <!--SR:2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(parse({ text: 'Some text before\nQuestion ::Answer' })).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: 'Question ::Answer',
			lineNumber: 1,
		},
	]);
	expect(parse({ text: '#Title\n\nQ1::A1\nQ2:: A2' })).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: 'Q1::A1',
			lineNumber: 2,
		},
		{
			type: CardType.SingleLineBasic,
			text: 'Q2:: A2',
			lineNumber: 3,
		},
	]);
	expect(parse({ text: '#flashcards/science Question ::Answer' })).toEqual([
		{
			type: CardType.SingleLineBasic,
			text: '#flashcards/science Question ::Answer',
			lineNumber: 0,
		},
	]);
});

test('Test parsing of single line reversed cards', () => {
	expect(parse({ text: 'Question:::Answer' })).toEqual([
		{
			type: CardType.SingleLineReversed,
			text: 'Question:::Answer',
			lineNumber: 0,
		},
	]);
	expect(
		parse({
			text: 'Some text before\nQuestion :::Answer',
		}),
	).toEqual([
		{
			type: CardType.SingleLineReversed,
			text: 'Question :::Answer',
			lineNumber: 1,
		},
	]);
	expect(parse({ text: '#Title\n\nQ1:::A1\nQ2::: A2' })).toEqual([
		{
			type: CardType.SingleLineReversed,
			text: 'Q1:::A1',
			lineNumber: 2,
		},
		{
			type: CardType.SingleLineReversed,
			text: 'Q2::: A2',
			lineNumber: 3,
		},
	]);
});

test('Test parsing of multi line basic cards', () => {
	expect(parse({ text: 'Question\n?\nAnswer' })).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Question\n?\nAnswer',
			lineNumber: 1,
		},
	]);
	expect(parse({ text: 'Question\n? \nAnswer' })).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Question\n?\nAnswer',
			lineNumber: 1,
		},
	]);
	expect(
		parse({
			text: 'Question\n?\nAnswer <!--SR:!2021-08-11,4,270-->',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Question\n?\nAnswer <!--SR:!2021-08-11,4,270-->',
			lineNumber: 1,
		},
	]);
	expect(
		parse({
			text: 'Question\n?\nAnswer\n<!--SR:2021-08-11,4,270-->',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Question\n?\nAnswer\n<!--SR:2021-08-11,4,270-->',
			lineNumber: 1,
		},
	]);
	expect(
		parse({
			text: 'Some text before\nQuestion\n?\nAnswer',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Some text before\nQuestion\n?\nAnswer',
			lineNumber: 2,
		},
	]);
	expect(
		parse({
			text: 'Question\n?\nAnswer\nSome text after!',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Question\n?\nAnswer\nSome text after!',
			lineNumber: 1,
		},
	]);
	expect(
		parse({
			text: '#Title\n\nLine0\nQ1\n?\nA1\nAnswerExtra\n\nQ2\n?\nA2',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: 'Line0\nQ1\n?\nA1\nAnswerExtra',
			lineNumber: 4,
		},
		{
			type: CardType.MultiLineBasic,
			text: 'Q2\n?\nA2',
			lineNumber: 9,
		},
	]);
	expect(
		parse({
			text: '#flashcards/tag-on-previous-line\nQuestion\n?\nAnswer',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text: '#flashcards/tag-on-previous-line\nQuestion\n?\nAnswer',
			lineNumber: 2,
		},
	]);
});

test('Test parsing of multi line reversed cards', () => {
	expect(parse({ text: 'Question\n??\nAnswer' })).toEqual([
		{
			type: CardType.MultiLineReversed,
			text: 'Question\n??\nAnswer',
			lineNumber: 1,
		},
	]);
	expect(parse({ text: 'Some text before\nQuestion\n??\nAnswer' })).toEqual([
		{
			type: CardType.MultiLineReversed,
			text: 'Some text before\nQuestion\n??\nAnswer',
			lineNumber: 2,
		},
	]);
	expect(parse({ text: 'Question\n??\nAnswer\nSome text after!' })).toEqual([
		{
			type: CardType.MultiLineReversed,
			text: 'Question\n??\nAnswer\nSome text after!',
			lineNumber: 1,
		},
	]);
	expect(
		parse({
			text: '#Title\n\nLine0\nQ1\n??\nA1\nAnswerExtra\n\nQ2\n??\nA2',
		}),
	).toEqual([
		{
			type: CardType.MultiLineReversed,
			text: 'Line0\nQ1\n??\nA1\nAnswerExtra',
			lineNumber: 4,
		},
		{
			type: CardType.MultiLineReversed,
			text: 'Q2\n??\nA2',
			lineNumber: 9,
		},
	]);
});

test('Test parsing of cloze cards', () => {
	// ==highlights==
	expect(parse({ text: 'cloze ==deletion== test' })).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze ==deletion== test',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'cloze ==deletion== test\n<!--SR:2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze ==deletion== test\n<!--SR:2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'cloze ==deletion== test <!--SR:2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze ==deletion== test <!--SR:2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(parse({ text: '==this== is a ==deletion==\n' })).toEqual([
		{
			type: CardType.Cloze,
			text: '==this== is a ==deletion==',
			lineNumber: 0,
		},
	]);
	expect(
		parse({
			text:
				'some text before\n\na deletion on\nsuch ==wow==\n\n' +
				'many text\nsuch surprise ==wow== more ==text==\nsome text after\n\nHmm',
		}),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'a deletion on\nsuch ==wow==',
			lineNumber: 3,
		},
		{
			type: CardType.Cloze,
			text: 'many text\nsuch surprise ==wow== more ==text==\nsome text after',
			lineNumber: 6,
		},
	]);
	expect(parse({ text: 'srdf ==' })).toEqual([]);
	expect(parse({ text: 'lorem ipsum ==p\ndolor won==' })).toEqual([]);
	expect(parse({ text: 'lorem ipsum ==dolor won=' })).toEqual([]);
	// ==highlights== turned off
	expect(
		parse({
			text: 'cloze ==deletion== test',
			convertHighlightsToClozes: false,
			convertBoldTextToClozes: true,
		}),
	).toEqual([]);

	// **bolded**
	expect(parse({ text: 'cloze **deletion** test' })).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze **deletion** test',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'cloze **deletion** test\n<!--SR:2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze **deletion** test\n<!--SR:2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(
		parse({ text: 'cloze **deletion** test <!--SR:2021-08-11,4,270-->' }),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze **deletion** test <!--SR:2021-08-11,4,270-->',
			lineNumber: 0,
		},
	]);
	expect(parse({ text: '**this** is a **deletion**\n' })).toEqual([
		{
			type: CardType.Cloze,
			text: '**this** is a **deletion**',
			lineNumber: 0,
		},
	]);
	expect(
		parse({
			text:
				'some text before\n\na deletion on\nsuch **wow**\n\n' +
				'many text\nsuch surprise **wow** more **text**\nsome text after\n\nHmm',
		}),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'a deletion on\nsuch **wow**',
			lineNumber: 3,
		},
		{
			type: CardType.Cloze,
			text: 'many text\nsuch surprise **wow** more **text**\nsome text after',
			lineNumber: 6,
		},
	]);
	expect(parse({ text: 'srdf **' })).toEqual([]);
	expect(parse({ text: 'lorem ipsum **p\ndolor won**' })).toEqual([]);
	expect(parse({ text: 'lorem ipsum **dolor won*' })).toEqual([]);
	// **bolded** turned off
	expect(
		parse({
			text: 'cloze **deletion** test',
			convertHighlightsToClozes: true,
			convertBoldTextToClozes: false,
		}),
	).toEqual([]);

	// both
	expect(
		parse({ text: 'cloze **deletion** test ==another deletion==!' }),
	).toEqual([
		{
			type: CardType.Cloze,
			text: 'cloze **deletion** test ==another deletion==!',
			lineNumber: 0,
		},
	]);
});

test('Test parsing of a mix of card types', () => {
	expect(
		parse({
			text:
				'# Lorem Ipsum\n\nLorem ipsum dolor ==sit amet==, consectetur ==adipiscing== elit.\n' +
				'Duis magna arcu, eleifend rhoncus ==euismod non,==\nlaoreet vitae enim.\n\n' +
				'Fusce placerat::velit in pharetra gravida\n\n' +
				'Donec dapibus ullamcorper aliquam.\n??\nDonec dapibus ullamcorper aliquam.\n<!--SR:2021-08-11,4,270-->',
		}),
	).toEqual([
		{
			type: CardType.Cloze,
			text:
				'Lorem ipsum dolor ==sit amet==, consectetur ==adipiscing== elit.\n' +
				'Duis magna arcu, eleifend rhoncus ==euismod non,==\n' +
				'laoreet vitae enim.',
			lineNumber: 2,
			headings: ['Lorem Ipsum'],
		},
		{
			type: CardType.SingleLineBasic,
			text: 'Fusce placerat::velit in pharetra gravida',
			lineNumber: 6,
			headings: ['Lorem Ipsum'],
		},
		{
			type: CardType.MultiLineReversed,
			text: 'Donec dapibus ullamcorper aliquam.\n??\nDonec dapibus ullamcorper aliquam.\n<!--SR:2021-08-11,4,270-->',
			lineNumber: 9,
			headings: ['Lorem Ipsum'],
		},
	]);
});

test('Test codeblocks', () => {
	// no blank lines
	expect(
		parse({
			text:
				'How do you ... Python?\n?\n' +
				"```\nprint('Hello World!')\nprint('Howdy?')\nlambda x: x[0]\n```",
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text:
				'How do you ... Python?\n?\n' +
				"```\nprint('Hello World!')\nprint('Howdy?')\nlambda x: x[0]\n```",
			lineNumber: 1,
		},
	]);

	// with blank lines
	expect(
		parse({
			text:
				'How do you ... Python?\n?\n' +
				"```\nprint('Hello World!')\n\n\nprint('Howdy?')\n\nlambda x: x[0]\n```",
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text:
				'How do you ... Python?\n?\n' +
				"```\nprint('Hello World!')\n\n\nprint('Howdy?')\n\nlambda x: x[0]\n```",
			lineNumber: 1,
		},
	]);

	// general Markdown syntax
	expect(
		parse({
			text:
				'Nested Markdown?\n?\n' +
				'````ad-note\n\n' +
				'```git\n' +
				"+ print('hello')\n" +
				"- print('world')\n" +
				'```\n\n' +
				'~~~python\n' +
				"print('hello world')\n" +
				'~~~\n' +
				'````',
		}),
	).toEqual([
		{
			type: CardType.MultiLineBasic,
			text:
				'Nested Markdown?\n?\n' +
				'````ad-note\n\n' +
				'```git\n' +
				"+ print('hello')\n" +
				"- print('world')\n" +
				'```\n\n' +
				'~~~python\n' +
				"print('hello world')\n" +
				'~~~\n' +
				'````',
			lineNumber: 1,
		},
	]);
});

test.skip('Test not parsing cards in HTML comments', () => {
	expect(
		parse({
			text: '<!--\nQuestion\n?\nAnswer <!--SR:!2021-08-11,4,270-->\n-->',
		}),
	).toEqual([]);
	expect(
		parse({
			text: '<!--\nQuestion\n?\nAnswer <!--SR:!2021-08-11,4,270-->\n\n<!--cloze ==deletion== test-->-->',
		}),
	).toEqual([]);
	expect(parse({ text: '<!--cloze ==deletion== test-->' })).toEqual([]);
	expect(parse({ text: '<!--cloze **deletion** test-->' })).toEqual([]);
});

test('Test cards in a sequence', () => {
	const text = '@start\n\nQ1 :: A1\n\nQ2 :: A2\n\n@end\nQ3::A3';
	expect(parse({ text })).toMatchSnapshot();
});

test('test section tag', () => {
	const text =
		'#flashcards/math\n\nQ1 :: A1\n\n#flashcards/chem\nQ2 :: A2\n\nQ3::A3';
	expect(
		parse({
			text,
			allTags: ['#flashcards/math', '#flashcards/chem'],
		}),
	).toMatchSnapshot();
});

test('Test cards with headings', () => {
	expect(
		parse({
			text: '# Heading 0\nSome text\n#test_1\n\n# Heading 1\n\n# Heading 2\n\nQ1::A1\n#test_2\nQ2::A2\n#test_3\n# Heading A\n\nQ3::A3',
			allTags: ['#test_1', '#test_2','#test_3'],
		}),
	).toMatchObject([
		{
			lineNumber: 8,
			tag: '#test_1',
			text: 'Q1::A1',
			type: 0,
			headings: ['Heading 1', 'Heading 2'],
		},
		{
			lineNumber: 10,
			tag: '#test_2',
			text: 'Q2::A2',
			type: 0,
		},
		{
			lineNumber: 14,
			tag: '#test_3',
			text: 'Q3::A3',
			type: 0,
			headings: ['Heading A']
		},
	]);
});
