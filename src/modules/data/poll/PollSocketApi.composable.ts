import { handle, on, PermittedStoreActions } from "@/types/board/ActionFactory";
import { notifyError } from "@data-app";
import { useSocketConnection } from "@data-board";
import { useI18n } from "vue-i18n";
import * as PollActions from "./pollActions";
import { usePollsStore } from "./polls";

// Poll voting is the only poll action that travels over the live board socket (see the plan's
// "Live-Updates über den Board-Socket" section). This registers its own dispatch handler with the
// shared socket connection (the same underlying socket.io instance as useCardSocketApi - see
// socket.ts, `instance` is a module-level singleton) so successful votes land in the poll store
// (polls.ts) instead of Card.store.ts, since poll results aren't element content.
export const usePollSocketApi = () => {
	const { t } = useI18n();
	const { applyVoteSuccess } = usePollsStore();

	const dispatch = (action: PermittedStoreActions<typeof PollActions>) => {
		handle(
			action,
			on(PollActions.pollVoteSuccess, (payload) => applyVoteSuccess(payload)),
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
