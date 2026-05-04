<script setup lang="ts">
import { computed } from 'vue'

export type BookBadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'galaxy'

const props = withDefaults(defineProps<{
  tier: BookBadgeTier
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'sm',
})

const sizeMap: Record<string, number> = { sm: 36, md: 56, lg: 80 }
const badgeWidth = computed(() => sizeMap[props.size] + 'px')

const uid = Math.random().toString(36).slice(2, 7)
const id = (name: string) => `${uid}-${name}`
</script>

<template>
  <svg
    class="book-badge"
    :class="`book-badge--${tier}`"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :style="{ width: badgeWidth, height: badgeWidth, overflow: 'visible', cursor: 'pointer', display: 'block' }"
  >
    <defs>

      <!-- ══════════════ BRONZE ══════════════
           amber-300 → amber-700 → amber-1000
           Warm copper — earned, grounded
      ══════════════════════════════ -->
      <template v-if="tier === 'bronze'">
        <radialGradient :id="id('rim')" cx="42%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="#ffc29f"/>
          <stop offset="50%"  stop-color="#e8611e"/>
          <stop offset="100%" stop-color="#5e2306"/>
        </radialGradient>
        <radialGradient :id="id('face')" cx="40%" cy="30%" r="72%">
          <stop offset="0%"   stop-color="#ff8a50"/>
          <stop offset="55%"  stop-color="#ba4c15"/>
          <stop offset="100%" stop-color="#3d1200"/>
        </radialGradient>
        <radialGradient :id="id('hl')" cx="34%" cy="24%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,232,210,0.68)"/>
          <stop offset="100%" stop-color="rgba(255,232,210,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="65%" r="55%">
          <stop offset="35%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(30,8,0,0.52)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ SILVER ══════════════
           mirage-100 → mirage-400 → mirage-900
           Cool steel — clean and precise
      ══════════════════════════════ -->
      <template v-else-if="tier === 'silver'">
        <radialGradient :id="id('rim')" cx="42%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="#e6ebed"/>
          <stop offset="50%"  stop-color="#7d8f98"/>
          <stop offset="100%" stop-color="#16232b"/>
        </radialGradient>
        <radialGradient :id="id('face')" cx="40%" cy="30%" r="72%">
          <stop offset="0%"   stop-color="#c9d3d8"/>
          <stop offset="55%"  stop-color="#52656f"/>
          <stop offset="100%" stop-color="#1a262e"/>
        </radialGradient>
        <radialGradient :id="id('hl')" cx="34%" cy="24%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.76)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="65%" r="55%">
          <stop offset="35%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.45)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ GOLD ══════════════
           pumpkin-300 → pumpkin-700 → pumpkin-1000
           Rich warm gold — unmistakably premium
      ══════════════════════════════ -->
      <template v-else-if="tier === 'gold'">
        <radialGradient :id="id('rim')" cx="42%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="#ffd28a"/>
          <stop offset="50%"  stop-color="#e38c35"/>
          <stop offset="100%" stop-color="#5a320c"/>
        </radialGradient>
        <radialGradient :id="id('face')" cx="40%" cy="30%" r="72%">
          <stop offset="0%"   stop-color="#ffbd63"/>
          <stop offset="55%"  stop-color="#b66c24"/>
          <stop offset="100%" stop-color="#3e1e00"/>
        </radialGradient>
        <radialGradient :id="id('hl')" cx="34%" cy="24%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,250,205,0.76)"/>
          <stop offset="100%" stop-color="rgba(255,250,205,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="65%" r="55%">
          <stop offset="35%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(40,12,0,0.52)"/>
        </radialGradient>
      </template>

      <!-- ══════════════ DIAMOND ══════════════
           deep-300 → deep-600 → deep-1000
           GamiBook's signature teal — the pinnacle of the brand
      ══════════════════════════════ -->
      <template v-else-if="tier === 'diamond'">
        <radialGradient :id="id('rim')" cx="42%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="#a7d2cf"/>
          <stop offset="50%"  stop-color="#2e7f7b"/>
          <stop offset="100%" stop-color="#021d20"/>
        </radialGradient>
        <radialGradient :id="id('face')" cx="40%" cy="30%" r="72%">
          <stop offset="0%"   stop-color="#7fb8b4"/>
          <stop offset="55%"  stop-color="#075056"/>
          <stop offset="100%" stop-color="#021d20"/>
        </radialGradient>
        <radialGradient :id="id('hl')" cx="34%" cy="24%" r="50%">
          <stop offset="0%"   stop-color="rgba(203,231,229,0.82)"/>
          <stop offset="100%" stop-color="rgba(203,231,229,0)"/>
        </radialGradient>
        <radialGradient :id="id('ev')" cx="50%" cy="65%" r="55%">
          <stop offset="35%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(2,29,32,0.60)"/>
        </radialGradient>
        <linearGradient :id="id('shim')" x1="18%" y1="18%" x2="82%" y2="82%">
          <stop offset="0%"   stop-color="rgba(168,210,207,0)"/>
          <stop offset="50%"  stop-color="rgba(168,210,207,0.28)"/>
          <stop offset="100%" stop-color="rgba(168,210,207,0)"/>
        </linearGradient>
      </template>

      <!-- ══════════════ GALAXY ══════════════
           Deep teal cosmos + amber nova — brand-native cosmic
      ══════════════════════════════ -->
      <template v-else>
        <radialGradient :id="id('rim')" cx="42%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="#4e9d98"/>
          <stop offset="50%"  stop-color="#053e43"/>
          <stop offset="100%" stop-color="#021d20"/>
        </radialGradient>
        <radialGradient :id="id('core')" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.96)"/>
          <stop offset="18%"  stop-color="rgba(255,210,140,0.82)"/>
          <stop offset="100%" stop-color="rgba(7,80,86,0)"/>
        </radialGradient>
        <radialGradient :id="id('vig')" cx="50%" cy="50%" r="50%">
          <stop offset="38%"  stop-color="transparent"/>
          <stop offset="100%" stop-color="rgba(2,29,32,0.78)"/>
        </radialGradient>
        <linearGradient :id="id('glare')" x1="14%" y1="8%" x2="52%" y2="70%">
          <stop offset="0%"   stop-color="rgba(203,231,229,0.44)"/>
          <stop offset="100%" stop-color="rgba(203,231,229,0)"/>
        </linearGradient>
        <clipPath :id="id('clip')">
          <circle cx="50" cy="50" r="38"/>
        </clipPath>
        <filter :id="id('nb')" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5.5"/>
        </filter>
        <filter :id="id('cb')" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </template>

    </defs>

    <!-- ═══════════════ BRONZE ═══════════════ -->
    <template v-if="tier === 'bronze'">
      <circle cx="50" cy="50" r="48" :fill="`url(#${id('rim')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('face')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('hl')})`"/>
      <g opacity="0.90">
        <path d="M50,34 L27,40 L27,64 L50,60 Z"   fill="rgba(255,232,200,0.88)"/>
        <path d="M50,34 L73,40 L73,64 L50,60 Z"   fill="rgba(255,232,200,0.70)"/>
        <line x1="50" y1="34" x2="50" y2="60" stroke="rgba(255,200,155,0.55)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="31" y1="48" x2="47" y2="45" stroke="rgba(255,210,170,0.50)" stroke-width="1.1" stroke-linecap="round"/>
        <line x1="31" y1="54" x2="47" y2="51" stroke="rgba(255,210,170,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="45" x2="69" y2="48" stroke="rgba(255,210,170,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="51" x2="69" y2="54" stroke="rgba(255,210,170,0.25)" stroke-width="1"   stroke-linecap="round"/>
      </g>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('ev')})`"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
    </template>

    <!-- ═══════════════ SILVER ═══════════════ -->
    <template v-else-if="tier === 'silver'">
      <circle cx="50" cy="50" r="48" :fill="`url(#${id('rim')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('face')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('hl')})`"/>
      <g opacity="0.90">
        <path d="M50,34 L27,40 L27,64 L50,60 Z"   fill="rgba(255,255,255,0.86)"/>
        <path d="M50,34 L73,40 L73,64 L50,60 Z"   fill="rgba(255,255,255,0.68)"/>
        <line x1="50" y1="34" x2="50" y2="60" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="31" y1="48" x2="47" y2="45" stroke="rgba(255,255,255,0.48)" stroke-width="1.1" stroke-linecap="round"/>
        <line x1="31" y1="54" x2="47" y2="51" stroke="rgba(255,255,255,0.32)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="45" x2="69" y2="48" stroke="rgba(255,255,255,0.32)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="51" x2="69" y2="54" stroke="rgba(255,255,255,0.22)" stroke-width="1"   stroke-linecap="round"/>
      </g>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('ev')})`"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
    </template>

    <!-- ═══════════════ GOLD ═══════════════ -->
    <template v-else-if="tier === 'gold'">
      <circle cx="50" cy="50" r="48" :fill="`url(#${id('rim')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('face')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('hl')})`"/>
      <polygon points="50,4.5 51.6,9.2 56.6,9.2 52.7,12.0 54.2,16.7 50,13.8 45.8,16.7 47.3,12.0 43.4,9.2 48.4,9.2"
               fill="rgba(255,248,170,0.80)"/>
      <g opacity="0.90">
        <path d="M50,34 L27,40 L27,64 L50,60 Z"   fill="rgba(255,250,205,0.88)"/>
        <path d="M50,34 L73,40 L73,64 L50,60 Z"   fill="rgba(255,250,205,0.70)"/>
        <line x1="50" y1="34" x2="50" y2="60" stroke="rgba(255,238,165,0.58)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="31" y1="48" x2="47" y2="45" stroke="rgba(255,238,165,0.50)" stroke-width="1.1" stroke-linecap="round"/>
        <line x1="31" y1="54" x2="47" y2="51" stroke="rgba(255,238,165,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="45" x2="69" y2="48" stroke="rgba(255,238,165,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="51" x2="69" y2="54" stroke="rgba(255,238,165,0.24)" stroke-width="1"   stroke-linecap="round"/>
      </g>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('ev')})`"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
    </template>

    <!-- ═══════════════ DIAMOND ═══════════════ -->
    <template v-else-if="tier === 'diamond'">
      <circle cx="50" cy="50" r="48" :fill="`url(#${id('rim')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('face')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('shim')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('hl')})`"/>
      <line x1="50" y1="12" x2="50" y2="88" stroke="rgba(168,210,207,0.16)" stroke-width="0.8"/>
      <line x1="12" y1="50" x2="88" y2="50" stroke="rgba(168,210,207,0.16)" stroke-width="0.8"/>
      <line x1="50" y1="2.5" x2="50" y2="12"  stroke="rgba(203,231,229,0.88)" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="44.5" y1="4.5" x2="47"  y2="11" stroke="rgba(203,231,229,0.52)" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="55.5" y1="4.5" x2="53"  y2="11" stroke="rgba(203,231,229,0.52)" stroke-width="1.1" stroke-linecap="round"/>
      <g opacity="0.90">
        <path d="M50,34 L27,40 L27,64 L50,60 Z"   fill="rgba(203,231,229,0.88)"/>
        <path d="M50,34 L73,40 L73,64 L50,60 Z"   fill="rgba(203,231,229,0.70)"/>
        <line x1="50" y1="34" x2="50" y2="60" stroke="rgba(168,210,207,0.58)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="31" y1="48" x2="47" y2="45" stroke="rgba(168,210,207,0.50)" stroke-width="1.1" stroke-linecap="round"/>
        <line x1="31" y1="54" x2="47" y2="51" stroke="rgba(168,210,207,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="45" x2="69" y2="48" stroke="rgba(168,210,207,0.35)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="51" x2="69" y2="54" stroke="rgba(168,210,207,0.24)" stroke-width="1"   stroke-linecap="round"/>
      </g>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('ev')})`"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(2,29,32,0.14)" stroke-width="1"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(2,29,32,0.08)" stroke-width="1"/>
    </template>

    <!-- ═══════════════ GALAXY ═══════════════ -->
    <template v-else>
      <circle cx="50" cy="50" r="48" :fill="`url(#${id('rim')})`"/>
      <circle cx="50" cy="50" r="38" fill="#020e10"/>

      <g :clip-path="`url(#${id('clip')})`">
        <circle cx="20" cy="35" r="0.5" fill="white" opacity="0.38"/>
        <circle cx="35" cy="22" r="0.5" fill="white" opacity="0.32"/>
        <circle cx="70" cy="20" r="0.6" fill="rgba(203,231,229,1)" opacity="0.45"/>
        <circle cx="80" cy="38" r="0.4" fill="white" opacity="0.28"/>
        <circle cx="78" cy="66" r="0.5" fill="white" opacity="0.35"/>
        <circle cx="60" cy="80" r="0.5" fill="rgba(255,189,99,1)" opacity="0.42"/>
        <circle cx="22" cy="72" r="0.4" fill="white" opacity="0.26"/>
        <circle cx="42" cy="82" r="0.5" fill="rgba(127,184,180,1)" opacity="0.38"/>
        <circle cx="84" cy="56" r="0.5" fill="rgba(203,231,229,1)" opacity="0.40"/>
        <circle cx="28" cy="60" r="0.4" fill="rgba(255,210,140,1)" opacity="0.32"/>
        <circle cx="64" cy="28" r="0.4" fill="white" opacity="0.30"/>

        <circle cx="26" cy="30" r="1.2" fill="white">
          <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.8s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.2;0.4;1.2" dur="2.8s" begin="0s" repeatCount="indefinite"/>
        </circle>
        <circle cx="75" cy="26" r="1.3" fill="rgba(203,231,229,1)">
          <animate attributeName="opacity" values="0.85;0.1;0.85" dur="3.5s" begin="1.2s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.3;0.4;1.3" dur="3.5s" begin="1.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="82" cy="72" r="1.1" fill="rgba(255,189,99,1)">
          <animate attributeName="opacity" values="0.9;0.1;0.9" dur="3.1s" begin="2s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.1;0.3;1.1" dur="3.1s" begin="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="36" cy="78" r="1.0" fill="rgba(127,184,180,1)">
          <animate attributeName="opacity" values="0.80;0.2;0.80" dur="4.2s" begin="0.7s" repeatCount="indefinite"/>
        </circle>
        <circle cx="62" cy="74" r="1.0" fill="rgba(255,210,140,1)">
          <animate attributeName="opacity" values="0.70;0.1;0.70" dur="4.6s" begin="0.9s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.0;0.3;1.0" dur="4.6s" begin="0.9s" repeatCount="indefinite"/>
        </circle>
        <circle cx="18" cy="52" r="0.9" fill="rgba(203,231,229,1)">
          <animate attributeName="opacity" values="0.75;0.15;0.75" dur="5.2s" begin="1.8s" repeatCount="indefinite"/>
        </circle>

        <g :filter="`url(#${id('nb')})`">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              from="0 50 50" to="360 50 50" dur="14s" repeatCount="indefinite"/>
            <ellipse cx="36" cy="38" rx="28" ry="17" fill="rgba(46,127,123,0.90)"/>
            <ellipse cx="64" cy="62" rx="22" ry="15" fill="rgba(7,80,86,0.82)"/>
          </g>
        </g>
        <g :filter="`url(#${id('nb')})`">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              from="0 50 50" to="-360 50 50" dur="20s" repeatCount="indefinite"/>
            <ellipse cx="64" cy="36" rx="24" ry="13" fill="rgba(227,140,53,0.72)"/>
            <ellipse cx="30" cy="64" rx="20" ry="15" fill="rgba(255,170,81,0.60)"/>
          </g>
        </g>

        <circle cx="50" cy="50" r="10" :fill="`url(#${id('core')})`" :filter="`url(#${id('cb')})`">
          <animate attributeName="r" values="7;14;7" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.70;1;0.70" dur="3s" repeatCount="indefinite"/>
        </circle>

        <path d="M50,34 L27,40 L27,64 L50,60 Z"   fill="rgba(203,231,229,0.82)"/>
        <path d="M50,34 L73,40 L73,64 L50,60 Z"   fill="rgba(203,231,229,0.65)"/>
        <line x1="50" y1="34" x2="50" y2="60" stroke="rgba(168,210,207,0.55)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="31" y1="48" x2="47" y2="45" stroke="rgba(203,231,229,0.42)" stroke-width="1.1" stroke-linecap="round"/>
        <line x1="31" y1="54" x2="47" y2="51" stroke="rgba(203,231,229,0.28)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="45" x2="69" y2="48" stroke="rgba(203,231,229,0.28)" stroke-width="1"   stroke-linecap="round"/>
        <line x1="53" y1="51" x2="69" y2="54" stroke="rgba(203,231,229,0.18)" stroke-width="1"   stroke-linecap="round"/>
      </g>

      <circle cx="50" cy="50" r="38" :fill="`url(#${id('glare')})`"/>
      <circle cx="50" cy="50" r="38" :fill="`url(#${id('vig')})`"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(2,29,32,0.18)" stroke-width="1"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(2,29,32,0.08)" stroke-width="1"/>
    </template>

  </svg>
</template>

<style scoped>
.book-badge {
  display: block;
  filter: drop-shadow(0 6px 14px rgba(2, 29, 32, 0.18));
  transition: filter 0.22s ease, transform 0.22s ease;
}

.book-badge:hover {
  transform: translateY(-3px) scale(1.07);
}

.book-badge--bronze:hover  { filter: drop-shadow(0 8px 18px rgba(232, 97, 30,  0.46)); }
.book-badge--silver:hover  { filter: drop-shadow(0 8px 18px rgba(82, 101, 111, 0.40)); }
.book-badge--gold:hover    { filter: drop-shadow(0 8px 20px rgba(227, 140, 53, 0.52)); }
.book-badge--diamond:hover { filter: drop-shadow(0 8px 20px rgba(46, 127, 123, 0.56)); }
.book-badge--galaxy:hover  {
  filter:
    drop-shadow(0 8px 22px rgba(46, 127, 123,  0.56))
    drop-shadow(0 0  28px rgba(255, 170, 81,   0.30));
}
</style>