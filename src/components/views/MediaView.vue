<template>
  <div class="MediaContainer">
    <!-- Title -->
    <h1 class="media-title">Media</h1>

    <!-- Social Icons -->
    <div v-if="socials && socials.length" class="social-icons">
      <a
        v-for="(icon, index) in socials"
        :key="index"
        :href="icon.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img :src="icon.icon" :alt="icon.name" />
      </a>
    </div>

    <!-- Media Carousel -->
    <div class="carousel-wrapper" ref="carousel" @mousedown="startDrag" @mouseup="stopDrag" @mouseleave="stopDrag" @mousemove="dragMove" @touchstart="startDrag" @touchend="stopDrag" @touchmove="dragMove">
      <div class="carousel" :style="{ transform: `translateX(${currentTranslate}px)` }">
        <div v-for="(item, index) in infiniteMedia" :key="index" class="carousel-item">
          <video v-if="item.type === 'video'" :src="item.src" controls muted></video>
          <img v-else :src="item.src" alt="Media" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";

export default {
  name: "MediaView",
  props: {
    media: { type: Array, required: true },
    socials: { type: Array, default: () => [] }
  },
  setup(props) {
    const carousel = ref(null);
    const isDragging = ref(false);
    const startX = ref(0);
    const currentTranslate = ref(0);
    const prevTranslate = ref(0);

    const infiniteMedia = computed(() => [...props.media, ...props.media]);

    const startDrag = (e) => {
      isDragging.value = true;
      startX.value = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
    };

    const stopDrag = () => {
      isDragging.value = false;
      prevTranslate.value = currentTranslate.value;
    };

    const dragMove = (e) => {
      if (!isDragging.value) return;
      const x = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
      const delta = x - startX.value;
      currentTranslate.value = prevTranslate.value + delta;

      const width = carousel.value.scrollWidth / 2;
      if (currentTranslate.value > 0) {
        currentTranslate.value = -width;
        prevTranslate.value = -width;
      } else if (currentTranslate.value < -width) {
        currentTranslate.value = 0;
        prevTranslate.value = 0;
      }
    };

    return { carousel, infiniteMedia, currentTranslate, startDrag, stopDrag, dragMove };
  }
};
</script>

<style scoped>
.MediaContainer { padding: 20px; max-width: 300px; margin: 0 auto;background: #f8f8f8;}
.media-title { font-size: 2rem; text-align: center; margin-bottom: 10px; }
.social-icons { display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; }
.social-icons img { width: 30px; height: 30px; object-fit: contain; }
.carousel-wrapper { overflow: hidden; cursor: grab; user-select: none; position: relative; }
.carousel-wrapper:active { cursor: grabbing; }
.carousel { display: flex; transition: transform 0.2s ease; }
.carousel-item { min-width: 300px; margin-right: 15px; flex-shrink: 0; }
.carousel-item img, .carousel-item video { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
</style>