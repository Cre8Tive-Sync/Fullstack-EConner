<template>
   
  
  <div class="landing-container">

     <!-- Buttons -->
    <div class="button-group">
      
      <button class="btn map-btn" @click="showMap = true">
        🗺 Maps
      </button>
    </div>

    <!-- MapButton Modal -->
    <MapButton v-if="showMap" @close="showMap = false" />

    <!-- Description Section (Clickable) -->
    <div class="description-section" @click="toggleDescription">
    
      <!-- Location Name -->
      <h1 class="location-title">{{ location.name }}</h1>
     
        <!-- Category -->
      <div class="category-section">
        <span 
          v-for="(cat, index) in location.categories" 
          :key="index" 
          class="category-tag">
          {{ cat }}
        </span>
      </div>

    <!-- Description -->
    <p class="location-description">
      {{ showFull ? location.description : shortDescription }}
    </p>

      <!-- Small Hint Text -->
      <small class="hint-text">Tap anywhere here to {{ showFull ? "collapse" : "read more" }}</small>

    </div>
    <!-- MediaView Container -->
    <div class="MediaContainer">
      <MediaView :media="media" :socials="socials" />
    </div>
  </div>
  
</template>

<script>
import MapButton from "./MapButton.vue"
import MediaView from "./MediaView.vue" // ✅ Import MediaView component

export default {
  components: { 
    MapButton,
    MediaView  // ✅ Register MediaView here
  },

  data() {
    return {
      showFull: false,
      showMap: false,
      showReviews: false,
      // ✅ Location data for LocationView
      location: {
        name: "Rizal Park",
        categories: ["Tourist Spot", "Park"], // ✅ MUST be array
        description: "Rizal Park, also known as Luneta Park, is a historical urban park located in Manila. It is one of the largest urban parks in Asia and a famous tourist attraction where people visit for leisure, sightseeing, and historical learning.",
      },

      // ✅ Media array for MediaView
      media: [
        { type: "image", src: "/media/rizal1.jpg" },
        { type: "image", src: "/media/rizal2.jpg" },
        { type: "video", src: "/media/rizal-tour.mp4" },
        { type: "image", src: "/media/rizal3.jpg" }
      ],

      // ✅ Social links for MediaView
      socials: [
        { name: "Facebook", url: "https://facebook.com/rizalpark", icon: "/icons/facebook.png" },
        { name: "Instagram", url: "https://instagram.com/rizalpark", icon: "/icons/instagram.png" },
        { name: "Twitter", url: "https://twitter.com/rizalpark", icon: "/icons/twitter.png" }
      ]
    }
  },

  computed: {
    shortDescription() {
      return this.location.description.substring(0, 120) + "..."
    }
  },

  methods: {
    toggleDescription() {
      this.showFull = !this.showFull
    }
  }
}
</script>


<style scoped>
.landing-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  max-width: 1000px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.location-title {
  font-size: 32px;
  margin-bottom: 5px; /* smaller gap so categories are closer */
}
.category-section {
  margin-top: 10px;
  margin-bottom: 15px;
}

.category-tag {
  display: inline-block;
  background: #e3f2fd;   /* light blue background */
  color: #3498db;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  margin-right: 8px;
  margin-top: 5px;
}
.button-group {
  margin-bottom: 20px;
}
.btn {
  display: flex;
  flex-direction: column; /* 🔥 makes it vertical */
  gap: 10px;
  width: 150px;
  padding: 10px 18px;
  margin: 5px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.review-btn { background: #f39c12; color: white; }
.map-btn { background: #3498db; color: white; }

/* Description Section */
.description-section {
  width: 350px;
  text-align: left;
  padding: 15px;
  background: #f8f8f8;
  border-radius: 10px;
  cursor: pointer;   /* Whole div is clickable */
  transition: background 0.3s;
}
.description-section:hover {
  background: #e0e0e0;
}
.hint-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #888;
}

</style>