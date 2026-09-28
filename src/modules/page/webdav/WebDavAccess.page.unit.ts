import WebDavAccessPage from "./WebDavAccess.page.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useAppPasswordApi } from "@data-app-password";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { vi } from "vitest";

vi.mock("@data-app-password", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app-password")>()),
	useAppPasswordApi: vi.fn(),
}));

describe("WebDavAccessPage", () => {
	const getAppPasswords = vi.fn();
	const createAppPassword = vi.fn();
	const deleteAppPassword = vi.fn();

	const setup = async (appPasswords = [{ id: "ap-1", name: "Laptop", createdAt: "2026-09-28T10:00:00.000Z" }]) => {
		vi.mocked(useAppPasswordApi).mockReturnValue({ getAppPasswords, createAppPassword, deleteAppPassword });
		getAppPasswords.mockResolvedValue(appPasswords);

		const wrapper = mount(WebDavAccessPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n(), createTestingPinia()],
				stubs: { DefaultWireframe: { template: "<div><slot name='header' /><slot /></div>" } },
			},
			attachTo: document.body,
		});
		await flushPromises();

		return { wrapper };
	};

	afterEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	it("shows the drive address and the existing app passwords", async () => {
		const { wrapper } = await setup();

		const url = wrapper.find("[data-testid=webdav-url] input").element as HTMLInputElement;
		expect(url.value).toEqual(`${window.location.origin}/api/v3/webdav/`);
		expect(wrapper.find("[data-testid=webdav-app-password-ap-1]").text()).toContain("Laptop");
	});

	it("shows an empty state without app passwords", async () => {
		const { wrapper } = await setup([]);

		expect(wrapper.find("[data-testid=webdav-empty]").exists()).toBe(true);
	});

	it("creates an app password and shows its secret once", async () => {
		const { wrapper } = await setup();
		createAppPassword.mockResolvedValue({
			id: "ap-2",
			name: "Handy",
			createdAt: "2026-09-28T10:00:00.000Z",
			token: "ap-2.secret",
			username: "lehrer@schule.de",
		});

		await wrapper.find("[data-testid=webdav-new-name] input").setValue("Handy");
		await wrapper.find("form").trigger("submit");
		await flushPromises();

		expect(createAppPassword).toHaveBeenCalledWith("Handy");
		expect(wrapper.find("[data-testid=webdav-created-token]").text()).toEqual("ap-2.secret");
		expect(wrapper.find("[data-testid=webdav-created-username]").text()).toEqual("lehrer@schule.de");
		expect(getAppPasswords).toHaveBeenCalledTimes(2);
	});

	it("revokes an app password after confirmation", async () => {
		const { wrapper } = await setup();
		deleteAppPassword.mockResolvedValue(true);

		await wrapper.find("[data-testid=webdav-revoke-ap-1]").trigger("click");
		await flushPromises();
		(document.querySelector("[data-testid=webdav-revoke-confirm]") as HTMLElement).click();
		await flushPromises();

		expect(deleteAppPassword).toHaveBeenCalledWith("ap-1");
		expect(getAppPasswords).toHaveBeenCalledTimes(2);
	});
});
