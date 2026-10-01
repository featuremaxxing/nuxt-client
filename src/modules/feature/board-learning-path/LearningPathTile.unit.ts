import LearningPathTile from "./LearningPathTile.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { type LearningPathStep } from "@data-board-learning-path";
import { mount } from "@vue/test-utils";

const step = (overrides: Partial<LearningPathStep> = {}): LearningPathStep => ({
	id: "a",
	linkedBoardId: "board-a",
	title: "Addieren",
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds: [],
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
	...overrides,
});

describe("LearningPathTile", () => {
	const setup = (props: { step: LearningPathStep; isEditor?: boolean }) =>
		mount(LearningPathTile, { global: { plugins: [createTestingVuetify(), createTestingI18n()] }, props });

	it("should mark a board that came up for rework, and say so to screen readers", () => {
		const wrapper = setup({ step: step({ reopened: true }) });

		expect(wrapper.find("[data-testid='learning-path-tile-rework']").exists()).toBe(true);
		expect(wrapper.attributes("aria-label")).toContain("pages.learningPath.reworkHint");
		expect(wrapper.attributes("title")).toBe("pages.learningPath.reworkHint");
	});

	it("should not mark other boards", () => {
		const wrapper = setup({ step: step() });

		expect(wrapper.find("[data-testid='learning-path-tile-rework']").exists()).toBe(false);
	});

	it("should not show the mark to editors", () => {
		const wrapper = setup({ step: step({ reopened: true }), isEditor: true });

		expect(wrapper.find("[data-testid='learning-path-tile-rework']").exists()).toBe(false);
	});
});
