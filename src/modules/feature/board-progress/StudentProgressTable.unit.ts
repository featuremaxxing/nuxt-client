import StudentProgressTable from "./StudentProgressTable.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { StudentProgress } from "@data-board-progress";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({ history: createWebHistory(), routes: [{ path: "/:pathMatch(.*)*", component: {} }] });

const rows: StudentProgress[] = [
	{
		userId: "bob",
		firstName: "Bob",
		lastName: "B",
		done: 1,
		total: 3,
		openItems: [
			{
				boardId: "board-1",
				boardTitle: "Board 1",
				cardId: "card-1",
				elementId: "el-1",
				type: "assignment",
				title: "Aufsatz",
				dueDate: "2000-01-01T00:00:00.000Z",
			},
			{
				boardId: "board-1",
				boardTitle: "Board 1",
				cardId: "card-2",
				elementId: "el-2",
				type: "checkbox",
				title: "Lesen",
			},
		],
	},
	{ userId: "anna", firstName: "Anna", lastName: "A", done: 3, total: 3, openItems: [] },
];

describe("StudentProgressTable", () => {
	const setup = () =>
		mount(StudentProgressTable, {
			props: { rows },
			global: { plugins: [router, createTestingI18n(), createTestingVuetify()] },
		});

	it("renders one row per student with name and done/total", () => {
		const wrapper = setup();

		expect(wrapper.get('[data-testid="student-progress-bob"]').text()).toContain("Bob B");
		expect(wrapper.get('[data-testid="student-progress-bob"] [data-testid="student-progress-count"]').text()).toBe(
			"1/3"
		);
		expect(wrapper.get('[data-testid="student-progress-anna"] [data-testid="student-progress-count"]').text()).toBe(
			"3/3"
		);
	});

	it("lists the open items with deep links once a student is expanded", async () => {
		const wrapper = setup();

		await wrapper.get('[data-testid="student-progress-bob"] button').trigger("click");

		const item = wrapper.get('[data-testid="student-open-item-bob-el-1"]');
		expect(item.attributes("href")).toBe("/boards/board-1#card-card-1");
		expect(wrapper.findAll('[data-testid="student-open-item-overdue"]')).toHaveLength(1);
	});

	it("tells when a student has nothing open", async () => {
		const wrapper = setup();

		await wrapper.get('[data-testid="student-progress-anna"] button').trigger("click");

		expect(wrapper.find('[data-testid="student-progress-all-done"]').exists()).toBe(true);
	});
});
