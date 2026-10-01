import LearningPathBoard from "./LearningPathBoard.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout, type BoardResponse, LearningPathColor } from "@api-server";
import { type LearningPath, type LearningPathStep } from "@data-board-learning-path";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const fetchLearningPath = vi.fn();
vi.mock("@/utils/api", () => ({
	$axios: { get: () => fetchLearningPath().then((data: unknown) => ({ data })) },
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

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

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
});
