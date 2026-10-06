import RoomLearningPathsPage from "./RoomLearningPaths.page.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor } from "@api-server";
import {
	type LearningPathOverview,
	type LearningPathOverviewProgress,
	useLearningPathApi,
} from "@data-board-learning-path";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { VSelect } from "vuetify/components";

const askConfirmation = vi.fn();
vi.mock("@/utils/confirmation-dialog.utils", () => ({
	askConfirmation: (...args: unknown[]) => askConfirmation(...args),
}));

vi.mock("@data-board-learning-path", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-learning-path")>()),
	useLearningPathApi: vi.fn(),
}));

const blue = { id: "blue", title: "Blau", color: LearningPathColor.Blue, total: 4 };
const green = { id: "green", title: "Grün", color: LearningPathColor.Green, total: 3 };

const progress = (pathId: string, props: Partial<LearningPathOverviewProgress> = {}): LearningPathOverviewProgress => ({
	pathId,
	isEnrolled: false,
	completed: false,
	done: 0,
	total: pathId === "blue" ? 4 : 3,
	rework: 0,
	...props,
});

// anna goes blue; bob goes nothing; carla completed green and does not go it any more
const overview = (paths = [blue, green]): LearningPathOverview => ({
	paths,
	students: [
		{
			userId: "anna",
			firstName: "Anna",
			lastName: "Adler",
			paths: [
				progress("blue", { isEnrolled: true, done: 2, rework: 1, nextBoardTitle: "Addieren" }),
				progress("green"),
			],
		},
		{ userId: "bob", firstName: "Bob", lastName: "Berg", paths: [progress("blue"), progress("green")] },
		{
			userId: "carla",
			firstName: "Carla",
			lastName: "Cohn",
			paths: [progress("blue"), progress("green", { completed: true, done: 3 })],
		},
	],
});

