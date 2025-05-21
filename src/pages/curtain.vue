<script setup>
import Loader from '@/components/Loader.vue';
import ApiService from '@/services/ApiService';
import palletsImage from '@images/curtains/pallets.png';
import Moment from 'moment';
import { onMounted } from 'vue';
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
    fetchLoadingCurtain();
})

const fetchLoadingCurtain = async () => {
    isLoading.value = true
    const url = `loading-curtain/${reader}/${bay}`;
    try {
        const response = await ApiService.get(url);
        const { last_read, loading_curtain } = response.data;

        logs.value = loading_curtain;
        lastRead.value = last_read;
        isLoading.value = false
    } catch (error) {
        isLoading.value = false
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        hasError.value = true
        console.error('Error fetching data:', error);
    }
};


</script>
<template>
    <div class="background-container">
        <div class="d-flex justify-end" style="position: relative;">
            <!-- Latest Pallet Label -->
            <div class="position-absolute" style="z-index: 9; left: 50px; top: 90px;">
                <span class="text-h1 font-weight-black text-grey-700">Latest Pallet </span>
                <span class="text-h1 font-weight-black text-primary-2">(Bay 1)</span>
            </div>

            <!-- Image -->
            <img
                style="position: absolute; z-index: 1; margin-right: 150px; top: -30px"
                :src="palletsImage"
                :width="230"
                :height="230"
            />

            <!-- v-sheet background -->
            <v-sheet
                style="position: absolute !important;"
                :height="150"
                color="primary-2"
                :width="230"
            ></v-sheet>
        </div>



        <div style="padding-top: 175px;" class="px-12">
            <VRow no-gutters >
                <VCol md="3" style="font-size: 18px; background-color: #329b62;" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                    Physical ID
                </VCol>
                <VCol md="3"  class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100" style="background-color: #329b62; font-size: 18px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                    epc
                </VCol>
                <VCol md="3"  class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100" style="background-color: #329b62; font-size: 18px; border-right: 1px solid #fff;">
                    Batch
                </VCol>
                <VCol md="3" style="font-size: 18px; background-color: #329b62" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                    date and time
                </VCol>
            </VRow>
            <div>
                <VRow v-if="lastRead" no-gutters style="border: 1px solid #00833c;">
                    <VCol md="3" class="px-3 py-2 text-center d-flex justify-center align-center rightBorderedGreen">
                        <div class="text-center">
                            <span  class="text-uppercase text-h5 text-primary font-weight-black">
                                {{ lastRead?.rfid?.name }}
                            </span>
                        </div>
                    </VCol>
                    <VCol md="3" class="px-3 text-center rightBorderedGreen d-flex justify-center align-center" style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                        <span class="font-weight-black">{{ lastRead?.rfid?.epc }}</span>
                    </VCol>
                    <VCol md="3" class="px-3 py-1 text-center rightBorderedGreen d-flex justify-center align-center" style="border-right: 1px solid #fff;">
                        <span class="font-weight-black">{{ lastRead?.rfid?.inventory?.batch }}</span>
                    </VCol>
                    <VCol md="3" class="px-3 py-1 text-center rightBorderedGreen d-flex justify-center align-center">
                        <div class="text-center">
                            <div>
                                <span class="text-uppercase text-h5 font-weight-bold">
                                     {{ lastRead?.first_seen_timestamp ? Moment(lastRead.first_seen_timestamp).format('MMMM D, YYYY') : '' }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-bold">
                                    {{ lastRead?.first_seen_timestamp ? Moment(lastRead.first_seen_timestamp).format('h:mm A') : '' }}
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
            <VRow no-gutters >
                <VCol md="3" style="font-size: 18px; background-color: #329b62;" class="text-uppercase text-grey-100 py-2 text-center font-weight-black">
                    Physical ID
                </VCol>
                <VCol md="3"  class="text-uppercase text-grey-100 py-2 text-center font-weight-black" style="background-color: #329b62; font-size: 18px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                    epc
                </VCol>
                <VCol md="3"  class="text-uppercase text-grey-100 py-2 text-center font-weight-black" style="background-color: #329b62; font-size: 18px; border-right: 1px solid #fff;">
                    Batch
                </VCol>
                <VCol md="3" style="font-size: 18px; background-color: #329b62;" class="text-uppercase text-grey-100 py-2 text-center font-weight-black">
                    date and time
                </VCol>
            </VRow>
            <div class="table-wrapper" style="height: 350px;">

                <!-- Loop Row  -->
                <VRow v-for="(log, index) in logs" :key="index" no-gutters style="border: 1px solid #00833c;">
                    <VCol md="3" class="py-2 text-center d-flex justify-center align-center rightBorderedGreen">
                        <div class="text-center">
                            <span class="text-uppercase text-h5 text-primary font-weight-black">
                                {{ log.rfid?.name || '' }}
                            </span>
                        </div>
                    </VCol>
                    <VCol md="3" class="text-center rightBorderedGreen d-flex justify-center align-center" style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                        <span class="font-weight-black">{{ log.rfid?.epc || '' }}</span>
                    </VCol>
                    <VCol md="3" class="py-1 text-center rightBorderedGreen d-flex justify-center align-center" style="border-right: 1px solid #fff;">
                        <span class="font-weight-black">{{ log.rfid?.inventory?.batch }}</span>
                    </VCol>
                    <VCol md="3" class="py-1 text-center rightBorderedGreen d-flex justify-center align-center">
                        <div class="text-center">
                            <div>
                                <span class="text-uppercase text-h5 font-weight-bold">
                                    {{ log.first_seen_timestamp ? Moment(log.first_seen_timestamp).format('MMMM D, YYYY') : '' }}
                                </span>
                                <br>
                                <p style="margin-bottom: 0px !important;" class="font-weight-bold">
                                    {{ log.first_seen_timestamp ? Moment(log.first_seen_timestamp).format('h:mm A') : '' }}
                                </p>
                            </div>
                        </div>
                    </VCol>
                </VRow>
            </div>
        </div>
  </div>
  <v-dialog v-model="hasError" max-width="550">
        <v-card class="px-4 py-4">
            <v-card-title>Loading Curtain Error</v-card-title>
            <v-card-text class="mt-4">
                <p class="text-h4 font-weight-bold">{{ errorMessage }}</p>
            </v-card-text>
            <v-card-actions>
                <v-btn color="primary" class="px-8" text variant="outlined" @click="hasError = false">Okay</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
  <Loader :show="isLoading"/>
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
    overflow-x: hidden; /* Enable horizontal scroll */
    overflow-y: auto; 
    -webkit-overflow-scrolling: touch; /* Smooth scrolling for iOS devices */
}

.rightBorderedGreen{
    border-right: 1px solid rgba(0, 131, 60, 0.5) !important;
}
.whiteBackground{
    background-color: white !important;
}

</style>
