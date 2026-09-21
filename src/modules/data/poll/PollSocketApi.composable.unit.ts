import * as PollActions from "./pollActions";
import { usePollSocketApi } from "./PollSocketApi.composable";
import { Action } from "@/types/board/ActionFactory";
import { useSocketConnection } from "@data-board";
import { Mock } from "vitest";
import { useI18n } from "vue-i18n";

vi.mock("vue-i18n");
(useI18n as Mock).mockReturnValue({ t: (key: string) => key });

const { applyVoteSuccessMock, fetchPollResultsMock, notifyErrorMock, emitOnSocketMock } = vi.hoisted(() => ({
	applyVoteSuccessMock: vi.fn(),
	fetchPollResultsMock: vi.fn(),
	notifyErrorMock: vi.fn(),
	emitOnSocketMock: vi.fn(),
}));

vi.mock("./polls", () => ({
	usePollsStore: () => ({ applyVoteSuccess: applyVoteSuccessMock, fetchPollResults: fetchPollResultsMock }),
}));

vi.mock("@data-app", () => ({
	notifyError: notifyErrorMock,
}));

vi.mock("@data-board", () => ({
	useSocketConnection: vi.fn(),
}));

describe("usePollSocketApi", () => {
	let capturedDispatch: (action: Action) => void;

	beforeEach(() => {
		vi.mocked(useSocketConnection).mockImplementation((dispatch) => {
			capturedDispatch = dispatch;
			return { emitOnSocket: emitOnSocketMock } as unknown as ReturnType<typeof useSocketConnection>;
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("emits poll-vote-request via the socket", () => {
		const { castVoteViaSocket } = usePollSocketApi();

		castVoteViaSocket({ elementId: "element-1", answers: [] });

		expect(emitOnSocketMock).toHaveBeenCalledWith("poll-vote-request", { elementId: "element-1", answers: [] });
	});

	it("applies a vote-success payload that already carries results without an extra fetch", () => {
		usePollSocketApi();

		capturedDispatch(
			PollActions.pollVoteSuccess({
				elementId: "element-1",
				totalVotes: 3,
				results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 3 }] }],
				isOwnAction: false,
			})
		);

		expect(applyVoteSuccessMock).toHaveBeenCalled();
		expect(fetchPollResultsMock).not.toHaveBeenCalled();
	});

	it("fetches results when a vote-success payload has none (poll isn't showing live results)", () => {
		usePollSocketApi();

		capturedDispatch(
			PollActions.pollVoteSuccess({
				elementId: "element-2",
				totalVotes: 4,
				isOwnAction: false,
			})
		);

		expect(applyVoteSuccessMock).toHaveBeenCalled();
		expect(fetchPollResultsMock).toHaveBeenCalledWith("element-2");
	});

	it("shows an error notification on vote failure", () => {
		usePollSocketApi();

		capturedDispatch(
			PollActions.pollVoteFailure({
				elementId: "element-1",
				answers: [],
			})
		);

		expect(notifyErrorMock).toHaveBeenCalled();
	});
});
