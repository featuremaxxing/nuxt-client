import LearningPathBoard from "./LearningPathBoard.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout, type BoardResponse, LearningPathColor } from "@api-server";
import { type LearningPath, type LearningPathStep } from "@data-board-learning-path";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { reactive, ref } from "vue";

const fetchLearningPath = vi.fn();
const post = vi.fn();
vi.mock("@/utils/api", () => ({
	$axios: {
		get: () => fetchLearningPath().then((data: unknown) => ({ data })),
		post: (...args: unknown[]) => post(...args),
	},
	mapAxiosErrorToResponseError: vi.fn(),
}));
vi.mock("@data-board-learning-path", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-learning-path")>()),
	useLearningPathSocket: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useBoardApi: () => ({ updateBoardTitleCall: vi.fn(), updateBoardVisibilityCall: vi.fn(), deleteBoardCall: vi.fn() }),
	useSharedBoardPageInformation: () => ({ createPageInformation: vi.fn(), breadcrumbs: ref([]) }),
}));

const push = vi.fn();
const replace = vi.fn();
const route = reactive<{ query: Record<string, string> }>({ query: {} });
vi.mock("vue-router", () => ({ useRouter: () => ({ push, replace }), useRoute: () => route }));

const step = (id: string, overrides: Partial<LearningPathStep> = {}): LearningPathStep => ({
	id,
	linkedBoardId: `board-${id}`,
	title: `Bereich ${id}`,
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds: [],
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
	...overrides,
});

const board: BoardResponse = {
	id: "path",
	title: "Lernweg Optik",
	layout: BoardLayout.LEARNING_PATH,
	isVisible: true,
	readersCanEdit: false,
	columns: [],
	timestamps: { lastUpdatedAt: "", createdAt: "" },
	allowedOperations: {},
} as unknown as BoardResponse;

