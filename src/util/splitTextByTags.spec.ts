import { splitTextByTags } from './splitTextByTags';

describe('splitTextByTags', () => {
    it('should split the text by 1 tag', () => {
        const text = `

        #flashcard

        #tag3

        # tag1 Test 3 // Not split this because it's mixing with text
        Test 4

        #tag2 

        AAAAAA :: BBBBBB
                    `;
        
                const tags = ['#flashcard'];
                const results = splitTextByTags(text, tags);
        
                expect(results).toMatchSnapshot();
    });

	it('should split the text by 2 given tags', () => {
		const text = `
#tag1

#tag3

# tag1 Test 3 // Not split this because it's mixing with text
Test 4

#tag2 

AAAAAA :: BBBBBB
            `;

		const tags = ['#tag1', '#tag2'];
		const results = splitTextByTags(text, tags);

		expect(results).toMatchSnapshot();
	});
});
