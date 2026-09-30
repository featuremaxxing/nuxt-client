import CreateBoardNameDialog from "./CreateBoardNameDialog.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { SvsDialog } from "@ui-dialog";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VTextField } from "vuetify/components";

describe("@ui-room-details/CreateBoardNameDialog", () => {
	enableAutoUnmount(afterEach);

	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	const setup = async (layout = BoardLayout.COLUMNS) => {
		const wrapper = mount(CreateBoardNameDialog, {
			attachTo: document.body,
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { modelValue: false, layout },
		});
		await wrapper.setProps({ modelValue: true });
		await nextTick();

		return { wrapper };
	};

	it("should only allow creating once a name is entered", async () => {
		const { wrapper } = await setup();
		const dialog = wrapper.getComponent(SvsDialog);

		expect(dialog.props("confirmBtnDisabled")).toBe(true);

		await wrapper.getComponent(VTextField).setValue("  Bruchrechnung ");

		expect(dialog.props("confirmBtnDisabled")).toBe(false);
	});

	it("should hand over the trimmed name", async () => {
		const { wrapper } = await setup();

		await wrapper.getComponent(VTextField).setValue("  Bruchrechnung ");
		wrapper.getComponent(SvsDialog).vm.$emit("confirm");

		expect(wrapper.emitted("confirm")).toEqual([["Bruchrechnung"]]);
	});

	it("should suggest a name that fits the kind of board", async () => {
		const { wrapper } = await setup(BoardLayout.LEARNING_PATH);

		expect(wrapper.getComponent(VTextField).props("placeholder")).toBe(
			"pages.room.dialog.boardName.placeholder.learningPath"
		);
	});

	it("should start empty every time it opens", async () => {
		const { wrapper } = await setup();
		await wrapper.getComponent(VTextField).setValue("Alt");

		await wrapper.setProps({ modelValue: false });
		await wrapper.setProps({ modelValue: true });
		await nextTick();

		expect(wrapper.getComponent(VTextField).props("modelValue")).toBe("");
	});
});
