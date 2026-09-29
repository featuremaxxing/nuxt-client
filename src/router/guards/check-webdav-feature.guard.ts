import { useAppStore } from "@data-app";
import { useEnvConfig } from "@data-env";

// the network drive is for teachers only for now (the server enforces the same)
export const checkWebDavFeature = () =>
	useEnvConfig().value.FEATURE_WEBDAV_ENABLED && useAppStore().isTeacher ? true : "/";
