import { createAction, props } from "@/types/board/ActionFactory";
import { PollAnswerResponse, PollResultsResponse } from "@api-server";

// Voting is the one poll action that goes over the live board socket (see socket.ts /
// cardSocketApi.composable.ts for the established update-element-request/-success/-failure
// pattern this mirrors 1:1). Everything else about a poll (questions, options, status, ...) is a
// regular element content update and already goes through the generic update-element-* actions.

export type PollVoteRequestPayload = {
	elementId: string;
	answers: PollAnswerResponse[];
};

export type PollVoteSuccessPayload = {
	elementId: string;
	totalVotes: number;
	participantCount?: number;
	// Only present when the poll's showResultsLive flag is on - see poll-vote-flow in the plan.
	// Otherwise the room only learns that the vote count went up, and permitted clients fetch the
	// actual numbers via REST (GET /polls/:elementId/results).
	results?: PollResultsResponse["results"];
	isOwnAction: boolean;
};

export type PollVoteFailurePayload = PollVoteRequestPayload;

export const pollVoteRequest = createAction("poll-vote-request", props<PollVoteRequestPayload>());
export const pollVoteSuccess = createAction("poll-vote-success", props<PollVoteSuccessPayload>());
export const pollVoteFailure = createAction("poll-vote-failure", props<PollVoteFailurePayload>());
