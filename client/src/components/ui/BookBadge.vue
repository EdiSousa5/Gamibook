<script setup lang="ts">
import { computed } from 'vue'

export type BookBadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'galaxy'

const props = withDefaults(defineProps<{
  tier: BookBadgeTier
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'sm',
})

const sizeMap: Record<string, number> = { sm: 30, md: 50, lg: 70 }
const badgeWidth = computed(() => sizeMap[props.size] + 'px')

// Prefixo único de ID por instância para evitar colisões de gradientes
const uid = Math.random().toString(36).slice(2, 7)
const id = (name: string) => `${uid}-${name}`
</script>

<template>
  <svg
    class="book-badge"
    viewBox="0 0 100 116"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :style="{ width: badgeWidth, overflow: 'visible', cursor: 'pointer' }"
  >
    <defs>
      <!-- ══════════════ BRONZE ══════════════ -->
      <template v-if="tier === 'bronze'">
        <linearGradient :id="id('rim')" x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%"   stop-color="#E0A034"/>
          <stop offset="42%"  stop-color="#904818"/>
          <stop offset="100%" stop-color="#1C0800"/>
        </linearGradient>
        <linearGradient :id="id('face')" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="#C8781C"/>
          <stop offset="55%"  stop-color="#8C3E0C"/>
          <stop offset="100%" stop-color="#4A1800"/>
        </linearGradient>
        <radialGradient :id="id('hl')" cx="50%" cy="18%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,232,145,0.75)"/>
          <stop offset="100%" stop-color="rgba(255,232,145,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="55%" r="50%">
          <stop offset="55%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.42)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ SILVER ══════════════ -->
      <template v-else-if="tier === 'silver'">
        <linearGradient :id="id('rim')" x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%"   stop-color="#DCECf8"/>
          <stop offset="42%"  stop-color="#7A8EA0"/>
          <stop offset="100%" stop-color="#182838"/>
        </linearGradient>
        <linearGradient :id="id('face')" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="#8AACC2"/>
          <stop offset="55%"  stop-color="#56728A"/>
          <stop offset="100%" stop-color="#243648"/>
        </linearGradient>
        <radialGradient :id="id('hl')" cx="50%" cy="18%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.76)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="55%" r="50%">
          <stop offset="55%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.40)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ GOLD ══════════════ -->
      <template v-else-if="tier === 'gold'">
        <linearGradient :id="id('rim')" x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%"   stop-color="#FFE238"/>
          <stop offset="42%"  stop-color="#CA8010"/>
          <stop offset="100%" stop-color="#3A1000"/>
        </linearGradient>
        <linearGradient :id="id('face')" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="#FFC000"/>
          <stop offset="55%"  stop-color="#CC7400"/>
          <stop offset="100%" stop-color="#6C2C00"/>
        </linearGradient>
        <radialGradient :id="id('hl')" cx="50%" cy="18%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,255,200,0.78)"/>
          <stop offset="100%" stop-color="rgba(255,255,200,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="55%" r="50%">
          <stop offset="55%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.42)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ DIAMOND ══════════════ -->
      <template v-else-if="tier === 'diamond'">
        <linearGradient :id="id('rim')" x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%"   stop-color="#7AEAFF"/>
          <stop offset="42%"  stop-color="#1080C8"/>
          <stop offset="100%" stop-color="#001848"/>
        </linearGradient>
        <linearGradient :id="id('face')" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="#38CCFF"/>
          <stop offset="55%"  stop-color="#0068C8"/>
          <stop offset="100%" stop-color="#002880"/>
        </linearGradient>
        <radialGradient :id="id('hl')" cx="50%" cy="18%" r="50%">
          <stop offset="0%"   stop-color="rgba(195,248,255,0.80)"/>
          <stop offset="100%" stop-color="rgba(195,248,255,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="55%" r="50%">
          <stop offset="55%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.48)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ GALAXY ══════════════ -->
      <template v-else>
        <linearGradient :id="id('rim')" x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%"   stop-color="#E05CFF"/>
          <stop offset="42%"  stop-color="#8012CC"/>
          <stop offset="100%" stop-color="#180028"/>
        </linearGradient>
        <radialGradient :id="id('vig')" cx="50%" cy="58%" r="52%">
          <stop offset="20%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
        </radialGradient>
        <radialGradient :id="id('core')" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="white" stop-opacity="0.95"/>
          <stop offset="15%"  stop-color="rgba(230,180,255,0.8)"/>
          <stop offset="100%" stop-color="rgba(100,0,200,0)"/>
        </radialGradient>
        <linearGradient :id="id('glare')" x1="12%" y1="0%" x2="52%" y2="80%">
          <stop offset="0%"   stop-color="rgba(255,200,255,0.48)"/>
          <stop offset="100%" stop-color="rgba(255,200,255,0)"/>
        </linearGradient>
        <clipPath :id="id('cp')">
          <polygon points="50,12 90,35 90,81 50,104 10,81 10,35"/>
        </clipPath>
        <filter :id="id('nb')" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <filter :id="id('cb')" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
      </template>
    </defs>

    <!-- ══════════════ BRONZE body ══════════════ -->
    <template v-if="tier === 'bronze'">
      <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" :fill="`url(#${id('rim')})`" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('face')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('hl')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('ev')})`"/>
      <line x1="0"  y1="29" x2="50" y2="0"   stroke="rgba(255,205,85,0.60)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="50" y1="0"  x2="100" y2="29"  stroke="rgba(220,165,45,0.30)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10" y1="35" x2="50"  y2="12"  stroke="rgba(255,218,105,0.50)" stroke-width="1"   stroke-linecap="round"/>
      <line x1="10" y1="81" x2="10"  y2="35"  stroke="rgba(0,0,0,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="10" y1="81" x2="50"  y2="104" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-linecap="round"/>
      <line x1="50" y1="104" x2="90" y2="81"  stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-linecap="round"/>
    </template>

    <!-- ══════════════ SILVER body ══════════════ -->
    <template v-else-if="tier === 'silver'">
      <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" :fill="`url(#${id('rim')})`" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('face')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('hl')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('ev')})`"/>
      <line x1="0"  y1="29" x2="50" y2="0"   stroke="rgba(255,255,255,0.65)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="50" y1="0"  x2="100" y2="29"  stroke="rgba(220,238,255,0.30)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10" y1="35" x2="50"  y2="12"  stroke="rgba(255,255,255,0.50)" stroke-width="1"   stroke-linecap="round"/>
      <line x1="10" y1="81" x2="10"  y2="35"  stroke="rgba(0,0,0,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="10" y1="81" x2="50"  y2="104" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-linecap="round"/>
      <line x1="50" y1="104" x2="90" y2="81"  stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-linecap="round"/>
    </template>

    <!-- ══════════════ GOLD body ══════════════ -->
    <template v-else-if="tier === 'gold'">
      <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" :fill="`url(#${id('rim')})`" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('face')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('hl')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('ev')})`"/>
      <line x1="0"  y1="29" x2="50" y2="0"   stroke="rgba(255,250,100,0.65)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="50" y1="0"  x2="100" y2="29"  stroke="rgba(255,222,40,0.30)"  stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10" y1="35" x2="50"  y2="12"  stroke="rgba(255,242,145,0.50)" stroke-width="1"   stroke-linecap="round"/>
      <line x1="10" y1="81" x2="10"  y2="35"  stroke="rgba(0,0,0,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="10" y1="81" x2="50"  y2="104" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-linecap="round"/>
      <line x1="50" y1="104" x2="90" y2="81"  stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-linecap="round"/>
    </template>

    <!-- ══════════════ DIAMOND body ══════════════ -->
    <template v-else-if="tier === 'diamond'">
      <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" :fill="`url(#${id('rim')})`" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('face')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('hl')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('ev')})`"/>
      <line x1="0"  y1="29" x2="50" y2="0"   stroke="rgba(155,242,255,0.65)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="50" y1="0"  x2="100" y2="29"  stroke="rgba(75,202,255,0.30)"  stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10" y1="35" x2="50"  y2="12"  stroke="rgba(178,248,255,0.52)" stroke-width="1"   stroke-linecap="round"/>
      <line x1="10" y1="81" x2="10"  y2="35"  stroke="rgba(0,0,0,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="10" y1="81" x2="50"  y2="104" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-linecap="round"/>
      <line x1="50" y1="104" x2="90" y2="81"  stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-linecap="round"/>
    </template>

    <!-- ══════════════ GALAXY body ══════════════ -->
    <template v-else>
      <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" :fill="`url(#${id('rim')})`" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" fill="#080014"/>

      <g :clip-path="`url(#${id('cp')})`">
        <!-- Background stars -->
        <circle cx="18" cy="42" r="0.6" fill="white" opacity="0.40"/>
        <circle cx="30" cy="26" r="0.5" fill="white" opacity="0.35"/>
        <circle cx="67" cy="24" r="0.7" fill="white" opacity="0.45"/>
        <circle cx="82" cy="42" r="0.5" fill="white" opacity="0.30"/>
        <circle cx="80" cy="70" r="0.6" fill="white" opacity="0.40"/>
        <circle cx="63" cy="90" r="0.5" fill="white" opacity="0.30"/>
        <circle cx="47" cy="17" r="0.5" fill="white" opacity="0.30"/>
        <circle cx="89" cy="57" r="0.6" fill="white" opacity="0.35"/>
        <circle cx="24" cy="70" r="0.4" fill="white" opacity="0.25"/>
        <circle cx="72" cy="79" r="0.5" fill="white" opacity="0.30"/>
        <circle cx="85" cy="74" r="0.5" fill="white" opacity="0.30"/>
        <circle cx="40" cy="30" r="0.4" fill="rgba(220,200,255,1)" opacity="0.35"/>
        <circle cx="15" cy="58" r="0.4" fill="white" opacity="0.25"/>

        <!-- Twinkling stars -->
        <circle cx="26" cy="38" r="1.2" fill="white">
          <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.8s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.2;0.5;1.2" dur="2.8s" begin="0s" repeatCount="indefinite"/>
        </circle>
        <circle cx="76" cy="32" r="1.4" fill="rgba(210,230,255,1)">
          <animate attributeName="opacity" values="0.85;0.1;0.85" dur="3.5s" begin="1.2s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.4;0.5;1.4" dur="3.5s" begin="1.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="20" cy="85" r="1.0" fill="white">
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="4.2s" begin="0.7s" repeatCount="indefinite"/>
        </circle>
        <circle cx="83" cy="82" r="1.2" fill="rgba(220,190,255,1)">
          <animate attributeName="opacity" values="0.9;0.1;0.9" dur="3.1s" begin="2s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.2;0.4;1.2" dur="3.1s" begin="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="52" cy="34" r="1.0" fill="white">
          <animate attributeName="opacity" values="0.75;0.2;0.75" dur="5s" begin="0.3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="37" cy="74" r="0.9" fill="rgba(255,210,255,1)">
          <animate attributeName="opacity" values="0.8;0.1;0.8" dur="3.7s" begin="1.6s" repeatCount="indefinite"/>
        </circle>
        <circle cx="64" cy="50" r="1.1" fill="rgba(180,220,255,1)">
          <animate attributeName="opacity" values="0.7;0.15;0.7" dur="4.6s" begin="0.9s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.1;0.4;1.1" dur="4.6s" begin="0.9s" repeatCount="indefinite"/>
        </circle>

        <!-- Rotating nebula (clockwise) -->
        <g :filter="`url(#${id('nb')})`">
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 50 58" to="360 50 58" dur="12s" repeatCount="indefinite"/>
            <ellipse cx="34" cy="42" rx="32" ry="22" fill="rgba(255,0,140,0.82)"/>
            <ellipse cx="66" cy="73" rx="26" ry="20" fill="rgba(160,0,255,0.78)"/>
          </g>
        </g>
        <!-- Counter-rotating nebula -->
        <g :filter="`url(#${id('nb')})`">
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 50 58" to="-360 50 58" dur="18s" repeatCount="indefinite"/>
            <ellipse cx="66" cy="40" rx="28" ry="18" fill="rgba(80,0,255,0.72)"/>
            <ellipse cx="28" cy="74" rx="24" ry="20" fill="rgba(255,40,180,0.62)"/>
          </g>
        </g>

        <!-- Pulsing core without the white center star -->
        <circle cx="50" cy="58" r="12" :fill="`url(#${id('core')})`" :filter="`url(#${id('cb')})`">
          <animate attributeName="r" values="8;15;8" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite"/>
        </circle>
      </g>

      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('glare')})`"/>
      <polygon points="50,12 90,35 90,81 50,104 10,81 10,35" :fill="`url(#${id('vig')})`"/>

      <!-- Rim bevel lines -->
      <line x1="0"   y1="29"  x2="50"  y2="0"   stroke="rgba(222,162,255,0.62)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="50"  y1="0"   x2="100" y2="29"  stroke="rgba(162,82,255,0.30)"  stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10"  y1="35"  x2="50"  y2="12"  stroke="rgba(220,162,255,0.45)" stroke-width="1"   stroke-linecap="round"/>
      <line x1="10"  y1="81"  x2="10"  y2="35"  stroke="rgba(0,0,0,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="10"  y1="81"  x2="50"  y2="104" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-linecap="round"/>
      <line x1="50"  y1="104" x2="90"  y2="81"  stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-linecap="round"/>
    </template>
  </svg>
</template>

<style scoped>
.book-badge {
  height: auto;
  filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3));
}
</style>