describe("RoomLearningPathsPage", () => {
	const fetchOverview = vi.fn();
	const enroll = vi.fn();
	const unenroll = vi.fn();
	const resetProgress = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useLearningPathApi).mockReturnValue({
			fetchOverview,
			enroll,
			unenroll,
			resetProgress,
		} as unknown as ReturnType<typeof useLearningPathApi>);
		enroll.mockResolvedValue(undefined);
		unenroll.mockResolvedValue(undefined);
		resetProgress.mockResolvedValue(undefined);
		askConfirmation.mockResolvedValue(true);
	});

	const setup = async (data: LearningPathOverview | Error) => {
		if (data instanceof Error) fetchOverview.mockRejectedValue(data);
		else fetchOverview.mockResolvedValue(data);

		const router = createRouter({
			history: createWebHistory(),
			routes: [
				{ path: "/rooms/:id/learning-paths", component: RoomLearningPathsPage },
				{ path: "/:p(.*)*", component: {} },
			],
		});
		await router.push("/rooms/room-1/learning-paths");

		const wrapper = mount(RoomLearningPathsPage, {
			global: {
				plugins: [
					router,
					createTestingPinia({ initialState: { roomDetailsStore: { room: { id: "room-1", name: "Raum" } } } }),
					createTestingI18n(),
					createTestingVuetify(),
				],
				stubs: { DefaultWireframe: { template: "<div><slot name='header' /><slot /></div>" } },
			},
		});
		await flushPromises();
		return wrapper;
	};

	it("should load the overview of the room", async () => {
		await setup(overview());

		expect(fetchOverview).toHaveBeenCalledWith("room-1");
	});

	it("should show who goes which learning path with the progress", async () => {
		const wrapper = await setup(overview());

		expect(wrapper.find("[data-testid='learning-path-progress-anna-blue']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='learning-path-progress-anna-green']").exists()).toBe(false);
		expect(wrapper.text()).toContain("pages.room.learningPaths.next");
		expect(wrapper.find("[data-testid='learning-path-student-none-bob']").exists()).toBe(true);
	});

	it("should assign a student to a learning path", async () => {
		const wrapper = await setup(overview());

		await wrapper.get("[data-testid='learning-path-assign-bob-green']").trigger("click");
		await flushPromises();

		expect(enroll).toHaveBeenCalledWith("green", "bob");
		expect(fetchOverview).toHaveBeenCalledTimes(2);
	});

	it("should remove a student from a learning path", async () => {
		const wrapper = await setup(overview());

		await wrapper.get("[data-testid='learning-path-remove-anna-blue']").trigger("click");
		await flushPromises();

		expect(unenroll).toHaveBeenCalledWith("blue", "anna");
	});

	it("should not offer to assign anybody when there is a single learning path", async () => {
		const wrapper = await setup(overview([blue]));

		expect(wrapper.find("[data-testid^='learning-path-assign-']").exists()).toBe(false);
		expect(wrapper.find("[data-testid^='learning-path-remove-']").exists()).toBe(false);
	});

	it("should filter the students without a learning path", async () => {
		const wrapper = await setup(overview());

		await wrapper.getComponent(VSelect).vm.$emit("update:modelValue", "none");
		await flushPromises();

		expect(wrapper.find("[data-testid='learning-path-student-anna']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='learning-path-student-bob']").exists()).toBe(true);
	});

	it("should show an empty state for a room without learning paths", async () => {
		const wrapper = await setup(new Error("404"));

		expect(wrapper.find("[data-testid='room-learning-paths-empty']").exists()).toBe(true);
	});

	it("should show how many boards a student has to rework", async () => {
		const wrapper = await setup(overview());

		expect(wrapper.get("[data-testid='learning-path-rework-anna-blue']").text()).toContain(
			"pages.room.learningPaths.rework"
		);
	});

	describe("a completed learning path", () => {
		it("should stay visible with a check, even when the student does not go it any more", async () => {
			const wrapper = await setup(overview());

			expect(wrapper.find("[data-testid='learning-path-completed-carla-green']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='learning-path-assign-carla-green']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='learning-path-student-none-carla']").exists()).toBe(true);
		});

		it("should let the teacher have the student go it once more", async () => {
			const wrapper = await setup(overview());

			await wrapper.get("[data-testid='learning-path-redo-carla-green']").trigger("click");
			await flushPromises();

			expect(askConfirmation).toHaveBeenCalledWith(expect.objectContaining({ messageType: "warning" }));
			expect(enroll).toHaveBeenCalledWith("green", "carla");
			expect(resetProgress).toHaveBeenCalledWith("room-1", ["carla"], "green");
			expect(fetchOverview).toHaveBeenCalledTimes(2);
		});

		it("should leave it completed when the question is declined", async () => {
			askConfirmation.mockResolvedValue(false);
			const wrapper = await setup(overview());

			await wrapper.get("[data-testid='learning-path-redo-carla-green']").trigger("click");
			await flushPromises();

			expect(enroll).not.toHaveBeenCalled();
			expect(resetProgress).not.toHaveBeenCalled();
		});
	});

	describe("resetting the progress", () => {
		it("should ask first and reset a single student", async () => {
			const wrapper = await setup(overview());

			await wrapper.get("[data-testid='learning-path-reset-anna']").trigger("click");
			await flushPromises();

			expect(askConfirmation).toHaveBeenCalledWith(expect.objectContaining({ messageType: "warning" }));
			expect(resetProgress).toHaveBeenCalledWith("room-1", ["anna"]);
			expect(fetchOverview).toHaveBeenCalledTimes(2);
		});

		it("should reset the whole room", async () => {
			const wrapper = await setup(overview());

			await wrapper.get("[data-testid='room-learning-paths-reset-all']").trigger("click");
			await flushPromises();

			expect(resetProgress).toHaveBeenCalledWith("room-1", undefined);
		});

		it("should do nothing when the question is declined", async () => {
			askConfirmation.mockResolvedValue(false);
			const wrapper = await setup(overview());

			await wrapper.get("[data-testid='room-learning-paths-reset-all']").trigger("click");
			await wrapper.get("[data-testid='learning-path-reset-anna']").trigger("click");
			await flushPromises();

			expect(resetProgress).not.toHaveBeenCalled();
		});
	});
});
