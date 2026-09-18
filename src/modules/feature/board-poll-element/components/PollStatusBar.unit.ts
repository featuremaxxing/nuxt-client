import PollStatusBar from "./PollStatusBar.vue";
import { PollElement } from "@/types/board/ContentElement";
import { PollStatus } from "@api-server";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const { updateElementRequestMock } = vi.hoisted(() => ({ updateElementRequestMock: vi.fn() }));

vi.mock("@data-board", () => ({
	useCardStore: () => ({ updateElementRequest: updateElementRequestMock }),
}));

describe("PollStatusBar", () => {
	const setupWrapper = (options: { element?: PollElement; isEditor?: boolean } = {}) => {
		const element = options.element ?? pollElementResponseFactory.build();

		const wrapper = mount(PollStatusBar, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				element,
				isEditor: options.isEditor ?? false,
				totalVotes: 3,
				participantCount: 5,
				results: [],
			},
		});

		return { wrapper, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows the poll status", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element });

		expect(wrapper.find("[data-testid='poll-status-chip']").text()).toContain("open");
	});

	it("shows the participant count", () => {
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='poll-participant-count']").exists()).toBe(true);
	});

	it("does not show editor controls for a non-editor", () => {
		const { wrapper } = setupWrapper({ isEditor: false });

		expect(wrapper.find("[data-testid='poll-export-menu']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='poll-status-bar-open']").exists()).toBe(false);
	});

	it("shows the export menu and open/close controls for an editor", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, isEditor: true });

		expect(wrapper.find("[data-testid='poll-export-menu']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='poll-status-bar-close']").exists()).toBe(true);
	});

	it("sends an update-element request to close the poll", async () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, isEditor: true });

		await wrapper.find("[data-testid='poll-status-bar-close']").trigger("click");

		expect(updateElementRequestMock).toHaveBeenCalledWith({
			element: expect.objectContaining({
				content: expect.objectContaining({ pollStatus: "closed" }),
			}),
		});
	});
});
