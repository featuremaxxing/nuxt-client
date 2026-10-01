import RoomLearningPathsPage from "./RoomLearningPaths.page.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor } from "@api-server";
import { type LearningPathOverview, useLearningPathApi } from "@data-board-learning-path";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { VSelect } from "vuetify/components";

vi.mock("@data-board-learning-path", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-learning-path")>()),
	useLearningPathApi: vi.fn(),
}));

const blue = { id: "blue", title: "Blau", color: LearningPathColor.Blue, total: 4 };
const green = { id: "green", title: "Grün", color: LearningPathColor.Green, total: 3 };

const overview = (paths = [blue, green]): LearningPathOverview => ({
	paths,
	students: [
		{
			userId: "anna",
			firstName: "Anna",
			lastName: "Adler",
			paths: [{ pathId: "blue", done: 2, total: 4, nextBoardTitle: "Addieren" }],
		},
		{ userId: "bob", firstName: "Bob", lastName: "Berg", paths: [] },
	],
});

describe("RoomLearningPathsPage", () => {
	const fetchOverview = vi.fn();
	const enroll = vi.fn();
	const unenroll = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useLearningPathApi).mockReturnValue({ fetchOverview, enroll, unenroll } as unknown as ReturnType<
			typeof useLearningPathApi
		>);
		enroll.mockResolvedValue(undefined);
		unenroll.mockResolvedValue(undefined);
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
});
