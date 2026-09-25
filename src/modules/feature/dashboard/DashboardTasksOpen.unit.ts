import DashboardTasksOpen from "./DashboardTasksOpen.vue";
import DashboardTasksSection from "./DashboardTasksSection.vue";
import { taskResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { shallowMount } from "@vue/test-utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { describe, expect, it } from "vitest";

dayjs.extend(utc);

describe("DashboardTasksOpen", () => {
	const setup = (tasks = [taskResponseFactory.build()]) => {
		const wrapper = shallowMount(DashboardTasksOpen, {
			props: { tasks, emptyMsg: "Any Empty Message" },
			attrs: { "data-testid": "assigned-tasks" },
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});
		return { wrapper };
	};

	it("shows empty state when no tasks", () => {
		const { wrapper } = setup([]);

		expect(wrapper.find("[data-testid='empty-state-tasks']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='assigned-tasks']").exists()).toBe(false);
	});

	it("shows tasks section when tasks exist", () => {
		const tasks = [taskResponseFactory.build({ id: "1" })];
		const { wrapper } = setup(tasks);

		expect(wrapper.find("[data-testid='assigned-tasks']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='empty-state-tasks']").exists()).toBe(false);
	});

	it("groups tasks into separate due-date sections instead of one flat list", () => {
		const tasks = [
			taskResponseFactory.build({ id: "1", dueDate: dayjs.utc().toISOString() }),
			taskResponseFactory.build({ id: "2", dueDate: dayjs.utc().add(3, "day").toISOString() }),
			taskResponseFactory.build({ id: "3", dueDate: undefined }),
		];
		const { wrapper } = setup(tasks);

		const sections = wrapper.findAllComponents(DashboardTasksSection);
		expect(sections).toHaveLength(3);
		expect(sections.map((section) => section.props("title"))).toEqual([
			"pages.dashboard.tasks.group.today",
			"pages.dashboard.tasks.group.thisWeek",
			"pages.dashboard.tasks.group.noDueDate",
		]);
	});
});
