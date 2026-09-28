import { useEnvConfig } from "@data-env";

export const checkWebDavFeature = () => (useEnvConfig().value.FEATURE_WEBDAV_ENABLED ? true : "/");
