<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<div class="lr-page-title">
				<h1 data-testid="dashboard-title">{{ t("pages.dashboard.title") }}</h1>
				<p class="lr-page-title__date" data-testid="dashboard-date">{{ today }}</p>
			</div>
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

			<DashboardTasks v-if="isTeacher || isStudent" />

			<section
				v-if="!newFeaturesDismissed"
				class="my-8"
				aria-labelledby="new-features-title"
				data-testid="new-features"
			>
				<div class="d-flex align-start justify-space-between ga-4 mb-2 flex-wrap">
					<div>
						<h2 id="new-features-title" class="mb-2">{{ t("pages.dashboard.features.title") }}</h2>
						<p class="mb-0">{{ t("pages.dashboard.features.intro") }}</p>
					</div>
					<VBtn variant="text" size="small" data-testid="dismiss-new-features" @click="newFeaturesDismissed = true">
						{{ t("pages.dashboard.features.dismiss") }}
					</VBtn>
				</div>

				<ul class="lr-features">
					<li v-for="feature in newFeatures" :key="feature.title" class="lr-feature">
						<h3 class="lr-feature__title">{{ t(feature.title) }}</h3>
						<p class="lr-feature__text">{{ t(feature.description) }}</p>
					</li>
				</ul>
			</section>

			<DashboardReleaseDialog />
		</template>
	</DefaultWireframe>
</template>

<script lang="ts" setup>
import Announcement from "@/components/announcement/Announcement.vue";
import { nowUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission, SchulcloudTheme } from "@api-server";
import { useAppStore, useAppStoreRefs, useSchoolStoreRefs } from "@data-app";
import { useEnvConfig } from "@data-env";
import { DashboardReleaseDialog, DashboardTasks } from "@feature-dashboard";
import { RenderHTML } from "@feature-render-html";
import { InfoAlert, WarningAlert } from "@ui-alert";
import { DefaultWireframe } from "@ui-layout";
import { useStorage, useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
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

// Dismissed per feature set: editing `newFeatures` (a new release) surfaces the section again.
const dismissedFeatureSet = useStorage("dashboard.newFeatures.dismissedFor", "");
const currentFeatureSet = newFeatures.map((feature) => feature.title).join(",");
const newFeaturesDismissed = computed({
	get: () => dismissedFeatureSet.value === currentFeatureSet,
	set: (value: boolean) => {
		dismissedFeatureSet.value = value ? currentFeatureSet : "";
	},
});

useTitle(buildPageTitle(t("pages.dashboard.title")));

// re-evaluated on locale change (dayjs follows the app locale)
const today = computed(() => locale.value && nowUtc().local().format("dddd, LL"));

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

<style lang="scss" scoped>
.lr-page-title {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0 var(--lr-space-4);
}

.lr-page-title__date {
	margin: 0 0 20px;
	font-family: var(--font-accent);
	font-stretch: var(--font-stretch-display);
	font-weight: 600;
	font-size: var(--text-lg);
	color: var(--lr-text-muted);
}

.lr-features {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
	gap: 1px;
	list-style: none;
	padding: 0;
	margin: var(--lr-space-4) 0 0;
	background: var(--lr-line);
	border: 1px solid var(--lr-line);
	border-radius: var(--lr-radius);
	overflow: hidden;
}

.lr-feature {
	padding: var(--lr-space-4) var(--lr-space-5) var(--lr-space-5);
	background: rgb(var(--v-theme-surface));
}

.lr-feature__title {
	margin: 0 0 var(--lr-space-2);
	font-size: var(--heading-5);
}

.lr-feature__text {
	margin: 0;
	color: var(--lr-text-muted);
	max-width: 60ch;
}
</style>
