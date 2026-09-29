import { checkWebDavFeature } from "./check-webdav-feature.guard";
import { createTestAppStore, createTestEnvStore } from "@@/tests/test-utils";
import { RoleName } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { setActivePinia } from "pinia";

describe("checkWebDavFeature guard", () => {
	const setup = (enabled: boolean, roleName: RoleName) => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ FEATURE_WEBDAV_ENABLED: enabled });
		createTestAppStore({ me: { roles: [{ id: "role", name: roleName }] } });
	};

	it("should let teachers in when the feature is enabled", () => {
		setup(true, RoleName.TEACHER);

		expect(checkWebDavFeature()).toBe(true);
	});

	it("should redirect students", () => {
		setup(true, RoleName.STUDENT);

		expect(checkWebDavFeature()).toEqual("/");
	});

	it("should redirect everybody when the feature is disabled", () => {
		setup(false, RoleName.TEACHER);

		expect(checkWebDavFeature()).toEqual("/");
	});
});
