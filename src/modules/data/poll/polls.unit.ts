import { usePollsStore } from "./polls";

const { fetchResultsMock } = vi.hoisted(() => ({
	fetchResultsMock: vi.fn(),
}));

vi.mock("./PollApi.composable", () => ({
	usePollApi: () => ({ fetchResults: fetchResultsMock }),
}));

describe("polls store", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns an empty default state for an element that was never fetched", () => {
		const { getState } = usePollsStore();

		expect(getState("unknown-element")).toEqual({
			results: undefined,
			voters: undefined,
			myVote: undefined,
			totalVotes: 0,
			participantCount: 0,
		});
	});

	it("stores the REST fetch result keyed by elementId", async () => {
		fetchResultsMock.mockResolvedValue({
			totalVotes: 3,
			participantCount: 5,
			myVote: [{ questionId: "q1", selectedOptionIds: ["o1"] }],
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 3 }] }],
		});

		const { fetchPollResults, getState } = usePollsStore();
		await fetchPollResults("element-1");

		expect(getState("element-1").totalVotes).toBe(3);
		expect(getState("element-1").myVote).toEqual([{ questionId: "q1", selectedOptionIds: ["o1"] }]);
	});

	it("does not touch the state when the fetch fails (returns undefined)", async () => {
		fetchResultsMock.mockResolvedValue(undefined);

		const { fetchPollResults, getState } = usePollsStore();
		await fetchPollResults("element-2");

		expect(getState("element-2").totalVotes).toBe(0);
	});

	it("applies a vote-success payload without results when the poll isn't live", () => {
		const { applyVoteSuccess, getState } = usePollsStore();

		applyVoteSuccess({ elementId: "element-3", totalVotes: 7 });

		expect(getState("element-3").totalVotes).toBe(7);
		expect(getState("element-3").results).toBeUndefined();
	});

	it("applies a vote-success payload with results when the poll shows live results", () => {
		const { applyVoteSuccess, getState } = usePollsStore();

		applyVoteSuccess({
			elementId: "element-4",
			totalVotes: 2,
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 2 }] }],
		});

		expect(getState("element-4").results).toEqual([{ questionId: "q1", counts: [{ optionId: "o1", count: 2 }] }]);
	});
});
