<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeIcon, ArrowLeftIcon, BookOpenIcon, TrophyIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="card">
      <div class="code-block" aria-hidden="true">
        <span class="code">404</span>
      </div>
      <div class="content">
        <h1>Página não encontrada</h1>
        <p>O endereço que tentaste aceder não existe ou foi removido.</p>
        <div class="actions">
          <button class="btn-back" @click="router.back()">
            <ArrowLeftIcon class="icon" aria-hidden="true" />
            Voltar
          </button>
          <button class="btn-home" @click="router.push('/app')">
            <HomeIcon class="icon" aria-hidden="true" />
            Ir para o início
          </button>
        </div>
        <div class="quick-links">
          <span class="quick-links__label">Ou vai para:</span>
          <div class="quick-links__row">
            <RouterLink class="quick-link" to="/collection">
              <BookOpenIcon class="quick-link__icon" aria-hidden="true" />
              Coleção
            </RouterLink>
            <RouterLink class="quick-link" to="/leaderboard">
              <TrophyIcon class="quick-link__icon" aria-hidden="true" />
              Rankings
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-500);
  background: var(--bg-app);
  background-size: var(--bg-size);
  animation: var(--bg-animation);
  background-attachment: fixed;
}

.card {
  display: flex;
  align-items: center;
  gap: var(--space-600);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-700) var(--space-700);
  max-width: 680px;
  width: 100%;
}

.code-block {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.code {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 900;
  color: var(--color-brand-white);
  line-height: 1;
  letter-spacing: -2px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.2;
}

p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.btn-back,
.btn-home {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  padding: var(--space-200) var(--space-400);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-base);
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.btn-back {
  background: var(--color-wild-200);
  color: var(--color-mirage-700);
}

.btn-home {
  background: var(--color-deep-600);
  color: var(--color-brand-white);
  border-color: var(--color-deep-700);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.btn-back:hover  { background: var(--color-wild-300); }
.btn-home:hover  { background: var(--color-deep-700); }

.btn-back:active,
.btn-home:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.icon {
  width: 16px;
  height: 16px;
  stroke-width: var(--icon-stroke);
  flex-shrink: 0;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding-top: var(--space-300);
  border-top: 2px solid var(--color-wild-300);
}

.quick-links__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-mirage-400);
}

.quick-links__row {
  display: flex;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.quick-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  padding: var(--space-150) var(--space-300);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-700);
  text-decoration: none;
  box-shadow: 2px 2px 0 var(--color-shadow);
  transition: background 0.1s ease, transform 0.1s ease, box-shadow 0.1s ease;
}

.quick-link:hover { background: var(--color-wild-300); }

.quick-link:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--color-shadow);
}

.quick-link__icon {
  width: 14px;
  height: 14px;
  stroke-width: var(--icon-stroke);
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-600) var(--space-500);
    gap: var(--space-400);
  }

  .actions {
    justify-content: center;
  }
}
</style>
