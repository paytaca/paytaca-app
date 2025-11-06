<template>
  <div v-if="loading || lessons.length > 0" class="learn-carousel-container text-bow" :class="getDarkModeClass(darkMode)">
    <div class="row items-center justify-between q-mb-sm">
      <div class="q-ml-lg button button-text-primary" style="font-size: 20px;">
        {{ $t('Learn') }}
      </div>
      <q-btn
        v-if="!loading && lessons.length > 0"
        flat
        dense
        no-caps
        :label="$t('See All')"
        :color="darkMode ? 'blue-4' : 'blue-6'"
        @click="openLearnApp"
        padding="4px 8px"
        class="q-mr-md see-all-btn"
      />
    </div>
    
    <!-- Skeleton Loading State -->
    <div v-if="loading" class="row no-wrap q-pl-lg q-mb-lg no-scrollbar lessons-container">
      <div
        v-for="n in 5"
        :key="`skeleton-${n}`"
        class="lesson-card pt-card"
        :class="darkMode ? 'dark' : 'light'"
        :style="{ 'margin-left': n === 1 ? '0px' : '12px' }"
      >
        <q-skeleton
          type="rect"
          height="128px"
          width="128px"
          class="lesson-media-skeleton"
          :class="darkMode ? 'dark' : 'light'"
        />
        <q-skeleton type="text" width="90%" height="18px" class="q-mt-sm" />
        <q-skeleton type="text" width="100%" height="14px" class="q-mt-xs" />
        <q-skeleton type="text" width="80%" height="14px" class="q-mt-xs" />
        <q-skeleton type="text" width="60%" height="12px" class="q-mt-sm" />
      </div>
    </div>

    <!-- Actual Lessons -->
    <div v-else-if="lessons.length > 0" class="row no-wrap q-pl-lg q-mb-lg no-scrollbar lessons-container">
      <div
        v-for="(lesson, index) in lessons"
        :key="lesson.id"
        class="lesson-card pt-card"
        :class="darkMode ? 'dark' : 'light'"
        :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
        @click="openLesson(lesson)"
      >
        <div class="lesson-media" :class="darkMode ? 'dark' : 'light'">
          <img
            v-if="getLessonImage(lesson)"
            :src="getLessonImage(lesson)"
            alt="lesson image"
            class="lesson-img"
            loading="lazy"
          />
          <div v-else class="lesson-fallback" :style="{ background: lesson.gradient }">
            <div class="lesson-icon">{{ lesson.icon }}</div>
          </div>
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const LEARN_API_URL = 'https://learn.paytaca.com/api/lessons'
const CACHE_KEY = 'paytaca_learn_lessons'
const CACHE_DURATION = 1000 * 60 * 60 * 4 // 4 hours

export default {
  name: 'LearnLessonsCarousel',
  data() {
    return {
      lessons: [],
      loading: true // Start with loading true to show skeletons on initial mount
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    getLessonImage(lesson) {
      // Prefer explicit image fields; fallback to thumbnail or cover
      return lesson?.image || lesson?.thumbnail || lesson?.cover || ''
    },
    async fetchLessons(forceRefresh = false) {
      // Don't show loading if we're refreshing in background (already have lessons)
      const isBackgroundRefresh = this.lessons.length > 0
      
      if (!isBackgroundRefresh) {
        this.loading = true
      }
      
      try {
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
          const cached = this.getCachedLessons()
          if (cached) {
            this.lessons = cached
            if (!isBackgroundRefresh) {
              this.loading = false
            }
            // If background refresh, continue to fetch fresh data
            if (isBackgroundRefresh) {
              // Still fetch fresh data in background
            } else {
              return
            }
          }
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
        
        // Only try expired cache if we don't already have lessons
        if (this.lessons.length === 0) {
          const cached = this.getCachedLessons(true)
          if (cached) {
            this.lessons = cached
          } else {
            // If CORS error or network error, silently hide the section
            // The component will be hidden via v-if when lessons.length === 0
            this.lessons = []
          }
        }
        // If we already have lessons (background refresh), just keep them
      } finally {
        if (!isBackgroundRefresh) {
          this.loading = false
        }
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
    // Always start with loading state to show skeletons
    this.loading = true
    
    // Check cache
    const cached = this.getCachedLessons()
    const minSkeletonDelay = 800 // Minimum delay to show skeleton (ms)
    
    if (cached && cached.length > 0) {
      // If cache exists, show it after minimum delay to ensure skeleton is visible
      setTimeout(() => {
        this.lessons = cached
        this.loading = false
      }, minSkeletonDelay)
      
      // Fetch fresh data in background to update cache
      setTimeout(() => {
        this.fetchLessons(true) // Force refresh to get latest data
      }, 500)
    } else {
      // No cache - keep loading state and fetch
      setTimeout(() => {
        this.fetchLessons(false)
      }, 500)
    }
  }
}
</script>

<style lang="scss" scoped>
.learn-carousel-container {
  margin-top: 20px;
  margin-bottom: 100px; // Add space for footer menu (67px height + 16px bottom + extra padding)
}

.see-all-btn {
  font-size: 14px !important;
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

.lesson-media {
  width: 128px;
  height: 128px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.lesson-media.dark { background: rgba(255,255,255,0.06); }
.lesson-media.light { background: rgba(0,0,0,0.04); }

.lesson-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lesson-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.lesson-icon {
  font-size: 36px;
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

.lesson-media-skeleton {
  border-radius: 12px;
  margin-bottom: 12px;
}
.lesson-media-skeleton.dark { background: rgba(255,255,255,0.06); }
.lesson-media-skeleton.light { background: rgba(0,0,0,0.04); }
</style>

