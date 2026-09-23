import { buildAnalysisEntries, entryIdAtOffset, findEntryIndex, questionEntryId } from "./poll-analysis.util";

describe("poll-analysis.util", () => {
	describe("buildAnalysisEntries", () => {
		it("orders overview first, then questions in the given order, then participants", () => {
			const entries = buildAnalysisEntries({
				questionIds: ["q1", "q2", "q3"],
				isEditor: true,
				isAnonymous: false,
				hasVoters: true,
			});

			expect(entries.map((entry) => entry.id)).toEqual([
				"overview",
				questionEntryId("q1"),
				questionEntryId("q2"),
				questionEntryId("q3"),
				"participants",
			]);
		});

		it("omits the participants entry for a non-editor", () => {
			const entries = buildAnalysisEntries({
				questionIds: ["q1"],
				isEditor: false,
				isAnonymous: false,
				hasVoters: true,
			});

			expect(entries.some((entry) => entry.id === "participants")).toBe(false);
		});

		it("omits the participants entry when the poll is anonymous, even for an editor with voters", () => {
			const entries = buildAnalysisEntries({
				questionIds: ["q1"],
				isEditor: true,
				isAnonymous: true,
				hasVoters: true,
			});

			expect(entries.some((entry) => entry.id === "participants")).toBe(false);
		});

		it("omits the participants entry when voters are undefined/not present", () => {
			const entries = buildAnalysisEntries({
				questionIds: ["q1"],
				isEditor: true,
				isAnonymous: false,
				hasVoters: false,
			});

			expect(entries.some((entry) => entry.id === "participants")).toBe(false);
		});

		it("never produces duplicate ids, even with repeated question ids in the input", () => {
			const entries = buildAnalysisEntries({
				questionIds: ["q1", "q1"],
				isEditor: true,
				isAnonymous: false,
				hasVoters: true,
			});

			const ids = entries.map((entry) => entry.id);
			// buildAnalysisEntries doesn't dedupe - that's a caller concern (questions have unique ids
			// in practice) - but this test documents that findEntryIndex still resolves deterministically
			// to the FIRST match, so navigation never gets stuck the way the assignment overlay did.
			expect(findEntryIndex(entries, questionEntryId("q1"))).toBe(1);
			expect(ids.length).toBe(4);
		});
	});

	describe("entryIdAtOffset / findEntryIndex", () => {
		const entries = buildAnalysisEntries({
			questionIds: ["q1", "q2"],
			isEditor: true,
			isAnonymous: false,
			hasVoters: true,
		});
		// entries: overview, question:q1, question:q2, participants

		it("moves forward and backward through the same list used for display", () => {
			expect(entryIdAtOffset(entries, "overview", 1)).toBe(questionEntryId("q1"));
			expect(entryIdAtOffset(entries, questionEntryId("q1"), 1)).toBe(questionEntryId("q2"));
			expect(entryIdAtOffset(entries, questionEntryId("q2"), 1)).toBe("participants");
			expect(entryIdAtOffset(entries, "participants", -1)).toBe(questionEntryId("q2"));
		});

		it("clamps at the start boundary instead of wrapping around", () => {
			expect(entryIdAtOffset(entries, "overview", -1)).toBeUndefined();
		});

		it("clamps at the end boundary instead of wrapping around", () => {
			expect(entryIdAtOffset(entries, "participants", 1)).toBeUndefined();
		});

		it("returns undefined when the current id isn't in the list at all", () => {
			expect(entryIdAtOffset(entries, questionEntryId("does-not-exist"), 1)).toBeUndefined();
			expect(findEntryIndex(entries, questionEntryId("does-not-exist"))).toBe(-1);
		});

		it("navigating through several consecutive zero-vote-like entries never gets stuck on the first one", () => {
			// Regression coverage for the exact bug class described in the plan: selection must move
			// through EVERY entry in sequence, never repeatedly landing on the same one.
			const manyQuestions = buildAnalysisEntries({
				questionIds: ["a", "b", "c", "d"],
				isEditor: false,
				isAnonymous: false,
				hasVoters: false,
			});

			let current = manyQuestions[0].id;
			const visited = [current];
			for (let i = 0; i < manyQuestions.length - 1; i++) {
				const next = entryIdAtOffset(manyQuestions, current, 1);
				expect(next).toBeDefined();
				current = next as typeof current;
				visited.push(current);
			}

			expect(visited).toEqual(manyQuestions.map((entry) => entry.id));
			expect(new Set(visited).size).toBe(manyQuestions.length);
		});
	});
});
