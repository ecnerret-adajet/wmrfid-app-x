<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';

const categories = ['New Features', 'Enhancements', 'Bug Fixes'];
const categoryIcons = {
	'New Features': 'ri-sparkling-fill',
	Enhancements: 'ri-refresh-line',
	'Bug Fixes': 'ri-tools-fill',
};

const releases = ref([]);
const selectedRelease = ref(null);
const isLoading = ref(false);
const formRef = ref(null); 
const itemFormRef = ref(null);

const toast = ref({
    message: 'Version release created successfully',
    color: 'success',
    show: false
});

// Define your visual rule frameworks 
const rules = {
    required: value => !!value || 'This field is required.',
};

const fetchReleases = async () => {
    isLoading.value = true;
    try {
        const response = await axios.get('/version-releases');
        releases.value = response.data;

        // Automatically highlight the newest or current release row on load
        if (releases.value.length > 0) {
            const currentRelease = releases.value.find(r => r.current);
            selectedRelease.value = currentRelease || releases.value[0];
        }
    } catch (error) {
        console.error('Failed fetching release notes payload details:', error);
    } finally {
        isLoading.value = false;
    }
};

// Trigger data hydration immediately on layout mount lifecycle hooks
onMounted(() => {
    fetchReleases();
});

const search = ref('');
const page = ref(1);
const showVersionDialog = ref(false);
const showItemDialog = ref(false);
const showDeleteDialog = ref(false);
const itemCategory = ref('New Features');
const itemText = ref('');
const newVersion = ref({ version: '', date: '' });

const filteredReleases = computed(() => releases.value.filter(release => release.version.toLowerCase().includes(search.value.toLowerCase())));
const pageSize = 10;
const pageCount = computed(() => Math.max(1, Math.ceil(filteredReleases.value.length / pageSize)));
const paginatedReleases = computed(() => {
	const start = (page.value - 1) * pageSize;

	return filteredReleases.value.slice(start, start + pageSize);
});
const totalUpdates = release => Object.values(release.notes).flat().length;
const formatDate = date => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

watch(search, () => {
	page.value = 1;
});

const selectRelease = release => {
	selectedRelease.value = release;
};

const createLoading = ref(false)

const createVersion = async () => {
	if (!newVersion.value.version || !newVersion.value.date) return;
    createLoading.value = true;
	try {
		
		// Send data to backend endpoint
        const response = await ApiService.post('/version-releases', {
            version: newVersion.value.version.trim(),
			date: newVersion.value.date,
        })
        
        if (response.status === 201) {
            toast.value.message = 'Version release created successfully';
            toast.value.color = 'success';
            toast.value.show = true;
        }
		// If successful, demote previous current releases locally
		releases.value.forEach(release => { release.current = false; });

		// Insert the structured record returned from Laravel directly into your reactive array
		releases.value.unshift(response.data);
		selectedRelease.value = releases.value[0];
		
		// Reset UI components state
		showVersionDialog.value = false;
		newVersion.value = { version: '', date: '' };
	} catch (error) {
		toast.value.message = error?.response?.data?.message || 'Failed to create version';
		toast.value.color = 'error';
		toast.value.show = true;
		console.error('Failed to create version:', error);
		// Optional: bind error messages to a snackbar or validation alert layout
	} finally {
        createLoading.value = false;
    }
};

const addItemLoading = ref(false);
const addItem = async () => {
	// Prevent empty strings or processing without a valid selection header context
	if (!itemText.value.trim() || !selectedRelease.value?.id) return;
    addItemLoading.value = true;

	try {
        const response = await ApiService.post(`/version-releases/${selectedRelease.value.id}/notes`, {
            category: itemCategory.value,
			note: itemText.value.trim(),
        })

        if (response.status === 201) {
            toast.value.message = 'Version release item created successfully';
            toast.value.color = 'success';
            toast.value.show = true;
        }

		// Insert the newly saved raw note string directly into the local reactive notes layout dictionary
		const updatedCategory = response.data.category;
		selectedRelease.value.notes[updatedCategory].push(response.data.note);

		// Reset inputs and close modal container context safely
		itemText.value = '';
		showItemDialog.value = false;
	} catch (error) {
        toast.value.message = error?.response?.data?.message || 'Failed to create an version release item';
		toast.value.color = 'error';
		toast.value.show = true;
		console.error('Failed to add note item over API:', error.response?.data || error);
	} finally {
        addItemLoading.value = false;
    }
};

const deleteRelease = () => {
	const index = releases.value.indexOf(selectedRelease.value);
	if (index >= 0) releases.value.splice(index, 1);
	selectedRelease.value = releases.value[0] || null;
	showDeleteDialog.value = false;
};
</script>

