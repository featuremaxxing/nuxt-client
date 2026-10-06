import LearningPathStepPanel from "./LearningPathStepPanel.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { type LearningPathStep } from "@data-board-learning-path";
import { mount } from "@vue/test-utils";

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

describe("LearningPathStepPanel", () => {
	const setup = (selected: LearningPathStep, others: LearningPathStep[]) =>
		mount(LearningPathStepPanel, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()], stubs: { RouterLink: true } },
			props: { step: selected, steps: [selected, ...others] },
		});

	it("should offer only prerequisites that do not close a circle", () => {
		const a = step("a");
		const b = step("b", { prerequisiteStepIds: ["a"] });
		const c = step("c", { prerequisiteStepIds: ["b"] });

		const wrapper = setup(a, [b, c]);

		expect(wrapper.find("[data-testid=learning-path-panel-add-prerequisite]").exists()).toBe(false);

		const wrapperForC = setup(c, [a, b]);
		expect(wrapperForC.getComponent({ name: "VSelect" }).props("items")).toEqual([{ id: "a", title: "Bereich a" }]);
	});

	it("should connect the chosen prerequisite", async () => {
		const wrapper = setup(step("b"), [step("a")]);

		await wrapper.getComponent({ name: "VSelect" }).vm.$emit("update:modelValue", "a");

		expect(wrapper.emitted("connect")).toEqual([["a"]]);
	});

	it("should remove an arrow", async () => {
		const wrapper = setup(step("b", { prerequisiteStepIds: ["a"] }), [step("a")]);

		await wrapper.get("[data-testid=learning-path-panel-disconnect-a]").trigger("click");

		expect(wrapper.emitted("disconnect")).toEqual([["a"]]);
	});

	it("should only allow locking a step that has prerequisites", async () => {
		const withoutPrerequisites = setup(step("a"), []);
		expect(withoutPrerequisites.getComponent({ name: "VSwitch" }).props("disabled")).toBe(true);

		const wrapper = setup(step("b", { prerequisiteStepIds: ["a"] }), [step("a")]);
		await wrapper.getComponent({ name: "VSwitch" }).vm.$emit("update:modelValue", true);

		expect(wrapper.emitted("update")).toEqual([[{ lockUntilPrerequisitesDone: true }]]);
	});

	it("should ask whether all or one prerequisite is needed only with several prerequisites", async () => {
		const one = setup(step("b", { prerequisiteStepIds: ["a"] }), [step("a")]);
		expect(one.find("[data-testid=learning-path-panel-unlock-mode]").exists()).toBe(false);

		const wrapper = setup(step("c", { prerequisiteStepIds: ["a", "b"] }), [step("a"), step("b")]);
		await wrapper.getComponent({ name: "VRadioGroup" }).vm.$emit("update:modelValue", "any");

		expect(wrapper.emitted("update")).toEqual([[{ unlockMode: "any" }]]);
	});

	describe("a text tile", () => {
		const text = () => step("t", { linkedBoardId: "", isText: true, title: "Teil 2", text: "Alt" });

		it("should edit heading and text and save them when a field is left", async () => {
			const wrapper = setup(text(), []);

			expect(wrapper.find("[data-testid='learning-path-panel-open']").exists()).toBe(false);
			const body = wrapper.get("[data-testid='learning-path-panel-text-body'] textarea");
			await body.setValue("Lest die Karten.");
			await body.trigger("blur");

			expect(wrapper.emitted("update")).toEqual([[{ title: "Teil 2", text: "Lest die Karten." }]]);
		});

		it("should not save when nothing changed", async () => {
			const wrapper = setup(text(), []);

			await wrapper.get("[data-testid='learning-path-panel-text-title'] input").trigger("blur");

			expect(wrapper.emitted("update")).toBeUndefined();
		});
	});
});
