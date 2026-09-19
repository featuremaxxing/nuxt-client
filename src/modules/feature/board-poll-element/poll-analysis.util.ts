// Pure logic for the fullscreen analysis overlay's left-hand navigation: building the ordered
// list of entries and deriving offset-based navigation from it. Kept DOM/Vue-free so the bug the
// sibling assignment overlay shipped (selection keyed on a field that could be null for multiple
// rows at once, so `find()` always matched the first such row - see the plan's "Den
// Aufgaben-Bug nicht erben" section) can be fully unit-tested without mounting anything.

export type AnalysisEntryId = "overview" | `question:${string}` | "participants";

export interface AnalysisQuestionEntry {
	id: `question:${string}`;
	type: "question";
	questionId: string;
}

export interface AnalysisOverviewEntry {
	id: "overview";
	type: "overview";
}

export interface AnalysisParticipantsEntry {
	id: "participants";
	type: "participants";
}

export type AnalysisEntry = AnalysisOverviewEntry | AnalysisQuestionEntry | AnalysisParticipantsEntry;

export const questionEntryId = (questionId: string): `question:${string}` => `question:${questionId}`;

export interface BuildAnalysisEntriesInput {
	questionIds: string[];
	isEditor: boolean;
	isAnonymous: boolean;
	hasVoters: boolean;
}

/**
 * Builds the ordered nav entry list: overview, then one entry per question (in the given order),
 * then a participants entry - but ONLY when the viewer is an editor, the poll is not anonymous,
 * and voter data is actually present. Voter data is only ever present for editors of
 * non-anonymous polls to begin with (the server never sends `voters` otherwise), but this
 * function checks all three flags independently as defense in depth: it must never emit a
 * participants entry a student could reach, even if voters happened to be present in the state.
 */
export const buildAnalysisEntries = (input: BuildAnalysisEntriesInput): AnalysisEntry[] => {
	const entries: AnalysisEntry[] = [{ id: "overview", type: "overview" }];

	input.questionIds.forEach((questionId) => {
		entries.push({ id: questionEntryId(questionId), type: "question", questionId });
	});

	if (input.isEditor && !input.isAnonymous && input.hasVoters) {
		entries.push({ id: "participants", type: "participants" });
	}

	return entries;
};

export const findEntryIndex = (entries: AnalysisEntry[], id: AnalysisEntryId): number =>
	entries.findIndex((entry) => entry.id === id);

/**
 * Returns the id of the entry at `selectedIndex + delta` within `entries`, or `undefined` if that
 * would go past either end (no wraparound). Selection, prev/next buttons and arrow-key handling
 * must all derive their index from this SAME `entries` array so they can never disagree about
 * what "next" means - the bug in the assignment overlay came from two lists that could drift
 * apart.
 */
export const entryIdAtOffset = (
	entries: AnalysisEntry[],
	selectedId: AnalysisEntryId,
	delta: number
): AnalysisEntryId | undefined => {
	const currentIndex = findEntryIndex(entries, selectedId);
	if (currentIndex === -1) return undefined;

	const nextIndex = currentIndex + delta;
	if (nextIndex < 0 || nextIndex >= entries.length) return undefined;

	return entries[nextIndex].id;
};