<template>
	<v-main class="release-page">
		<section class="release-banner">
			<v-container max-width="1440" class="py-6 py-md-8">
				<div class="d-flex flex-wrap align-center justify-space-between ga-5">
					<div>
						<h1 class="text-h5 text-md-h4 text-white font-weight-bold">Version Release</h1>
					</div>
					<v-btn color="surface" variant="flat" prepend-icon="ri-add-line" class="text-primary" @click="showVersionDialog = true">Add New Version</v-btn>
				</div>
			</v-container>
		</section>

		<v-container max-width="1440" class="release-content px-4 px-md-6 pb-8">
			<v-row class="release-layout" align="stretch">
				<v-col cols="12" md="4" lg="3" class="release-list-column">
					<v-card border rounded="lg" class="release-list-card h-100">
						<v-card-item class="px-5 pt-5">
							<v-card-title class="text-subtitle-1 font-weight-bold px-0">Version Release</v-card-title>
							<v-card-subtitle class="px-0 mt-1">{{ releases.length }} published versions</v-card-subtitle>
						</v-card-item>
						<v-card-text class="px-4 pt-2">
							<v-text-field v-model="search" label="Search version" prepend-inner-icon="ri-search-line" variant="outlined" density="compact" hide-details clearable class="mb-3" />
							<v-list class="release-list pa-0" lines="one">
								<v-list-item v-for="release in paginatedReleases" :key="release.version" :active="selectedRelease === release" rounded="lg" class="release-item mb-1" @click="selectRelease(release)">
									<template #prepend><v-icon icon="ri-diamond-fill" :color="selectedRelease === release ? 'primary' : 'secondary'" size="20" /></template>
									<v-list-item-title class="text-body-2 font-weight-medium">Vsn {{ release.version }}</v-list-item-title>
									<template #append>
										<v-chip v-if="release.current" size="x-small" color="primary" variant="tonal" class="mr-1">New</v-chip>
										<v-btn icon="ri-delete-bin-line" color="error" variant="text" size="x-small" aria-label="Delete version" @click.stop="selectedRelease = release; showDeleteDialog = true" />
									</template>
								</v-list-item>
								<v-list-item v-if="!filteredReleases.length" class="text-medium-emphasis">No versions found.</v-list-item>
							</v-list>
						</v-card-text>
						<v-divider />
						<v-card-actions class="px-4 py-3">
							<span class="text-caption text-medium-emphasis text-no-wrap">{{ Math.min((page - 1) * pageSize + 1, filteredReleases.length) }}-{{ Math.min(page * pageSize, filteredReleases.length) }} of {{ filteredReleases.length }} records</span>
						</v-card-actions>
						<v-card-actions class="px-4 pt-0 pb-4">
							<v-pagination v-model="page" :length="pageCount" :total-visible="5" density="compact" rounded="lg" active-color="primary" />
						</v-card-actions>
					</v-card>
				</v-col>

				<v-col cols="12" md="8" lg="9">
					<v-card v-if="selectedRelease" border rounded="lg" class="release-detail-card h-100">
						<v-card-item class="px-5 px-md-8 pt-6">
							<template #prepend><v-avatar color="primary" variant="tonal" rounded="lg" size="42"><v-icon icon="ri-git-branch-line" /></v-avatar></template>
							<v-card-title class="text-subtitle-1 font-weight-bold">Vsn {{ selectedRelease.version }}</v-card-title>
							<v-card-subtitle class="mt-1">Release Date: {{ formatDate(selectedRelease.date) }}</v-card-subtitle>
							<template #append><v-chip v-if="selectedRelease.current" color="primary" variant="tonal" prepend-icon="ri-check-line">Current</v-chip></template>
						</v-card-item>
						<v-card-text class="px-5 px-md-8 pb-8">
							<div class="release-meta d-flex flex-wrap align-center ga-2 mt-4 mb-5">
								<v-chip size="small" color="primary" variant="tonal">{{ totalUpdates(selectedRelease) }} total updates</v-chip>
								<span class="text-caption text-medium-emphasis">Last updated {{ formatDate(selectedRelease.date) }}</span>
							</div>
							<div v-for="category in categories" :key="category" class="release-category">
								<div class="d-flex align-center justify-space-between py-3 category-heading">
									<div class="d-flex align-center ga-2 text-body-2 font-weight-medium"><v-icon :icon="categoryIcons[category]" color="primary" size="18" />{{ category }}<v-chip size="x-small" color="secondary" variant="tonal">{{ selectedRelease.notes[category].length }}</v-chip></div>
									<v-btn variant="text" size="small" color="primary" prepend-icon="ri-add-line" @click="itemCategory = category; showItemDialog = true">Add Item</v-btn>
								</div>
								<v-divider />
								<v-list v-if="selectedRelease.notes[category].length" class="pa-0" density="compact">
									<v-list-item v-for="(note, index) in selectedRelease.notes[category]" :key="`${category}-${index}`" :title="note" prepend-icon="ri-checkbox-blank-circle-line" class="px-1" />
								</v-list>
								<div v-else class="text-caption text-medium-emphasis py-3 px-2">No changes in this category.</div>
							</div>
						</v-card-text>
					</v-card>
					<v-card v-else border rounded="lg" class="h-100 d-flex align-center justify-center pa-8"><div class="text-center text-medium-emphasis"><v-icon icon="ri-file-document-line" size="48" class="mb-3" /><div>Select a version to see its release notes.</div></div></v-card>
				</v-col>
			</v-row>
		</v-container>

		<v-dialog v-model="showVersionDialog" max-width="480">
			<v-card rounded="lg"><v-card-title class="pa-6 pb-2">Add New Version</v-card-title>
                <v-form ref="formRef" @submit.prevent="createVersion">
                    <v-card-text class="pa-6">
                        <v-text-field v-model="newVersion.version" label="Version number" placeholder="26.xxx.xx" variant="outlined" class="mb-3" autofocus />
                        <v-text-field v-model="newVersion.date" label="Release date" type="date" variant="outlined" :rules="[rules.required]" />
                    </v-card-text>
                    <v-card-actions class="px-6 pb-6"><v-spacer />
                        <v-btn color="secondary"  @click="showVersionDialog = false">Cancel</v-btn>
                        <v-btn color="primary" variant="flat" type="submit" :loading="createLoading">Create Version</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card>
		</v-dialog>

		<v-dialog v-model="showItemDialog" max-width="520">
			<v-card rounded="lg">
                <v-card-title class="pa-6 pb-2">Add Release Item</v-card-title>
                <v-form ref="itemFormRef" @submit.prevent="addItem">
                    <v-card-text class="pa-6">
                        <v-select v-model="itemCategory" :items="categories" label="Category" variant="outlined" class="mb-3" />
                        <v-textarea v-model="itemText" label="Description" variant="outlined" rows="3" autofocus />
                    </v-card-text>
                    <v-card-actions class="px-6 pb-6">
                        <v-spacer />
                        <v-btn variant="text" @click="showItemDialog = false">Cancel</v-btn>
                        <v-btn color="primary" variant="flat"  type="submit" :loading="addItemLoading">Add Item</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card>
		</v-dialog>

		<v-dialog v-model="showDeleteDialog" max-width="420">
			<v-card rounded="lg"><v-card-title class="pa-6 pb-2">Delete Version?</v-card-title><v-card-text class="px-6">This will remove version {{ selectedRelease?.version }} and its release notes.</v-card-text><v-card-actions class="px-6 pb-6"><v-spacer /><v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn><v-btn color="error" @click="deleteRelease">Delete Version</v-btn></v-card-actions></v-card>
		</v-dialog>
	</v-main>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
    <Loader :show="isLoading" />

