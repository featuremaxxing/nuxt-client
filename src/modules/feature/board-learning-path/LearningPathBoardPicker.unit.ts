import LearningPathBoardPicker from "./LearningPathBoardPicker.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

const fetchPickableCards = vi.fn();
vi.mock("@data-board-learning-path", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-learning-path")>()),
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

	it("should name an untitled column by its number", async () => {
		fetchPickableCards.mockResolvedValue([
			{ id: "col-1", title: "", cards: [] },
			{ id: "col-2", title: "", cards: [{ id: "card-k", title: "K" }] },
		]);
		const wrapper = setup();

		await wrapper.get("[data-testid=learning-path-picker-expand-board-b]").trigger("click");
		await flushPromises();

		expect(wrapper.get("[data-testid=learning-path-picker-column-col-2]").text()).toBe(
			"pages.learningPath.cards.column"
		);
	});

	it("should list every board once and mark the ones that are already in the learning path", () => {
		const wrapper = setup();

		expect(wrapper.findAll("[data-testid^=learning-path-picker-board-board]")).toHaveLength(2);
		expect(wrapper.find("[data-testid=learning-path-picker-add-board-a]").exists()).toBe(true);
		expect(wrapper.find("[data-testid=learning-path-picker-add-board-b]").exists()).toBe(false);
		expect(wrapper.find("[data-testid=learning-path-picker-board-added-board-b]").exists()).toBe(true);
	});

	describe("searching", () => {
		const typeSearch = async (wrapper: ReturnType<typeof setup>, text: string) => {
			await wrapper.get("[data-testid=learning-path-picker-search] input").setValue(text);
			vi.advanceTimersByTime(300);
			await flushPromises();
		};

		it("should look into the cards of every board and open the boards with matching cards", async () => {
			const wrapper = setup();

			await typeSearch(wrapper, "was ist");

			expect(fetchPickableCards).toHaveBeenCalledWith("board-a");
			expect(fetchPickableCards).toHaveBeenCalledWith("board-b");
			expect(wrapper.find("[data-testid=learning-path-picker-card-card-k]").exists()).toBe(true);
			// the untitled card does not match
			expect(wrapper.find("[data-testid=learning-path-picker-card-card-l]").exists()).toBe(false);
		});

		it("should say so when nothing matches", async () => {
			const wrapper = setup();

			await typeSearch(wrapper, "gibt es nicht");

			expect(wrapper.get("[data-testid=learning-path-picker-empty]").text()).toBe("pages.learningPath.picker.noMatch");
		});
	});

	describe("pasting links", () => {
		const board = "6ac4c0a0a8195598eb6d5f44";
		const card = "6ac4c0b3a8195598eb6d5f78";

		it("should add the cards and boards of the pasted links", async () => {
			const wrapper = setup();

			await wrapper
				.get("[data-testid=learning-path-picker-links] textarea")
				.setValue(`https://x/boards/${board}#card-${card}\nhttps://x/boards/${board}`);
			await wrapper.get("[data-testid=learning-path-picker-links-add]").trigger("click");

			expect(wrapper.emitted("add-links")).toEqual([[[{ boardId: board, cardId: card }, { boardId: board }]]]);
			expect(
				(wrapper.get("[data-testid=learning-path-picker-links] textarea").element as HTMLTextAreaElement).value
			).toBe("");
		});

		it("should say so when there is no link in it", async () => {
			const wrapper = setup();

			await wrapper.get("[data-testid=learning-path-picker-links] textarea").setValue("Modul 2");
			await wrapper.get("[data-testid=learning-path-picker-links-add]").trigger("click");

			expect(wrapper.emitted("add-links")).toBeUndefined();
			expect(wrapper.text()).toContain("pages.learningPath.links.none");
		});
	});
});
