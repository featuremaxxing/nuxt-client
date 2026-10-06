import LearningPathBoardPicker from "./LearningPathBoardPicker.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

const fetchPickableCards = vi.fn();
vi.mock("@data-board-learning-path", () => ({
	fetchPickableCards: (...args: unknown[]) => fetchPickableCards(...args),
}));

describe("LearningPathBoardPicker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchPickableCards.mockResolvedValue([
			{
				id: "col-1",
				title: "Modul 2",
				cards: [
					{ id: "card-k", title: "Was ist KI?" },
					{ id: "card-l", title: "" },
				],
			},
			{ id: "col-2", title: "Leer", cards: [] },
		]);
	});

	const setup = () =>
		mount(LearningPathBoardPicker, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: {
				boards: [{ id: "board-a", title: "A", isVisible: true }],
				roomBoards: [
					{ id: "board-a", title: "A", isVisible: true },
					{ id: "board-b", title: "B", isVisible: true },
				],
				cardIdsInPath: new Set(["card-l"]),
			},
		});

	it("should still offer whole boards", async () => {
		const wrapper = setup();

		await wrapper.get("[data-testid=learning-path-picker-add-board-a]").trigger("click");

		expect(wrapper.emitted("add")).toEqual([["board-a"]]);
	});

	it("should load the cards of a board when it is opened and add a single card", async () => {
		const wrapper = setup();

		await wrapper.get("[data-testid=learning-path-picker-expand-board-b]").trigger("click");
		await flushPromises();

		expect(fetchPickableCards).toHaveBeenCalledWith("board-b");
		expect(wrapper.get("[data-testid=learning-path-picker-card-card-k]").text()).toContain("Was ist KI?");
		expect(wrapper.text()).not.toContain("Leer");
		await wrapper.get("[data-testid=learning-path-picker-add-card-card-k]").trigger("click");
		expect(wrapper.emitted("add-card")).toEqual([["board-b", "card-k"]]);
	});

	it("should not offer a card that is already a step", async () => {
		const wrapper = setup();

		await wrapper.get("[data-testid=learning-path-picker-expand-board-b]").trigger("click");
		await flushPromises();

		expect(wrapper.get("[data-testid=learning-path-picker-card-card-l]").text()).toContain(
			"pages.learningPath.cards.untitled"
		);
		expect(wrapper.find("[data-testid=learning-path-picker-add-card-card-l]").exists()).toBe(false);
	});

	it("should close an open board again", async () => {
		const wrapper = setup();
		const toggle = wrapper.get("[data-testid=learning-path-picker-expand-board-b]");

		await toggle.trigger("click");
		await flushPromises();
		await toggle.trigger("click");

		expect(wrapper.find("[data-testid=learning-path-picker-card-card-k]").exists()).toBe(false);
	});
});