</template>

<style scoped>
.release-page {
	min-height: 100%;
	background: rgb(var(--v-theme-background));
}

.release-banner {
	background: linear-gradient(115deg, rgb(var(--v-theme-primary-darken-1)) 0%, rgb(var(--v-theme-primary)) 56%, rgb(var(--v-theme-primary-light)) 100%);
}

.release-content {
	margin-top: -1px;
}

.release-list-card,
.release-detail-card,
.feedback-card {
	background: rgb(var(--v-theme-surface));
}

.release-list-card {
	min-height: 540px;
}

.release-detail-card {
	min-height: 540px;
}

.release-item :deep(.v-list-item__overlay) {
	border-left: 3px solid rgb(var(--v-theme-primary));
}

.release-item :deep(.v-list-item__content) {
	min-width: 0;
}

.release-item :deep(.v-list-item-title) {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.release-list {
	max-height: 372px;
	overflow-y: auto;
}

.release-category + .release-category {
	margin-top: 14px;
}

.category-heading {
	min-height: 44px;
}

.feedback-card a {
	text-decoration: none;
	font-weight: 600;
}

@media (max-width: 600px) {
	.release-list-card,
	.release-detail-card {
		min-height: auto;
	}

	.release-list {
		max-height: 330px;
	}
}
</style>
