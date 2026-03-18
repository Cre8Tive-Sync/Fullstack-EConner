<template>
  <div class="modal" v-if="true">

    <div class="modal-content">
      <h1>Location Name</h1>
      <!-- Close Button -->
      <button class="close-btn" @click="$emit('close')">✖</button>

      <!-- Full Map View -->
      <iframe
        :src="mapURL"
        width="100%"
        height="450"
        style="border:0;"
        loading="lazy">
      </iframe>

    </div>
  </div>
</template>

<script>
export default {
  name: "MapButton",
  props: { keyword: { type: String, default: "hospital near me" } },
  computed: {
    mapURL() {
      return `https://www.google.com/maps?q=${this.keyword}&output=embed`
    }
  }
}
</script>

<style scoped>
/* Floating Modal Background */
.modal {
  position: fixed;                 /* Stay on top */
  top: 50%;                        /* Center vertically */
  left: 50%;                       /* Center horizontally */
  width: 50%;                       /* 50% of viewport width */
  height: 50%;                      /* 50% of viewport height */
  transform: translate(-50%, -50%); /* Move it back by half width & height */    /* Semi-transparent overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;                    
}
/* Modal Box */
.modal-content {
  background: white;
  width: 90%;
  max-width: 800px;
  padding: 20px;
  border-radius: 10px;
  position: relative;
}

/* Close Button */
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: red;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
}
</style>