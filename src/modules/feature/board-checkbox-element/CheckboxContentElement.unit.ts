import { useCheckboxApi } from "./checkbox-api";
import CheckboxContentElement from "./CheckboxContentElement.vue";
import { CheckboxElement } from "@/types/board/ContentElement";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardRoles, ContentElementType, PollAudience } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { vi } from "vitest";
import { nextTick, ref } from "vue";

vi.mock("./checkbox-api", () => ({ useCheckboxApi: vi.fn() }));
vi.mock("@data-board", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board")>()),
	useBoardFocusHandler: vi.fn(),
	useContentElementState: ({ element }: { element: CheckboxElement }) => ({ modelValue: ref(element.content) }),
}));

const element = {
	id: "checkbox-id",
	type: ContentElementType.CHECKBOX,
	content: { text: "Read chapter", requireTeacherConfirmation: true, audience: PollAudience.STUDENTS },
} as CheckboxElement;

describe("CheckboxContentElement", () => {
	const getState = vi.fn();
	const check = vi.fn();
	const approve = vi.fn();
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useCheckboxApi).mockReturnValue({ getState, check, approve });
		getState.mockResolvedValue({ entries: [], canManage: true, hasCheckActivity: false });
		check.mockResolvedValue({ myEntry: { checked: true, approved: false }, canManage: false, hasCheckActivity: true });
	});

	const setup = (isEditMode = false, checkboxElement = element) =>
		mount(CheckboxContentElement, {
			props: { element: checkboxElement, isEditMode },
			global: { plugins: [createTestingPinia(), createTestingI18n(), createTestingVuetify()] },
		});

	it("lets the student mark completion and shows pending approval", async () => {
		getState.mockResolvedValue({
			myEntry: { checked: false, approved: false },
			canManage: false,
			hasCheckActivity: false,
		});
		const wrapper = setup();
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(true));
		await wrapper.findComponent({ name: "VCheckbox" }).vm.$emit("update:modelValue", true);
		await vi.waitFor(() => expect(check).toHaveBeenCalledWith("checkbox-id", true));
		await nextTick();
		expect(wrapper.find('[data-testid="checkbox-approval-status"]').text()).toContain("checkboxElement.pending");
		expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).not.toContain("checkbox-complete");
		expect(wrapper.find('[data-testid="checkbox-student-check"]').text()).not.toContain("Read chapter");
	});

	it("turns green immediately after checking when teacher approval is not required", async () => {
		getState.mockResolvedValue({ myEntry: { checked: false, approved: false }, canManage: false });
		check.mockResolvedValue({ myEntry: { checked: true, approved: false }, canManage: false });
		const wrapper = setup(false, {
			...element,
			content: { ...element.content, requireTeacherConfirmation: false },
		});
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(true));
		expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).not.toContain("checkbox-complete");
		await wrapper.findComponent({ name: "VCheckbox" }).vm.$emit("update:modelValue", true);
		await vi.waitFor(() =>
			expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).toContain("checkbox-complete")
		);
		expect(wrapper.find('[data-testid="checkbox-approval-status"]').exists()).toBe(false);
		check.mockResolvedValue({ myEntry: { checked: false, approved: false }, canManage: false });
		await wrapper.findComponent({ name: "VCheckbox" }).vm.$emit("update:modelValue", false);
		await vi.waitFor(() =>
			expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).not.toContain("checkbox-complete")
		);
	});

	it("does not show a student checkbox for a teacher", async () => {
		getState.mockResolvedValue({
			canManage: true,
			entries: [{ userId: "student", firstName: "Jane", lastName: "Doe", checked: true, approved: false }],
		});
		const wrapper = setup();
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-details"]').exists()).toBe(true));
		expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="checkbox-progress-label"]').text()).toContain("0/1");
		expect(Number(wrapper.find('[data-testid="checkbox-progress"]').attributes("aria-valuenow"))).toBe(0);
		await wrapper.find('[data-testid="checkbox-details"]').trigger("click");
		await vi.waitFor(() => expect(getState).toHaveBeenCalledTimes(2));
		expect(check).not.toHaveBeenCalled();
	});

	it("keeps an approved student checkbox checked and locked until teacher revokes approval", async () => {
		getState.mockResolvedValue({ entries: [], myEntry: { checked: true, approved: true }, canManage: false });
		const wrapper = setup();
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(true));
		expect(wrapper.findComponent({ name: "VCheckbox" }).props("disabled")).toBe(true);
		await wrapper.findComponent({ name: "VCheckbox" }).vm.$emit("update:modelValue", false);
		expect(check).not.toHaveBeenCalled();
		expect(wrapper.find('[data-testid="checkbox-approval-status"]').text()).toContain("checkboxElement.approved");
		expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).toContain("checkbox-complete");
	});

	it("counts only approved checks in the teacher progress when confirmation is required", async () => {
		getState.mockResolvedValue({
			canManage: true,
			entries: [
				{ userId: "one", checked: true, approved: true },
				{ userId: "two", checked: true, approved: false },
				{ userId: "three", checked: false, approved: false },
			],
		});
		const wrapper = setup();
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-progress-label"]').text()).toContain("1/3"));
		expect(Number(wrapper.find('[data-testid="checkbox-progress"]').attributes("aria-valuenow"))).toBeCloseTo(100 / 3);
		expect(wrapper.find('[data-testid="board-checkbox-element"]').classes()).not.toContain("checkbox-complete");
	});

	it("counts checked participants without approval and handles an empty audience", async () => {
		getState.mockResolvedValue({ canManage: true, entries: [] });
		const wrapper = setup(false, {
			...element,
			content: { ...element.content, requireTeacherConfirmation: false },
		});
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-progress-label"]').text()).toContain("0/0"));
		expect(Number(wrapper.find('[data-testid="checkbox-progress"]').attributes("aria-valuenow"))).toBe(0);
		getState.mockResolvedValue({
			canManage: true,
			entries: [
				{ userId: "one", checked: true, approved: false },
				{ userId: "two", checked: false, approved: false },
			],
		});
		await wrapper.find('[data-testid="checkbox-details"]').trigger("click");
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-progress-label"]').text()).toContain("1/2"));
		expect(Number(wrapper.find('[data-testid="checkbox-progress"]').attributes("aria-valuenow"))).toBe(50);
	});

	it("lets an eligible nonowner teacher check even when board editing is active, but never edit or delete", async () => {
		getState.mockResolvedValue({
			canManage: false,
			myEntry: { checked: false, approved: false },
			hasCheckActivity: false,
		});
		const wrapper = setup(true);
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(true));
		expect(wrapper.find('[data-testid="checkbox-text"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="checkbox-audience-select"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="checkbox-details"]').exists()).toBe(false);
		await wrapper.findComponent({ name: "VCheckbox" }).vm.$emit("update:modelValue", true);
		await vi.waitFor(() => expect(check).toHaveBeenCalledWith("checkbox-id", true));
	});

	it("offers teacher approval setting while editing when no student has acted", async () => {
		const wrapper = setup(true);
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-text"]').exists()).toBe(true));
		expect(wrapper.find('[data-testid="checkbox-require-approval"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="checkbox-audience-select"]').exists()).toBe(true);
		await vi.waitFor(() => expect(wrapper.findComponent({ name: "VSwitch" }).props("disabled")).toBe(false));
		expect(getState).toHaveBeenCalledWith("checkbox-id");
		expect(wrapper.find('[data-testid="checkbox-student-check"]').exists()).toBe(false);
	});

	it("locks approval setting after any check activity, including an unchecked student", async () => {
		getState.mockResolvedValue({
			canManage: true,
			entries: [{ userId: "student", firstName: "Jane", lastName: "Doe", checked: false, approved: false }],
			hasCheckActivity: true,
		});
		const wrapper = setup(true);
		await vi.waitFor(() => expect(wrapper.findComponent({ name: "VSwitch" }).props("disabled")).toBe(true));
		expect(wrapper.find('[data-testid="checkbox-text"]').exists()).toBe(true);
		expect(wrapper.findComponent({ name: "VSelect" }).props("disabled")).toBe(true);
	});

	it("allows owner to configure a custom audience by board role", async () => {
		const customElement = {
			...element,
			content: { ...element.content, audience: PollAudience.CUSTOM, audienceRoles: [] as BoardRoles[] },
		};
		const wrapper = mount(CheckboxContentElement, {
			props: { element: customElement, isEditMode: true },
			global: { plugins: [createTestingPinia(), createTestingI18n(), createTestingVuetify()] },
		});
		await vi.waitFor(() => expect(wrapper.find('[data-testid="checkbox-audience-role-reader"]').exists()).toBe(true));
		expect(wrapper.find('[data-testid="checkbox-audience-role-editor"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="checkbox-audience-role-admin"]').exists()).toBe(true);
		await wrapper.findAllComponents({ name: "VCheckbox" })[0].vm.$emit("update:modelValue", true);
		expect(customElement.content.audienceRoles).toContain(BoardRoles.READER);
	});
});
