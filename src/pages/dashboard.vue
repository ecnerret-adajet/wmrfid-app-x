<script setup>

import InventoryAgeChart from '@/components/dashboard/InventoryAgeChart.vue';
import WarehouseUtilization from '@/components/dashboard/WarehouseUtilization.vue';

</script>

<template>
    <!-- TOP KPI  -->
    <VRow class="match-height ml-1">
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-barcode-box-line"
                    color="primary"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Total Inventory Items
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                    1,500
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>


        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-home-gear-line"
                    color="primary-light"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Today's Production
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                    680
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-box-1-line"
                    color="secondary"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Today's Batches
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                    680
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-truck-line"
                    color="info"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Pending Shipments
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                    680
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
    
    </VRow>

    <!-- middle section -->
    <VRow class="match-height ml-1">
        <VCol
            cols="12"
            sm="12"
            md="6"
        >
            <WarehouseUtilization />
        </VCol>
        <VCol
            cols="12"
            sm="12"
            md="6"
        >
            <InventoryAgeChart />
        </VCol>
    
    
    </VRow>

    <v-card class="mx-4 mt-4" elevation="2">
        <v-card-title class="text-h5 font-weight-bold mt-4 mx-4">
            Recent Production Runs
        </v-card-title>
        <v-card-text>
            <RecentProductionRuns />
        </v-card-text>
    </v-card>
</template>
