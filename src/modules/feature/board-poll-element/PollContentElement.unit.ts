import PollContentElement from "./PollContentElement.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollStatus } from "@api-server";
import { mount } from "@vue/test-utils";
import { computed } from "vue";

const {
	useBoardAllowedOperationsMock,
	useBoardFocusHandlerMock,
	usePollsStoreMock,
	fetchPollResultsMock,
	usePollSocketApiMock,
} = vi.hoisted(() => ({
	useBoardAllowedOperationsMock: vi.fn(),
	useBoardFocusHandlerMock: vi.fn(),
	usePollsStoreMock: vi.fn(),
	fetchPollResultsMock: vi.fn(),
	usePollSocketApiMock: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useBoardAllowedOperations: useBoardAllowedOperationsMock,
	useBoardFocusHandler: useBoardFocusHandlerMock,
}));

vi.mock("@data-poll", () => ({
	usePollsStore: usePollsStoreMock,
	usePollSocketApi: usePollSocketApiMock,
}));

describe("PollContentElement", () => {
	const setupWrapper = (
		options: {
			isEditMode?: boolean;
			canEdit?: boolean;
			element?: PollElement;
			pollState?: object;
			// override for the exact scenario allowedOperations.updateElement can lie about (a
			// reader on a readersCanEdit board) - see the isBoardEditor regression test below
			allowedOperations?: Record<string, boolean>;
		} = {}
	) => {
		useBoardAllowedOperationsMock.mockReturnValue({
			allowedOperations: computed(() => options.allowedOperations ?? { isBoardEditor: options.canEdit ?? false }),
		});

		usePollsStoreMock.mockReturnValue({
			// mirrors the default audience (STUDENTS): an editor is not an eligible voter
			// unless a test explicitly overrides pollState to say otherwise
			getState: () => options.pollState ?? { totalVotes: 0, participantCount: 0, canVote: !options.canEdit },
			fetchPollResults: fetchPollResultsMock,
		});
		usePollSocketApiMock.mockReturnValue({ castVoteViaSocket: vi.fn() });

		const element = options.element ?? pollElementResponseFactory.build();

		const wrapper = mount(PollContentElement, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					PollElementEdit: true,
					PollStatusBar: true,
					PollResults: true,
					PollVoteForm: true,
					PollAnalysisDialog: true,
				},
			},
			props: {
				element,
				isEditMode: options.isEditMode ?? false,
				columnIndex: 0,
				rowIndex: 0,
				elementIndex: 0,
			},
		});

		return { wrapper };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows the configuration form when the card is in edit mode", () => {
		const { wrapper } = setupWrapper({ isEditMode: true, canEdit: true });

		expect(wrapper.findComponent({ name: "PollElementEdit" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(false);
	});

	it("shows the results view for an editor outside edit mode", () => {
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: true });

		expect(wrapper.findComponent({ name: "PollResults" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollElementEdit" }).exists()).toBe(false);
	});

	// Regression test: on a board with readersCanEdit, allowedOperations.updateElement is true
	// for a plain reader too (that's the whole point of the setting) - but the poll's manage/
	// teacher view must not follow updateElement, only isBoardEditor (see the doc comment on
	// canManagePoll). A reader must see the vote form, not the results/management view.
	it("does not treat updateElement:true as canManagePoll - only isBoardEditor decides", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({
			isEditMode: false,
			element,
			allowedOperations: { updateElement: true, isBoardEditor: false },
			pollState: { totalVotes: 0, participantCount: 1, canVote: true },
		});

		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollResults" }).exists()).toBe(false);
	});

	it("shows the vote form for a non-editor when the poll is open and not yet voted", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: false, element });

		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(true);
	});

	it("hides the vote form for a non-editor once closesAt has passed, even though pollStatus is still OPEN", () => {
		const element = pollElementResponseFactory.build({
			content: { pollStatus: PollStatus.OPEN, closesAt: "2020-01-01T00:00:00.000Z" },
		});
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: false, element });

		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(false);
	});

	it("shows results (not the vote form) for a closed poll, even for a non-editor", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.CLOSED } });
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: false, element });

		expect(wrapper.findComponent({ name: "PollResults" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(false);
	});

	it("fetches poll results on mount outside edit mode", () => {
		setupWrapper({ isEditMode: false, canEdit: false });

		expect(fetchPollResultsMock).toHaveBeenCalled();
	});

	it("registers the poll socket listener regardless of edit mode or role, so results keep updating live", () => {
		setupWrapper({ isEditMode: false, canEdit: true });

		// A manager outside the audience never mounts PollVoteForm (they always see results,
		// never the vote form), and a voter stops mounting it the moment they vote - this
		// component is the only thing that stays mounted for the poll's whole lifetime on the
		// board, so it must be the one to listen.
		expect(usePollSocketApiMock).toHaveBeenCalled();
	});

	it("shows the vote form for an editor who is also an eligible voter (audience TEACHERS/ALL)", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({
			isEditMode: false,
			canEdit: true,
			element,
			pollState: { totalVotes: 0, participantCount: 0, canVote: true },
		});

		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollResults" }).exists()).toBe(false);
	});

	it("shows results for an editor who is also an eligible voter once they've voted", () => {
		const element = pollElementResponseFactory.build({
			content: { pollStatus: PollStatus.OPEN, showResultsLive: true },
		});
		const { wrapper } = setupWrapper({
			isEditMode: false,
			canEdit: true,
			element,
			pollState: {
				totalVotes: 1,
				participantCount: 1,
				canVote: true,
				myVote: [{ questionId: "q1", selectedOptionIds: ["o1"] }],
			},
		});

		expect(wrapper.findComponent({ name: "PollResults" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "PollVoteForm" }).exists()).toBe(false);
	});

	it("shows the poll title", () => {
		const element = pollElementResponseFactory.build({ content: { title: "Feedback" } });
		const { wrapper } = setupWrapper({ element, canEdit: true });

		expect(wrapper.text()).toContain("Feedback");
	});

	it("passes canOpenAnalysis=true to the status bar and dialog for an editor, regardless of poll status", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, canEdit: true });

		expect(wrapper.findComponent({ name: "PollStatusBar" }).props("canOpenAnalysis")).toBe(true);
		expect(wrapper.findComponent({ name: "PollAnalysisDialog" }).exists()).toBe(true);
	});

	it("passes canOpenAnalysis=false to the status bar for a non-editor while the poll is open", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.findComponent({ name: "PollStatusBar" }).props("canOpenAnalysis")).toBe(false);
		expect(wrapper.findComponent({ name: "PollAnalysisDialog" }).exists()).toBe(false);
	});

	it("passes canOpenAnalysis=true to the status bar for a non-editor once the poll is closed", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.CLOSED } });
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.findComponent({ name: "PollStatusBar" }).props("canOpenAnalysis")).toBe(true);
		expect(wrapper.findComponent({ name: "PollAnalysisDialog" }).exists()).toBe(true);
	});
});
