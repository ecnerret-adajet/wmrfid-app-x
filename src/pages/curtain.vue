<script setup>
import Loader from '@/components/Loader.vue';
import { echo } from '@/utils/echo';
import palletsImage from '@images/curtains/pallets.png';
import Moment from 'moment';
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const isLoading = ref(false);
const reader = route.params.reader;
const bay = route.params.bay;
const hasError = ref(false);
const errorMessage = ref(null);
const logs = ref([])
const lastRead = ref(null);

onMounted(() => {
    // fetchLoadingCurtain();
    echo.channel('picklist-logs')
        .listen('PicklistLogsEvent', onPicklistLogsEvent);
})

const onPicklistLogsEvent = (data) => {
    console.log(data);
    if (data.picklistLog.error == true) {
        errorMessage.value = data.picklistLog.message || 'An unexpected error occurred.';
        hasError.value = true;
    } else if (data.picklistLog) {
        const epc = data.picklistLog.epc;
        // Only add if epc does not exist
        if (!logs.value.some(log => log.epc === epc)) {
            logs.value.unshift(data.picklistLog);
            if (logs.value.length > 5) {
                logs.value.pop();
            }
            lastRead.value = logs.value[0] || null;
        }
    } else {
        errorMessage.value = 'An unexpected error occurred.';
        hasError.value = true;
    }

};

const fetchLoadingCurtain = async () => {
    // isLoading.value = true
    // const url = `loading-curtain/${reader}/${bay}`;
    // try {
    //     const response = await ApiService.get(url);
    //     const { last_read, loading_curtain } = response.data;
    //     console.log(last_read)
    //     console.log(loading_curtain)

    //     logs.value = loading_curtain;
    //     lastRead.value = last_read;
    //     isLoading.value = false
    // } catch (error) {
    //     isLoading.value = false
    //     errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
    //     hasError.value = true
    //     console.error('Error fetching data:', error);
    // }
};

watch(
    () => hasError.value,
    (val) => {
        if (val) {
            setTimeout(() => {
                hasError.value = false
            }, 30000)
        }
    }
)