describe("LearningPathBoard", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	const setup = async (path: Partial<LearningPath>) => {
		fetchLearningPath.mockResolvedValue({ boardId: "path", isEditor: false, steps: [], availableBoards: [], ...path });
		const wrapper = shallowMount(LearningPathBoard, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					DefaultWireframe: { template: "<div><slot name='header' /><slot /></div>" },
					LearningPathCanvas: {
						name: "LearningPathCanvas",
						props: ["steps", "isEditor", "selectedStepId", "hints", "color"],
						template: "<div />",
						methods: { fitView: vi.fn(), freePosition: () => ({ x: 0, y: 0 }) },
					},
				},
			},
			props: { boardId: "path", board },
		});
		await flushPromises();
		return wrapper;
	};

	it("should show the board list and the canvas to editors", async () => {
		const wrapper = await setup({ isEditor: true, steps: [step("a")] });

		expect(wrapper.findComponent({ name: "LearningPathBoardPicker" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "LearningPathCanvas" }).props("isEditor")).toBe(true);
	});

	it("should tell students what to complete before a locked step opens", async () => {
		const wrapper = await setup({
			steps: [
				step("a", { status: "done" }),
				step("b"),
				step("c", { status: "locked", prerequisiteStepIds: ["a", "b"], lockUntilPrerequisitesDone: true }),
			],
		});

		expect(wrapper.findComponent({ name: "LearningPathBoardPicker" }).exists()).toBe(false);
		const hints = wrapper.findComponent({ name: "LearningPathCanvas" }).props("hints") as Record<string, string>;
		expect(hints).toEqual({ c: "pages.learningPath.lockedHint.all" });
		expect(wrapper.findComponent({ name: "LearningPathList" }).exists()).toBe(true);
	});

	it("should show an empty state", async () => {
		const wrapper = await setup({ isEditor: true });

		expect(wrapper.find("[data-testid=learning-path-empty]").text()).toBe("pages.learningPath.empty.editor");
	});

	it("should show the settings of the selected step to editors", async () => {
		const wrapper = await setup({ isEditor: true, steps: [step("a")] });

		await wrapper.findComponent({ name: "LearningPathCanvas" }).vm.$emit("select", "a");

		expect(wrapper.findComponent({ name: "LearningPathStepPanel" }).props("step")).toMatchObject({ id: "a" });
	});

	describe("enrollment", () => {
		it("should offer a student to go the learning path when there is a choice", async () => {
			const wrapper = await setup({ canChoose: true, isEnrolled: false });

			expect(wrapper.find("[data-testid=learning-path-enroll]").exists()).toBe(true);
			expect(wrapper.find("[data-testid=learning-path-leave]").exists()).toBe(false);
		});

		it("should let an enrolled student leave", async () => {
			const wrapper = await setup({ canChoose: true, isEnrolled: true });

			expect(wrapper.find("[data-testid=learning-path-leave]").exists()).toBe(true);
		});

		it("should say nothing about enrolling when there is nothing to choose", async () => {
			const wrapper = await setup({ canChoose: false, isEnrolled: true });

			expect(wrapper.find("[data-testid=learning-path-enrollment]").exists()).toBe(false);
		});

		it("should not show editors the enrollment, but how many go the learning path", async () => {
			const wrapper = await setup({ isEditor: true, studentCount: 5, completedStudentCount: 2 });

			expect(wrapper.find("[data-testid=learning-path-enrollment]").exists()).toBe(false);
			expect(wrapper.find("[data-testid=learning-path-participants]").exists()).toBe(true);
		});
	});

	describe("hints of locked steps", () => {
		it("should ask to choose a learning path first", async () => {
			const wrapper = await setup({
				steps: [
					step("c", {
						status: "locked",
						lock: { pathId: "path", pathTitle: "Lernweg Optik", reason: "chooseLearningPath" },
					}),
				],
			});

			const hints = wrapper.findComponent({ name: "LearningPathCanvas" }).props("hints") as Record<string, string>;
			expect(hints).toEqual({ c: "pages.learningPath.lockedHint.chooseLearningPath" });
		});

		it("should name the other learning path that keeps a step closed", async () => {
			const wrapper = await setup({
				steps: [
					step("c", {
						status: "locked",
						lock: { pathId: "other", pathTitle: "Grün", reason: "prerequisites" },
					}),
				],
			});

			const hints = wrapper.findComponent({ name: "LearningPathCanvas" }).props("hints") as Record<string, string>;
			expect(hints).toEqual({ c: "pages.room.boardCard.locked" });
		});
	});

	it("should give the canvas the color of the learning path", async () => {
		const wrapper = await setup({ color: LearningPathColor.Red });

		expect(wrapper.findComponent({ name: "LearningPathCanvas" }).props("color")).toBe("#c62828");
	});

	it("should mark boards for rework in the list", async () => {
		const wrapper = await setup({ steps: [step("a", { reopened: true }), step("b")] });

		const list = wrapper.findComponent({ name: "LearningPathList" });
		expect((list.props("steps") as LearningPathStep[]).map((entry) => entry.reopened)).toEqual([true, undefined]);
	});

	describe("card steps", () => {
		it("should open a card step as part of the learning path", async () => {
			const wrapper = await setup({ steps: [step("k", { linkedCardId: "card-k" })] });

			wrapper.findComponent({ name: "LearningPathCanvas" }).vm.$emit("open", step("k", { linkedCardId: "card-k" }));

			expect(push).toHaveBeenCalledWith({
				name: "boards-card-detail",
				params: { boardId: "board-k", cardId: "card-k" },
				query: { learningPath: "path" },
			});
		});

		it("should add a card picked from the list or dropped on the canvas", async () => {
			post.mockResolvedValue({ data: {} });
			const wrapper = await setup({ isEditor: true });

			wrapper.findComponent({ name: "LearningPathBoardPicker" }).vm.$emit("add-card", "board-b", "card-k");
			await flushPromises();
			wrapper.findComponent({ name: "LearningPathCanvas" }).vm.$emit("drop-card", "board-b", "card-l", 40, 60);
			await flushPromises();

			expect(post).toHaveBeenCalledWith("/v3/learning-path-steps", {
				boardId: "path",
				linkedBoardId: "board-b",
				linkedCardId: "card-k",
				positionX: 0,
				positionY: 0,
			});
			expect(post).toHaveBeenCalledWith("/v3/learning-path-steps", {
				boardId: "path",
				linkedBoardId: "board-b",
				linkedCardId: "card-l",
				positionX: 40,
				positionY: 60,
			});
		});
	});

	describe("pasted links", () => {
		beforeEach(() => {
			post.mockClear();
			post.mockResolvedValue({ data: {} });
		});

		it("should add every linked card and board, but not a card that is already a step", async () => {
			const wrapper = await setup({
				isEditor: true,
				steps: [step("k", { linkedBoardId: "board-b", linkedCardId: "card-k" })],
			});

			wrapper
				.findComponent({ name: "LearningPathBoardPicker" })
				.vm.$emit("add-links", [
					{ boardId: "board-b", cardId: "card-k" },
					{ boardId: "board-b", cardId: "card-l" },
					{ boardId: "board-c" },
				]);
			await flushPromises();

			expect(post).toHaveBeenCalledTimes(2);
			expect(post).toHaveBeenNthCalledWith(
				1,
				"/v3/learning-path-steps",
				expect.objectContaining({ linkedCardId: "card-l" })
			);
			expect(post).toHaveBeenNthCalledWith(
				2,
				"/v3/learning-path-steps",
				expect.not.objectContaining({ linkedCardId: expect.anything() })
			);
		});
	});

	describe("text tiles", () => {
		beforeEach(() => {
			push.mockClear();
			post.mockClear();
		});

		const text = step("t", { linkedBoardId: "", isText: true, title: "Teil 2", text: "Lest die Karten." });

		// a card step, then the text tile, then a locked card step
		const chain = [
			step("k", { linkedBoardId: "board-b", linkedCardId: "card-k", status: "done", positionY: 0 }),
			{ ...text, positionY: 100, prerequisiteStepIds: ["k"] },
			step("l", { linkedBoardId: "board-b", linkedCardId: "card-l", status: "locked", positionY: 200 }),
		];

		it("should open a text tile as a step of the learning path, numbered with the others", async () => {
			const wrapper = await setup({ steps: chain });

			wrapper.findComponent({ name: "LearningPathCanvas" }).vm.$emit("open", chain[1]);
			await flushPromises();

			expect(push).not.toHaveBeenCalled();
			expect(wrapper.findComponent({ name: "VDialog" }).props("modelValue")).toBe(true);
			expect(wrapper.findComponent({ name: "VDialog" }).text()).toContain("Lest die Karten.");
		});

		it("should open the text tile a link from a card's full view leads to, and page back to the card", async () => {
			route.query = { step: "t" };
			const wrapper = await setup({ steps: chain });

			const dialog = wrapper.findComponent({ name: "VDialog" });
			expect(dialog.props("modelValue")).toBe(true);
			expect(dialog.find("[data-testid='learning-path-text-next']").attributes("disabled")).toBeDefined();
			await dialog.get("[data-testid='learning-path-text-previous']").trigger("click");

			expect(push).toHaveBeenCalledWith({
				name: "boards-card-detail",
				params: { boardId: "board-b", cardId: "card-k" },
				query: { learningPath: "path" },
			});
			route.query = {};
		});

		it("should page with the arrow keys like the buttons", async () => {
			const unlocked = chain.map((entry) => (entry.id === "l" ? { ...entry, status: "open" as const } : entry));
			route.query = { step: "t" };
			const wrapper = await setup({ steps: unlocked });
			const card = wrapper.findComponent({ name: "VDialog" }).findComponent({ name: "VCard" });

			await card.trigger("keydown", { key: "ArrowRight", shiftKey: true });
			expect(push).not.toHaveBeenCalled();
			await card.trigger("keydown", { key: "ArrowRight" });

			expect(push).toHaveBeenCalledWith({
				name: "boards-card-detail",
				params: { boardId: "board-b", cardId: "card-l" },
				query: { learningPath: "path" },
			});
			route.query = {};
		});

		it("should not open a locked text tile from a link", async () => {
			route.query = { step: "t" };
			const wrapper = await setup({ steps: [{ ...text, status: "locked", title: "", text: undefined }] });

			expect(wrapper.findComponent({ name: "VDialog" }).props("modelValue")).toBe(false);
			route.query = {};
		});

		it("should add a text tile for editors", async () => {
			post.mockResolvedValue({ data: {} });
			const wrapper = await setup({ isEditor: true });

			wrapper.findComponent({ name: "LearningPathBoardPicker" }).vm.$emit("add-text");
			await flushPromises();

			expect(post).toHaveBeenCalledWith("/v3/learning-path-steps", {
				boardId: "path",
				title: "pages.learningPath.text.label",
				text: "",
				positionX: 0,
				positionY: 0,
			});
		});
	});
});
