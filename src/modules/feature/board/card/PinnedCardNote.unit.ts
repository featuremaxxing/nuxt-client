import PinnedCardNote from "./PinnedCardNote.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

describe("PinnedCardNote", () => {
	const setup = (props: { note?: string; editing?: boolean } = {}) =>
		mount(PinnedCardNote, {
			props,
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

	it("should render nothing without a note", () => {
		const wrapper = setup();

		expect(wrapper.find('[data-testid="pinned-card-note"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="pinned-card-note-editor"]').exists()).toBe(false);
	});

	it("should show the note and open the editor on click", async () => {
		const wrapper = setup({ note: "Frage an Frau M." });

		const note = wrapper.find('[data-testid="pinned-card-note"]');
		expect(note.text()).toContain("Frage an Frau M.");

		await note.trigger("click");

		expect(wrapper.emitted("update:editing")).toEqual([[true]]);
	});

	it("should save the trimmed note on blur", async () => {
		const wrapper = setup({ note: "alt", editing: true });

		const textarea = wrapper.find("textarea");
		await textarea.setValue("  neu  ");
		await textarea.trigger("blur");

		expect(wrapper.emitted("save")).toEqual([["neu"]]);
		expect(wrapper.emitted("update:editing")).toEqual([[false]]);
	});

	it("should not save an unchanged note", async () => {
		const wrapper = setup({ note: "gleich", editing: true });

		await wrapper.find("textarea").trigger("blur");

		expect(wrapper.emitted("save")).toBeUndefined();
	});

	it("should discard the draft on escape", async () => {
		const wrapper = setup({ note: "alt", editing: true });

		const textarea = wrapper.find("textarea");
		await textarea.setValue("verworfen");
		await textarea.trigger("keydown", { key: "Escape" });

		expect(wrapper.emitted("update:editing")).toEqual([[false]]);
		expect(wrapper.emitted("save")).toBeUndefined();
	});

	it("should keep arrow keys from moving the card", async () => {
		const wrapper = setup({ editing: true });
		const outer = vi.fn();
		wrapper.element.parentElement?.addEventListener("keydown", outer);

		await wrapper.find("textarea").trigger("keydown", { key: "ArrowDown" });

		expect(outer).not.toHaveBeenCalled();
	});
});
