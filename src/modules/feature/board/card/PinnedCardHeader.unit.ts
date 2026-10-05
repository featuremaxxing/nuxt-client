import PinnedCardHeader from "./PinnedCardHeader.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { VChip } from "vuetify/components";

describe("PinnedCardHeader", () => {
	const setup = (props: InstanceType<typeof PinnedCardHeader>["$props"] = {}) =>
		mount(PinnedCardHeader, {
			props: {
				originTitle: "Mathe 9b",
				originRoute: { name: "boards-id", params: { id: "originBoardId" }, hash: "#card-cardId" },
				...props,
			},
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { RouterLink: true },
			},
		});

	it("should link the origin chip back to the card in its room", () => {
		const wrapper = setup();

		const chip = wrapper.getComponent(VChip);

		expect(chip.text()).toContain("Mathe 9b");
		expect(chip.props("to")).toEqual({ name: "boards-id", params: { id: "originBoardId" }, hash: "#card-cardId" });
	});

	it("should show how much of the card is done", () => {
		const wrapper = setup({ progressDone: 1, progressTotal: 3 });

		expect(wrapper.find('[data-testid="pinned-card-status-progress"]').text()).toContain(
			"pages.learningRoom.status.progress"
		);
		expect(wrapper.find('[data-testid="pinned-card-status-done"]').exists()).toBe(false);
	});

	it("should only say done once everything is done", () => {
		const wrapper = setup({ progressDone: 2, progressTotal: 2, nextDueDate: "2026-10-02T10:00:00.000Z" });

		expect(wrapper.find('[data-testid="pinned-card-status-done"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="pinned-card-status-due"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="pinned-card-status-progress"]').exists()).toBe(false);
	});

	it("should highlight an overdue due date", () => {
		const wrapper = setup({ progressDone: 0, progressTotal: 1, nextDueDate: "2000-01-01T10:00:00.000Z" });

		expect(wrapper.find('[data-testid="pinned-card-status-due"]').classes()).toContain("text-error");
	});

	it("should keep a future due date calm", () => {
		const wrapper = setup({ progressDone: 0, progressTotal: 1, nextDueDate: "2999-01-01T10:00:00.000Z" });

		expect(wrapper.find('[data-testid="pinned-card-status-due"]').classes()).not.toContain("text-error");
	});

	it("should show no status for a card without anything to do", () => {
		const wrapper = setup();

		expect(wrapper.find('[data-testid="pinned-card-status-done"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="pinned-card-status-due"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="pinned-card-status-progress"]').exists()).toBe(false);
	});
});
