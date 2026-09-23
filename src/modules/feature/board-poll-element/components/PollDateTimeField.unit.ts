import PollDateTimeField from "./PollDateTimeField.vue";
import { toCombinedDateTimeIso } from "@/utils/date-time.utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("PollDateTimeField", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	const setup = (props?: { modelValue?: string; showNowButton?: boolean }) => {
		const wrapper = mount(PollDateTimeField, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				modelValue: props?.modelValue,
				dateLabel: "Start",
				showNowButton: props?.showNowButton,
			},
		});

		return { wrapper };
	};

	it("does not show the now button by default", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='poll-date-time-now']").exists()).toBe(false);
	});

	it("shows the now button when showNowButton is set", () => {
		const { wrapper } = setup({ showNowButton: true });

		expect(wrapper.find("[data-testid='poll-date-time-now']").exists()).toBe(true);
	});

	it("emits a combined ISO string once both date and time are set", async () => {
		const { wrapper } = setup();

		await wrapper.findComponent({ name: "DatePicker" }).vm.$emit("update:date", "2026-03-04");
		await wrapper.findComponent({ name: "TimePicker" }).vm.$emit("update:time", "08:30");

		const emitted = wrapper.emitted("update:modelValue");
		expect(emitted?.at(-1)).toEqual([toCombinedDateTimeIso("2026-03-04", "08:30")]);
	});

	it("splits an existing modelValue into date and time parts", () => {
		const { wrapper } = setup({ modelValue: "2026-03-04T08:30:00.000Z" });

		const datePicker = wrapper.findComponent({ name: "DatePicker" });
		const timePicker = wrapper.findComponent({ name: "TimePicker" });

		expect(datePicker.props("date")).toBeDefined();
		expect(timePicker.props("time")).toBeDefined();
	});

	it("fills both date and time with the current moment when the now button is clicked", async () => {
		const { wrapper } = setup({ showNowButton: true });

		await wrapper.find("[data-testid='poll-date-time-now']").trigger("click");

		const emitted = wrapper.emitted("update:modelValue");
		expect(emitted).toBeDefined();
		expect(emitted?.at(-1)?.[0]).toEqual(expect.any(String));
	});
});