</script>
<template>
    <div class="background-container">
        <div class="d-flex justify-end" style="position: relative;">
            <!-- Latest Pallet Label -->
            <div class="position-absolute" style="z-index: 9; left: 50px; top: 90px;">
                <span class="text-h1 font-weight-black text-grey-700">Latest Pallet </span>
                <span class="text-h1 font-weight-black text-primary-2">(Bay {{ bay }})</span>
            </div>

            <!-- Image -->
            <img style="position: absolute; z-index: 1; margin-right: 150px; top: -30px" :src="palletsImage"
                :width="230" :height="230" />

            <!-- v-sheet background -->
            <v-sheet style="position: absolute !important;" :height="150" color="primary-2" :width="230"></v-sheet>
        </div>



        <div style="padding-top: 175px;" class="px-12">
            <VRow no-gutters>
                <VCol md="3" style="font-size: 22px; background-color: #329b62;"
                    class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                    Physical ID
                </VCol>
                <VCol md="3" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100"
                    style="background-color: #329b62; font-size: 22px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                    epc
                </VCol>
                <VCol md="3" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100"
                    style="background-color: #329b62; font-size: 22px; border-right: 1px solid #fff;">
                    Batch
                </VCol>
                <VCol md="3" style="font-size: 22px; background-color: #329b62"
                    class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                    date and time
                </VCol>
            </VRow>
            <div>
                <VRow v-if="lastRead" no-gutters style="border: 1px solid #00833c;">
                    <VCol md="3" class="px-3 py-2 text-center d-flex justify-center align-center rightBorderedGreen">
                        <div class="text-center">
                            <span v-if="lastRead?.name === 'unregistered'"
                                class="text-uppercase text-h4 text-error font-weight-black">
                                {{ lastRead?.name }}
                            </span>
                            <span v-else class="text-uppercase text-h4 text-primary font-weight-black">
                                {{ lastRead?.name || '' }}
                            </span>
                        </div>
                    </VCol>
                    <VCol md="3" class="px-3 text-center rightBorderedGreen d-flex justify-center align-center"
                        style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                        <span class="font-weight-black text-h4">{{ lastRead?.epc }}</span>
                    </VCol>
                    <VCol md="3" class="px-3 py-1 text-center rightBorderedGreen d-flex justify-center align-center"
                        style="border-right: 1px solid #fff;">
                        <span v-if="lastRead?.inventory" class="font-weight-black text-h4">{{ lastRead?.inventory?.batch
                        }}</span>
                        <span v-else class="font-weight-black text-error text-h4">NO BATCH</span>
                    </VCol>
                    <VCol md="3" class="px-3 py-1 text-center rightBorderedGreen d-flex justify-center align-center">
                        <div class="text-center">
                            <div v-if="lastRead?.name === 'unregistered'">
                                <span class="text-uppercase text-h4 font-weight-black">
                                    {{ lastRead?.created_at ?
                                        Moment(lastRead?.created_at).format('MMMM D, YYYY') : '' }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-semibold text-h5">
                                    {{ lastRead?.created_at ?
                                        Moment(lastRead?.created_at).format('h:mm A') : '' }}
                                </p>
                            </div>
                            <div v-else>
                                <span class="text-uppercase text-h4 font-weight-black">
                                    {{ lastRead?.antenna_log?.created_at ?
                                        Moment(lastRead.antenna_log?.created_at).format('MMMM D, YYYY') : '' }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-semibold text-h5">
                                    {{ lastRead?.antenna_log?.created_at ?
                                        Moment(lastRead?.antenna_log?.created_at).format('h:mm A') : '' }}
                                </p>
                            </div>
                        </div>
                    </VCol>
                </VRow>
                <VRow v-else no-gutters style="border: 1px solid #00833c;">
                    <VCol cols="12" class="px-3 py-4 text-center d-flex justify-center align-center rightBorderedGreen">
                        <div class="text-center">
                            <span class="text-uppercase text-h5 text-primary font-weight-black">
                                No Pallet Found
                            </span>
                        </div>
                    </VCol>
                </VRow>

            </div>
        </div>

        <div class="px-12 mt-8 pb-4">
            <span class="text-h1 font-weight-black text-grey-700">Recent </span>
            <span class="text-h1 font-weight-black text-primary-2">Pallet Logs</span>
        </div>

        <div class="px-12">
            <VRow no-gutters>
                <VCol md="3" style="font-size: 22px; background-color: #329b62;"
                    class="text-uppercase text-grey-100 py-2 text-center font-weight-black">
                    Physical ID
                </VCol>
                <VCol md="3" class="text-uppercase text-grey-100 py-2 text-center font-weight-black"
                    style="background-color: #329b62; font-size: 22px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                    epc
                </VCol>
                <VCol md="3" class="text-uppercase text-grey-100 py-2 text-center font-weight-black"
                    style="background-color: #329b62; font-size: 22px; border-right: 1px solid #fff;">
                    Batch
                </VCol>
                <VCol md="3" style="font-size: 22px; background-color: #329b62;"
                    class="text-uppercase text-grey-100 py-2 text-center font-weight-black">
                    date and time
                </VCol>
            </VRow>
            <div class="table-wrapper">

                <!-- Loop Row  -->
                <VRow v-for="(log, index) in logs" :key="index" no-gutters style="border: 1px solid #00833c;">
                    <VCol md="3" class="py-2 text-center d-flex justify-center align-center rightBorderedGreen">
                        <div class="text-center">
                            <span v-if="log?.name === 'unregistered'"
                                class="text-uppercase text-h4 text-error font-weight-black">
                                {{ log?.name }}
                            </span>
                            <span v-else class="text-uppercase text-h4 text-primary font-weight-black">
                                {{ log?.name || '' }}
                            </span>
                        </div>
                    </VCol>
                    <VCol md="3" class="text-center rightBorderedGreen d-flex justify-center align-center"
                        style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                        <span class="font-weight-black text-h4">{{ log?.epc || '' }}</span>
                    </VCol>
                    <VCol md="3" class="py-1 text-center rightBorderedGreen d-flex justify-center align-center"
                        style="border-right: 1px solid #fff;">
                        <span v-if="log.inventory" class="font-weight-black text-h4">{{ log.inventory?.batch }}</span>
                        <span v-else class="font-weight-black text-error text-h4">NO BATCH</span>
                    </VCol>
                    <VCol md="3" class="py-1 text-center rightBorderedGreen d-flex justify-center align-center">
                        <div class="text-center">
                            <div v-if="log?.name === 'unregistered'">
                                <span class="text-uppercase text-h4 font-weight-black">
                                    {{ log?.created_at ?
                                        Moment(log?.created_at).format('MMMM D, YYYY') : '' }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-semibold text-h5">
                                    {{ log?.created_at ?
                                        Moment(log?.created_at).format('h:mm A') : '' }}
                                </p>
                            </div>
                            <div v-else>
                                <span class="text-uppercase text-h4 font-weight-black">
                                    {{
                                        log.antenna_log?.created_at ?
                                            Moment(log.antenna_log?.created_at).format('MMMM D, YYYY') :
                                            ''
                                    }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-semibold text-h5">
                                    {{ log.antenna_log?.created_at ?
                                        Moment(log.antenna_log?.created_at).format('h:mm A') : ''
                                    }}
                                </p>
                            </div>
                        </div>
                    </VCol>
                </VRow>
            </div>
        </div>
    </div>
    <v-dialog v-model="hasError" max-width="800" transition="dialog-bottom-transition">
        <v-card class="pa-4 rounded-lg">
            <v-card-title class="d-flex justify-center align-center pb-0">
                <v-icon color="error" size="40" class="mr-2" icon="ri-error-warning-line"></v-icon>
                <span class="text-h3 font-weight-bold text-error">Loading Curtain Error</span>
            </v-card-title>
            <v-card-text class="mt-4 text-center">
                <p class="text-h4 font-weight-medium" style="word-break: break-word;">{{ errorMessage }}</p>
            </v-card-text>
            <v-card-actions class="justify-center mt-2">
                <v-btn color="error" variant="flat" class="px-8" rounded @click="hasError = false">
                    Okay
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
    <Loader :show="isLoading" />
</template>

<style scoped>
.background-container {
    width: 100%;
    height: 100vh;
    background-size: cover;
    background-position: center;
    background-image: url('@images/curtains/lines.png');
}

.table-wrapper {
    overflow-x: hidden;
    /* Enable horizontal scroll */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* Smooth scrolling for iOS devices */
}

.rightBorderedGreen {
    border-right: 1px solid rgba(0, 131, 60, 0.5) !important;
}

.whiteBackground {
    background-color: white !important;
}
</style>
