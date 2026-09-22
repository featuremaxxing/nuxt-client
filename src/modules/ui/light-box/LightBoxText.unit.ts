import LightBoxText from "./LightBoxText.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

describe("LightBoxText", () => {
	let originalFetch: typeof fetch;

	afterEach(() => {
		vi.clearAllMocks();
		global.fetch = originalFetch;
	});

	const mockFetch = (body: string, ok = true) => {
		originalFetch = global.fetch;
		global.fetch = vi.fn().mockResolvedValue({
			ok,
			blob: async () => new Blob([body], { type: "text/plain" }),
		}) as unknown as typeof fetch;
	};

	const setup = async (url = "https://api/files/notes.txt") => {
		const wrapper = mount(LightBoxText, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { url },
		});

		await flushPromises();
		await flushPromises();

		return { wrapper };
	};

	it("renders the fetched text content", async () => {
		mockFetch("hello from the file");

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-text-content']").text()).toBe("hello from the file");
	});

	it("shows no truncation hint for a small file", async () => {
		mockFetch("short");

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-text-truncated']").exists()).toBe(false);
	});

	it("truncates a file larger than the size limit and shows a hint", async () => {
		mockFetch("a".repeat(512 * 1024 + 10));

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-text-content']").text()).toHaveLength(512 * 1024);
		expect(wrapper.find("[data-testid='light-box-text-truncated']").exists()).toBe(true);
	});

	it("shows an error message when the response is not ok", async () => {
		mockFetch("", false);

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-text']").text()).not.toBe("");
		expect(wrapper.find("[data-testid='light-box-text-content']").exists()).toBe(false);
	});

	it("shows an error message when the fetch rejects", async () => {
		originalFetch = global.fetch;
		global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-text-content']").exists()).toBe(false);
	});
});
