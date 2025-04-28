<script setup>
const props = defineProps({
    rfidData: {
        type: Object,
        default: () => {}
    },
});

</script>

<template>
    <v-card elevation="2">
            <v-card-title>
                <div class="d-flex align-center px-4 mt-1 py-2">
                    <h4 class="text-h4 font-weight-black text-primary">RFID History</h4>
                </div>
            </v-card-title>
            <v-card-text class="mx-3">
                <template v-for="(event, index) in rfidData.rfid_history" :key="index">
                    <div class="d-flex justify-space-between align-start py-3">
                        <div class="d-flex align-start">
                            <div
                                class="d-flex align-center justify-center mr-4 bg-grey-200"
                                style="
                                width: 44px;
                                height: 44px;
                                border-radius: 4px;
                                "
                            >
                                <v-icon
                                    :icon="event.icon"
                                    color="primary-light"
                                    size="24"
                                ></v-icon>
                            </div>
                        <div>
                            <span class="text-h6 font-weight-medium text-grey-800">{{ event.title }}</span>
                            <p class="font-weight-light" v-html="event.event"></p>
                        </div>
                        </div>
                        <div class="text-caption text-secondary mt-1">
                            {{ event.time_diff }}
                        </div>
                    </div>
                </template>
            </v-card-text>
    </v-card>
</template>
