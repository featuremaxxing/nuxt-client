import BoardCompletionButton from "./BoardCompletionButton.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

const fetchCompletion = vi.fn();
const setCompletion = vi.fn();
const fetchCardCompletion = vi.fn();
const setCardCompletion = vi.fn();
vi.mock("@data-board-learning-path", () => ({
	useLearningPathApi: () => ({ fetchCompletion, setCompletion, fetchCardCompletion, setCardCompletion }),
}));

describe("BoardCompletionButton", () => {
	enableAutoUnmount(afterEach);

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
	});

	const setup = async (options: { enabled?: boolean; roomId?: string; cardId?: string } = {}) => {
		createTestEnvStore({ FEATURE_BOARD_LEARNING_PATH_ENABLED: options.enabled ?? true });
		const wrapper = mount(BoardCompletionButton, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { boardId: "board", roomId: "roomId" in options ? options.roomId : "room", cardId: options.cardId },
		});
		await flushPromises();
		return wrapper;
	};

	it("should let a student mark a board without progress items as done", async () => {
		fetchCompletion.mockResolvedValue({ inLearningPath: true, canMarkManually: true, completed: false });
		setCompletion.mockResolvedValue({ inLearningPath: true, canMarkManually: true, completed: true });
		const wrapper = await setup();

		const button = wrapper.get("[data-testid=board-completion-button]");
		expect(button.text()).toBe("components.board.completion.markDone");
		await button.trigger("click");
		await flushPromises();

		expect(setCompletion).toHaveBeenCalledWith("board", true);
		expect(wrapper.get("[data-testid=board-completion-button]").text()).toBe("components.board.completion.done");
	});

	it("should stay hidden when the board tracks progress itself", async () => {
		fetchCompletion.mockResolvedValue({ inLearningPath: true, canMarkManually: false, completed: false });
		const wrapper = await setup();

		expect(wrapper.find("[data-testid=board-completion-button]").exists()).toBe(false);
	});

	it("should not ask the server without the feature", async () => {
		await setup({ enabled: false });

		expect(fetchCompletion).not.toHaveBeenCalled();
	});

	it("should not ask the server outside of rooms", async () => {
		await setup({ roomId: undefined });

		expect(fetchCompletion).not.toHaveBeenCalled();
	});

	it("should mark a card that is a step of a learning path as done and tell about it", async () => {
		fetchCardCompletion.mockResolvedValue({ inLearningPath: true, canMarkManually: true, completed: false });
		setCardCompletion.mockResolvedValue({ inLearningPath: true, canMarkManually: true, completed: true });
		const wrapper = await setup({ cardId: "card" });

		await wrapper.get("[data-testid=board-completion-button]").trigger("click");
		await flushPromises();

		expect(fetchCompletion).not.toHaveBeenCalled();
		expect(setCardCompletion).toHaveBeenCalledWith("card", true);
		expect(wrapper.emitted("change")).toEqual([[true]]);
	});
});
