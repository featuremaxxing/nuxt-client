import { createTestableSharedComposable } from "@/utils/create-shared-composable";
import { PollAnswerResponse, PollResultsResponse } from "@api-server";
import { reactive, readonly } from "vue";
import { usePollApi } from "./PollApi.composable";

export interface PollState {
	results?: PollResultsResponse["results"];
	voters?: PollResultsResponse["voters"];
	myVote?: PollAnswerResponse[];
	totalVotes: number;
	participantCount: number;
}

// Small reactive store keyed by elementId, updated both by the REST fetch and by the poll socket
// handler (see PollSocketApi.composable.ts). Poll results are intentionally NOT part of
// Card.store.ts: they aren't element content, they're per-user vote data that must not leak into
// the generic content-element update flow (and shouldn't be duplicated to every board client via
// the element-update broadcast).
const pollsByElementId = reactive<Record<string, PollState>>({});

const emptyState = (): PollState => ({
	results: undefined,
	voters: undefined,
	myVote: undefined,
	totalVotes: 0,
	participantCount: 0,
});

export const usePollsStore = createTestableSharedComposable(() => {
	const { fetchResults } = usePollApi();

	const getState = (elementId: string): PollState => pollsByElementId[elementId] ?? emptyState();

	const setState = (elementId: string, patch: Partial<PollState>) => {
		pollsByElementId[elementId] = {
			...getState(elementId),
			...patch,
		};
	};

	const fetchPollResults = async (elementId: string): Promise<void> => {
		const response = await fetchResults(elementId);
		if (!response) return;

		setState(elementId, {
			results: response.results,
			voters: response.voters,
			// PollResultsResponse.myVote is already a flat array of answers (not wrapped in an
			// object), unlike the earlier hand-written stand-in type.
			myVote: response.myVote,
			totalVotes: response.totalVotes,
			participantCount: response.participantCount,
		});
	};

	// Invoked by the poll-vote-success socket handler. `results` is only present when the poll's
	// showResultsLive flag is on - see PollSocketApi.composable.ts. Voting itself only happens via
	// the socket (there is no REST vote-casting endpoint); callers that need their own `myVote`/
	// `participantCount` refreshed when showResultsLive is off should follow up with
	// fetchPollResults (see PollVoteForm.vue).
	const applyVoteSuccess = (payload: {
		elementId: string;
		totalVotes: number;
		participantCount?: number;
		results?: PollResultsResponse["results"];
	}) => {
		setState(payload.elementId, {
			totalVotes: payload.totalVotes,
			participantCount: payload.participantCount ?? getState(payload.elementId).participantCount,
			...(payload.results ? { results: payload.results } : {}),
		});
	};

	return {
		polls: readonly(pollsByElementId),
		getState,
		fetchPollResults,
		applyVoteSuccess,
	};
});
