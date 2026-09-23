<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="dashboard-title">{{ t("pages.dashboard.title") }}</h1>
		</template>
		<template #default>
			<Announcement class="mt-6" />
			<InfoAlert v-if="isDbc && isAdmin" class="mt-6">
				<i18n-t keypath="loggedin.text.backupFeatures" scope="global">
					<template #helpLink>
						<a href="https://dbildungscloud.de/help/confluence/485132545" target="_blank" rel="noopener noreferrer">
							{{ t("loggedin.text.backupFeatures.helpLink") }}
						</a>
					</template>
				</i18n-t>
			</InfoAlert>

			<WarningAlert v-if="inMaintenanceOrMigrationText" class="mt-4" data-testid="maintenance-migration-alert">
				<RenderHTML :html="inMaintenanceOrMigrationText" />
			</WarningAlert>

			<section class="my-8" aria-labelledby="new-features-title" data-testid="new-features">
				<h2 id="new-features-title" class="mb-2">{{ t("pages.dashboard.features.title") }}</h2>
				<p class="mb-4">{{ t("pages.dashboard.features.intro") }}</p>

				<VRow>
					<VCol v-for="feature in newFeatures" :key="feature.title" cols="12" md="6">
						<VCard height="100%" variant="outlined">
							<VCardTitle>{{ t(feature.title) }}</VCardTitle>
							<VCardText>{{ t(feature.description) }}</VCardText>
						</VCard>
					</VCol>
				</VRow>
			</section>

			<DashboardTasks v-if="isTeacher || isStudent" />

			<DashboardReleaseDialog />
		</template>
	</DefaultWireframe>
</template>

<script lang="ts" setup>
import Announcement from "@/components/announcement/Announcement.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission, SchulcloudTheme } from "@api-server";
import { useAppStore, useAppStoreRefs, useSchoolStoreRefs } from "@data-app";
import { useEnvConfig } from "@data-env";
import { DashboardReleaseDialog, DashboardTasks } from "@feature-dashboard";
import { RenderHTML } from "@feature-render-html";
import { InfoAlert, WarningAlert } from "@ui-alert";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { isTeacher, isStudent, isAdmin } = useAppStoreRefs();

const newFeatures = [
	{
		title: "pages.dashboard.features.assignments.title",
		description: "pages.dashboard.features.assignments.description",
	},
	{
		title: "pages.dashboard.features.polls.title",
		description: "pages.dashboard.features.polls.description",
	},
	{
		title: "pages.dashboard.features.aiQuestions.title",
		description: "pages.dashboard.features.aiQuestions.description",
	},
	{
		title: "pages.dashboard.features.learningRoom.title",
		description: "pages.dashboard.features.learningRoom.description",
	},
] as const;

useTitle(buildPageTitle(t("pages.dashboard.title")));

const { schoolDetails } = useSchoolStoreRefs();

const isSchoolInMaintenance = computed(() => schoolDetails.value.inMaintenance);
const isSchoolInMigration = computed(() => schoolDetails.value.inUserMigration);
const canSeeImportUsers = useAppStore().hasPermission(Permission.IMPORT_USER_VIEW);

const inMaintenanceOrMigrationText = computed(() => {
	if (isSchoolInMigration.value && canSeeImportUsers.value) {
		return t("loggedin.text.schoolInMigrationModeStarted");
	} else if (isSchoolInMaintenance.value) {
		if (isAdmin.value) {
			return t("loggedin.text.schoolInTransferPhaseStartNew");
		} else if (isTeacher.value) {
			return t("loggedin.text.schoolInTransferPhaseContactAdmin");
		}
	}
	return undefined;
});
const isDbc = computed(() => useEnvConfig().value.SC_THEME === SchulcloudTheme.DEFAULT);
</script>
