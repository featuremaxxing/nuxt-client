import * as PollActions from "./pollActions";
import { usePollsStore } from "./polls";
import { handle, on, PermittedStoreActions } from "@/types/board/ActionFactory";
import { notifyError } from "@data-app";
import { useSocketConnection } from "@data-board";
import { useI18n } from "vue-i18n";

// Poll voting is the only poll action that travels over the live board socket (see the plan's
// "Live-Updates über den Board-Socket" section). This registers its own dispatch handler with the
// shared socket connection (the same underlying socket.io instance as useCardSocketApi - see
// socket.ts, `instance` is a module-level singleton) so successful votes land in the poll store
// (polls.ts) instead of Card.store.ts, since poll results aren't element content.
export const usePollSocketApi = () => {
	const { t } = useI18n();
	const { applyVoteSuccess, fetchPollResults } = usePollsStore();

	const dispatch = (action: PermittedStoreActions<typeof PollActions>) => {
		handle(
			action,
			on(PollActions.pollVoteSuccess, (payload) => {
				applyVoteSuccess(payload);

				// `results` is only present in the broadcast when the poll's showResultsLive flag is
				// on (see the gateway's poll-vote handler) - otherwise a viewer permitted to see
				// results (a manager, or anyone once the poll is closed) would only see totalVotes
				// tick up while the chart/numbers below it stay frozen at whatever they were on page
				// load. The REST endpoint enforces the same visibility as the socket payload, so this
				// is a harmless no-op for a viewer not allowed to see results.
				if (payload.results === undefined) {
					void fetchPollResults(payload.elementId);
				}
			}),
			on(PollActions.pollVoteFailure, () => notifyError(t("components.cardElement.pollElement.voteError")))
		);
	};

	const { emitOnSocket } = useSocketConnection(dispatch);

	const castVoteViaSocket = (payload: PollActions.PollVoteRequestPayload) => {
		emitOnSocket("poll-vote-request", payload);
	};

	return {
		castVoteViaSocket,
	};
};
