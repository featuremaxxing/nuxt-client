<template>
	<DefaultWireframe max-width="short" :breadcrumbs="[]">
		<template #header>
			<h1 data-testid="webdav-title">{{ t("pages.webdav.title") }}</h1>
		</template>

		<p class="mb-6">{{ t("pages.webdav.intro") }}</p>

		<h2 class="text-h4 mb-2">{{ t("pages.webdav.structure.title") }}</h2>
		<div class="d-flex flex-wrap align-center ga-1 mb-2" data-testid="webdav-structure">
			<template v-for="(level, index) in structureLevels" :key="level">
				<VIcon v-if="index > 0" :icon="mdiChevronRight" size="small" />
				<VChip size="small" variant="tonal" label>{{ t(`pages.webdav.structure.level.${level}`) }}</VChip>
			</template>
		</div>
		<p class="mb-6">{{ t("pages.webdav.structure.text") }}</p>

		<h2 class="text-h4 mb-2">{{ t("pages.webdav.address.title") }}</h2>
		<VTextField
			:model-value="webDavUrl"
			readonly
			variant="outlined"
			density="compact"
			data-testid="webdav-url"
			:append-inner-icon="mdiContentCopy"
			@click:append-inner="copy(webDavUrl)"
		/>

		<VExpansionPanels class="mb-8" variant="accordion" data-testid="webdav-instructions">
			<VExpansionPanel v-for="system in systems" :key="system" :title="t(`pages.webdav.instructions.${system}.title`)">
				<VExpansionPanelText>{{
					t(`pages.webdav.instructions.${system}.text`, { url: webDavUrl })
				}}</VExpansionPanelText>
			</VExpansionPanel>
		</VExpansionPanels>

		<h2 class="text-h4 mb-2">{{ t("pages.webdav.appPasswords.title") }}</h2>
		<p class="mb-4">{{ t("pages.webdav.appPasswords.description") }}</p>

		<VCard v-if="created" variant="tonal" color="success" class="mb-6" data-testid="webdav-created">
			<VCardItem>
				<template #prepend>
					<VIcon :icon="mdiCheckCircle" size="28" />
				</template>
				<VCardTitle class="text-wrap">
					{{ t("pages.webdav.appPasswords.createdTitle", { name: created.name }) }}
				</VCardTitle>
				<VCardSubtitle class="text-wrap opacity-100">{{ t("pages.webdav.appPasswords.created") }}</VCardSubtitle>
				<template #append>
					<VBtn
						:icon="mdiClose"
						size="small"
						variant="text"
						:aria-label="t('common.labels.close')"
						data-testid="webdav-created-close"
						@click="created = undefined"
					/>
				</template>
			</VCardItem>
			<VCardText>
				<VSheet rounded class="pa-4 pb-0 text-high-emphasis">
					<VTextField
						v-for="field in createdFields"
						:key="field.key"
						:model-value="field.value"
						:label="field.label"
						readonly
						variant="outlined"
						density="comfortable"
						:class="field.key === 'token' ? 'credential-token' : undefined"
						:data-testid="`webdav-created-${field.key}`"
					>
						<template #append-inner>
							<VBtn
								:icon="mdiContentCopy"
								size="small"
								variant="text"
								:aria-label="t('common.actions.copy')"
								:data-testid="`webdav-copy-${field.key}`"
								@click="copy(field.value)"
							/>
						</template>
					</VTextField>
				</VSheet>
			</VCardText>
		</VCard>

		<form class="d-flex ga-2 align-start mb-4" @submit.prevent="onCreate">
			<VTextField
				v-model="newName"
				:label="t('pages.webdav.appPasswords.name')"
				:placeholder="t('pages.webdav.appPasswords.namePlaceholder')"
				variant="outlined"
				density="compact"
				maxlength="100"
				data-testid="webdav-new-name"
			/>
			<VBtn
				type="submit"
				color="primary"
				variant="flat"
				:disabled="!newName.trim() || isCreating"
				:loading="isCreating"
				data-testid="webdav-create"
			>
				{{ t("pages.webdav.appPasswords.create") }}
			</VBtn>
		</form>

		<p v-if="!isLoading && appPasswords.length === 0" data-testid="webdav-empty">
			{{ t("pages.webdav.appPasswords.empty") }}
		</p>
		<VList v-else>
			<VListItem
				v-for="appPassword in appPasswords"
				:key="appPassword.id"
				:title="appPassword.name"
				:subtitle="usageLabel(appPassword)"
				:data-testid="`webdav-app-password-${appPassword.id}`"
			>
				<template #append>
					<VBtn
						variant="text"
						color="error"
						:data-testid="`webdav-revoke-${appPassword.id}`"
						@click="toRevoke = appPassword"
					>
						{{ t("pages.webdav.appPasswords.revoke") }}
					</VBtn>
				</template>
			</VListItem>
		</VList>

		<VDialog :model-value="!!toRevoke" max-width="480" @update:model-value="toRevoke = undefined">
			<VCard v-if="toRevoke" data-testid="webdav-revoke-dialog">
				<VCardTitle>{{ t("pages.webdav.appPasswords.revokeConfirm.title") }}</VCardTitle>
				<VCardText>{{ t("pages.webdav.appPasswords.revokeConfirm.text", { name: toRevoke.name }) }}</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="toRevoke = undefined">{{ t("common.actions.cancel") }}</VBtn>
					<VBtn color="error" variant="flat" data-testid="webdav-revoke-confirm" @click="onRevoke">
						{{ t("pages.webdav.appPasswords.revoke") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { notifySuccess } from "@data-app";
import { AppPassword, CreatedAppPassword, useAppPasswordApi } from "@data-app-password";
import { mdiCheckCircle, mdiChevronRight, mdiClose, mdiContentCopy } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, d } = useI18n();
const { getAppPasswords, createAppPassword, deleteAppPassword } = useAppPasswordApi();

useTitle(buildPageTitle(t("pages.webdav.title")));

const systems = ["macos", "windows", "ios", "linux"] as const;
const structureLevels = ["contexts", "context", "board", "column", "card", "folder"] as const;
const webDavUrl = `${window.location.origin}/api/v3/webdav/`;

const appPasswords = ref<AppPassword[]>([]);
const isLoading = ref(true);
const newName = ref("");
const isCreating = ref(false);
const created = ref<CreatedAppPassword>();
const toRevoke = ref<AppPassword>();

const createdFields = computed(() =>
	created.value
		? [
				{ key: "username", label: t("pages.webdav.appPasswords.username"), value: created.value.username },
				{ key: "token", label: t("pages.webdav.appPasswords.password"), value: created.value.token },
			]
		: []
);

const load = async () => {
	appPasswords.value = (await getAppPasswords()) ?? [];
	isLoading.value = false;
};

onMounted(load);

const usageLabel = (appPassword: AppPassword) => {
	const createdAt = t("pages.webdav.appPasswords.createdAt", { date: d(new Date(appPassword.createdAt)) });
	const lastUsed = appPassword.lastUsedAt
		? t("pages.webdav.appPasswords.lastUsedAt", { date: d(new Date(appPassword.lastUsedAt)) })
		: t("pages.webdav.appPasswords.neverUsed");

	return `${createdAt} · ${lastUsed}`;
};

const copy = async (text: string) => {
	await navigator.clipboard.writeText(text);
	notifySuccess(t("pages.webdav.copied"));
};

const onCreate = async () => {
	isCreating.value = true;
	const result = await createAppPassword(newName.value.trim());
	isCreating.value = false;
	if (result) {
		created.value = result;
		newName.value = "";
		await load();
	}
};

const onRevoke = async () => {
	const appPassword = toRevoke.value;
	toRevoke.value = undefined;
	if (appPassword && (await deleteAppPassword(appPassword.id))) {
		if (created.value?.id === appPassword.id) {
			created.value = undefined;
		}
		await load();
	}
};
</script>

<style scoped>
.credential-token :deep(input) {
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	letter-spacing: 0.02em;
}
</style>
