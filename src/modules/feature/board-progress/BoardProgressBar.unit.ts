import BoardProgressBar from "./BoardProgressBar.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useBoardProgressApi } from "@data-board-progress";
import { useEnvConfig } from "@data-env";
import { mount } from "@vue/test-utils";
import { vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@data-board-progress", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-progress")>()),
	useBoardProgressApi: vi.fn(),
}));
vi.mock("@data-env", () => ({ useEnvConfig: vi.fn() }));

const router = createRouter({ history: createWebHistory(), routes: [{ path: "/:pathMatch(.*)*", component: {} }] });

describe("BoardProgressBar", () => {
	const getBoardProgress = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useBoardProgressApi).mockReturnValue({ getBoardProgress, getRoomProgress: vi.fn() });
	});

	const setup = (roomId?: string) =>
		mount(BoardProgressBar, {
			props: { boardId: "board-1", roomId },
			global: { plugins: [router, createTestingI18n(), createTestingVuetify()] },
		});

	it("renders nothing when the feature flag is off", async () => {
		vi.mocked(useEnvConfig).mockReturnValue({ value: { FEATURE_BOARD_PROGRESS_ENABLED: false } } as never);

		const wrapper = setup("room-1");

		expect(wrapper.find('[data-testid="board-progress-link"]').exists()).toBe(false);
		expect(getBoardProgress).not.toHaveBeenCalled();
	});

	it("renders nothing without a room id", async () => {
		vi.mocked(useEnvConfig).mockReturnValue({ value: { FEATURE_BOARD_PROGRESS_ENABLED: true } } as never);

		const wrapper = setup(undefined);
		await vi.waitFor(() => expect(wrapper.vm).toBeTruthy());

		expect(wrapper.find('[data-testid="board-progress-link"]').exists()).toBe(false);
		expect(getBoardProgress).not.toHaveBeenCalled();
	});

	it("renders a link to the room progress page once loaded", async () => {
		vi.mocked(useEnvConfig).mockReturnValue({ value: { FEATURE_BOARD_PROGRESS_ENABLED: true } } as never);
		getBoardProgress.mockResolvedValue({
			boardId: "board-1",
			boardTitle: "Board 1",
			isTeacherView: false,
			summary: { done: 2, total: 5 },
			items: [],
		});

		const wrapper = setup("room-1");
		await vi.waitFor(() => expect(wrapper.find('[data-testid="board-progress-link"]').exists()).toBe(true));

		expect(getBoardProgress).toHaveBeenCalledWith("board-1");
		expect(wrapper.get('[data-testid="board-progress-link"]').attributes("href")).toBe("/rooms/room-1/progress");
	});

	it("renders nothing when there is nothing to do yet", async () => {
		vi.mocked(useEnvConfig).mockReturnValue({ value: { FEATURE_BOARD_PROGRESS_ENABLED: true } } as never);
		getBoardProgress.mockResolvedValue({
			boardId: "board-1",
			boardTitle: "Board 1",
			isTeacherView: false,
			summary: { done: 0, total: 0 },
			items: [],
		});

		const wrapper = setup("room-1");
		await vi.waitFor(() => expect(getBoardProgress).toHaveBeenCalled());

		expect(wrapper.find('[data-testid="board-progress-link"]').exists()).toBe(false);
	});
});
