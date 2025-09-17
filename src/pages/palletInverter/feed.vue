<script setup>
import palletInverter from '@images/pallet-inverter.png';
import { ref } from 'vue';

const rotationAngle = ref(0);

const confirmLoading = ref(false);
const confirm = () => {
    // This simulates the inverter process
    rotationAngle.value -= 180;
};

</script>
<template>
  <v-container class="d-flex fill-height justify-center align-center flex-column">
    
    <v-btn class="mb-5" @click="confirm">
        Confirm
    </v-btn>

    <div class="inverter-animation-container">
      
        <v-card class="box box-top" elevation="0" outlined>
            <div class="box-content">
                <v-row no-gutters >
                    <v-col cols="6" class="text-left"><span class="font-weight-bold">Batch:</span> Batch1</v-col>
                    <v-col cols="6" class="text-right"><span class="font-weight-bold">Pallet #:</span> PALLET_MNL2022_0134</v-col>
                </v-row>
                <v-row no-gutters>
                    <v-col cols="6" class="text-left"><span class="font-weight-bold">Mfg Date:</span> Sept. 1, 2025</v-col>
                    <v-col cols="6" class="text-right"><span class="font-weight-bold">Quantity:</span> 60 bags</v-col>
                </v-row>
            </div>
        </v-card>

      <div class="image-wrapper" :style="{ transform: `rotate(${rotationAngle}deg)` }">
          <img class="mx-auto" :src="palletInverter" alt="Pallet Inverter" width="700" />
      </div>

      <v-card class="box box-bottom"  elevation="0" outlined>
            <div class="box-content">
                <v-row no-gutters >
                    <v-col cols="6" class="text-left"><span class="font-weight-bold">Batch:</span> Batch1</v-col>
                    <v-col cols="6" class="text-right"><span class="font-weight-bold">Pallet #:</span> PALLET_MNL2022_0134</v-col>
                </v-row>
                <v-row no-gutters>
                    <v-col cols="6" class="text-left"><span class="font-weight-bold">Mfg Date:</span> Sept. 1, 2025</v-col>
                    <v-col cols="6" class="text-right"><span class="font-weight-bold">Quantity:</span> 60 bags</v-col>
                </v-row>
            </div>
      </v-card>
      
    </div>
  </v-container>
</template>

<style scoped>

.inverter-animation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  /* Removed fixed width to allow image-wrapper to determine width */
  max-width: 70vw; /* Responsive width */
}

.image-wrapper {
  position: relative;
  z-index: 1;
  
  /* Set a transition for smooth animation */
  transition: transform 1s ease-in-out;
  
  /* Ensure rotation is centered */
  transform-origin: center center;
}

.box {
  width: 100%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #ccc;
}

.box-content {
  width: 100%;
  padding: 4px 8px; 
}

.box-top {
  margin-bottom: -55px;
}

.box-bottom {
  margin-top: -70px;
}
</style>
