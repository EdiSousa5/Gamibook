<template>
  <article class="ui-card">
    <slot />
  </article>
</template>

<style scoped>
.ui-card {
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  padding: var(--space-400);
  box-shadow: 6px 6px 0 var(--color-shadow);
}
</style>
