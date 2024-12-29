# Obsidian Flash Card Popover
Different reviewing UI of the [Obsidian Spaced Repetition Plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition/). Allows to traverse through related notes when reviewing instead of opening a modal as the original plugin does, and also able to update the cards while being reviewed.

New feature: Allow adding follow-up cards to fortify a specific card.

The reason why I choose to clone instead of contribute to the original Plugin is that it provides a completely different reviewing UI and features which the Author might doesn't want it.

### Review cards
You can modify the card while reviewing it, but make sure your edit is at least 70% the same as the original card.

You can navigate some where in the same tab while reviewing, click Review Flashcards button to return to the current card.

If you want to add more knowledge of a card while keeping it lean and simple, put them as follow-up cards.

### Tips for better learning
1. If your cards in a specific desk are added up over time, try to separate them into multiple subdesks to avoid very old and new cards being mixed together when reviewing, that might make you feel overwhelmed. For examples: #flashcards/English/8_2024, #flashcards/English/9_2024,...

2. If you find a card is so hard, break it into smaller cards, create another card with different perspective to make more connection to it, or create follow up cards.

3. By default, follow-up cards don't need any tag. but if you want them both standalone and follow-up simultaneously, you can give them a tag.


### Documentation
For creating cards, settings, please refer to the original plugin's documentation: https://www.stephenmwangi.com/obsidian-spaced-repetition/

Please be aware that this plugin could be outdated from the original plugin at the time it was cloned.


## TODO
- [x] Follow-up cards
- [ ] Chaining cards
- [x] Auto-run timer (How fast can you response)
- [ ] Option to sort sub-desks by recent access date.
- [ ] Multiple review sessions (Pause the current review desk, and start another one).
- [ ] An uncovered area on the card's backside while reviewing.
- [x] Allow multiple tag sections in one note file
- [ ] Cache flashcard notes to avoid scan the whole vault.
- [ ] **AI integration** helps automatically break large cards into smaller, logical follow-up cards. Refine ambiguous, hard cards and suggest updates. Reminder "Tips for better learning".
