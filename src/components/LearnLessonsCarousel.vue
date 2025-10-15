<template>
  <div v-if="lessons.length > 0" class="learn-carousel-container">
    <div class="row items-center justify-between q-mb-sm">
      <div class="q-ml-lg button button-text-primary" style="font-size: 20px;">
        {{ $t('Learn') }}
      </div>
      <q-btn
        flat
        dense
        no-caps
        :label="$t('See All')"
        :color="darkMode ? 'blue-4' : 'blue-6'"
        @click="openLearnApp"
        size="sm"
        padding="4px 8px"
        class="q-mr-md"
      />
    </div>
    
    <div class="row no-wrap q-pl-lg q-mb-lg no-scrollbar lessons-container">
      <div
        v-for="(lesson, index) in lessons"
        :key="lesson.id"
        class="lesson-card pt-card"
        :class="darkMode ? 'dark' : 'light'"
        :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
        @click="openLesson(lesson)"
      >
        <div class="lesson-icon-wrapper" :style="{ background: lesson.gradient }">
          <div class="lesson-icon">{{ lesson.icon }}</div>
        </div>
        <div class="lesson-title">{{ lesson.title }}</div>
        <div class="lesson-description" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
          {{ lesson.description }}
        </div>
        <div class="lesson-category" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
          {{ lesson.category }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const LEARN_API_URL = 'https://learn.paytaca.com/api/lessons'
const CACHE_KEY = 'paytaca_learn_lessons'
const CACHE_DURATION = 1000 * 60 * 60 * 4 // 4 hours

export default {
  name: 'LearnLessonsCarousel',
  data() {
    return {
      lessons: [],
      loading: false
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    async fetchLessons() {
      if (this.loading) return
      
      this.loading = true
      
      try {
        // Check cache first
        const cached = this.getCachedLessons()
        if (cached) {
          this.lessons = cached
          this.loading = false
          return
        }

        // Fetch from API
        const response = await axios.get(LEARN_API_URL, {
          timeout: 10000
        })

        if (response.data && response.data.lessons) {
          this.lessons = response.data.lessons.slice(0, 10) // Show max 10 lessons
          this.cacheLessons(this.lessons)
        }
      } catch (error) {
        console.error('Error fetching learn lessons:', error)
        
        // Try cached data even if expired
        const cached = this.getCachedLessons(true)
        if (cached) {
          this.lessons = cached
        } else {
          // If CORS error or network error, silently hide the section
          // The component will be hidden via v-if when lessons.length === 0
          this.lessons = []
        }
      } finally {
        this.loading = false
      }
    },
    getCachedLessons(ignoreExpiry = false) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (!cached) return null

        const { data, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp

        if (!ignoreExpiry && age > CACHE_DURATION) {
          return null
        }

        return data
      } catch (error) {
        console.error('Error reading lessons cache:', error)
        return null
      }
    },
    cacheLessons(data) {
      try {
        const cacheData = {
          data,
          timestamp: Date.now()
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      } catch (error) {
        console.error('Error caching lessons:', error)
      }
    },
    openLesson(lesson) {
      // Navigate to Learn app with lesson URL
      // lesson.url is a path like "/learn/what-is-bch"
      this.$router.push({
        name: 'app-learn',
        query: { url: lesson.url }
      })
    },
    openLearnApp() {
      this.$router.push({ name: 'app-learn' })
    }
  },
  mounted() {
    // Fetch lessons with a slight delay to not block critical page loading
    setTimeout(() => {
      this.fetchLessons()
    }, 500)
  }
}
</script>

<style lang="scss" scoped>
.learn-carousel-container {
  margin-top: 20px;
}

.lessons-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding-right: 20px;
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.lesson-card {
  min-width: 160px;
  max-width: 160px;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:active {
    transform: scale(0.96);
  }
}

.lesson-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.lesson-icon {
  font-size: 24px;
  line-height: 1;
}

.lesson-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.3;
  min-height: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lesson-description {
  font-size: 11px;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lesson-category {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}
</style>

