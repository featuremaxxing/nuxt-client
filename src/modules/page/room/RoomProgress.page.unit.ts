import RoomProgressPage from "./RoomProgress.page.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardProgress, useBoardProgressApi } from "@data-board-progress";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@data-board-progress", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-progress")>()),
	useBoardProgressApi: vi.fn(),
}));

const board = (isTeacherView: boolean): BoardProgress => ({
	boardId: "board-1",
	boardTitle: "Board 1",
	isTeacherView,
	summary: { done: 1, total: 2 },
	items: [
		{
			type: "checkbox",
			elementId: "el-1",
			cardId: "card-1",
			title: "Lesen",
			eligible: !isTeacherView,
			done: false,
			doneCount: 1,
			eligibleCount: 2,
			students: isTeacherView
				? [
						{ userId: "anna", firstName: "Anna", lastName: "A", done: true },
						{ userId: "bob", firstName: "Bob", lastName: "B", done: false },
					]
				: undefined,
		},
	],
});

describe("RoomProgressPage", () => {
	const getRoomProgress = vi.fn();

	const setup = async (isTeacherView: boolean) => {
		vi.mocked(useBoardProgressApi).mockReturnValue({ getBoardProgress: vi.fn(), getRoomProgress });
		getRoomProgress.mockResolvedValue({
			roomId: "room-1",
			summary: { done: 1, total: 2 },
			boards: [board(isTeacherView)],
		});

		const router = createRouter({
			history: createWebHistory(),
			routes: [
				{ path: "/rooms/:id/progress", component: RoomProgressPage },
				{ path: "/:p(.*)*", component: {} },
			],
		});
		await router.push("/rooms/room-1/progress");

		const wrapper = mount(RoomProgressPage, {
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

	it("loads the room progress with the per-student details", async () => {
		await setup(true);

		expect(getRoomProgress).toHaveBeenCalledWith("room-1", true);
	});

	it("shows the per-student table to a teacher by default", async () => {
		const wrapper = await setup(true);

		expect(wrapper.find('[data-testid="room-progress-tabs"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="student-progress-bob"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="progress-item-el-1"]').exists()).toBe(false);
	});

	it("lets a teacher switch to the content view", async () => {
		const wrapper = await setup(true);

		await wrapper.get('[data-testid="room-progress-tab-items"]').trigger("click");

		expect(wrapper.find('[data-testid="progress-item-el-1"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="student-progress-table"]').exists()).toBe(false);
	});

	it("shows a student only the content list, without tabs", async () => {
		const wrapper = await setup(false);

		expect(wrapper.find('[data-testid="room-progress-tabs"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="progress-item-el-1"]').exists()).toBe(true);
	});
});
