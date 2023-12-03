import { ValueCountDict } from './NumberCountDict';

describe('ValueCountDict', () => {
	let dict: ValueCountDict;

	beforeEach(() => {
		dict = new ValueCountDict();
	});

	it('should increment count', () => {
		dict.incrementCount(1);
		expect(dict.dict[1]).toEqual(1);
		dict.incrementCount(1);
		expect(dict.dict[1]).toEqual(2);
	});

	it('should return max value', () => {
		dict.incrementCount(1);
		dict.incrementCount(2);
		expect(dict.getMaxValue()).toEqual(2);
	});

	it('should return total of value multiply count', () => {
		dict.incrementCount(1);
		dict.incrementCount(1);
		dict.incrementCount(2);
		expect(dict.getTotalOfValueMultiplyCount()).toEqual(4);
	});
});
