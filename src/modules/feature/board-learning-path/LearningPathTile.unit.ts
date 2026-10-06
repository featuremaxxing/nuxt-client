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

	describe("a text tile", () => {
		const text = (overrides: Partial<LearningPathStep> = {}) =>
			step({ linkedBoardId: "", isText: true, title: "Teil 2", text: "Lest  die\nKarten.", ...overrides });

		it("should show the heading and the start of the text once it is open", () => {
			const wrapper = setup({ step: text() });

			expect(wrapper.classes()).toContain("lp-tile--text");
			expect(wrapper.text()).toContain("Teil 2");
			expect(wrapper.get(".lp-tile__snippet").text()).toBe("Lest die Karten.");
		});

		it("should not show anything of a locked text to a student", () => {
			const wrapper = setup({ step: text({ status: "locked", title: "", text: undefined }) });

			expect(wrapper.text()).toContain("pages.learningPath.text.locked");
			expect(wrapper.find(".lp-tile__snippet").exists()).toBe(false);
		});

		it("should mark it as a text tile for editors", () => {
			const wrapper = setup({ step: text(), isEditor: true });

			expect(wrapper.find("[data-testid='learning-path-tile-text']").exists()).toBe(true);
		});
	});
});
