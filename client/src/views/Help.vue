<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import HelpFaq from '@/components/help/HelpFaq.vue'
import {
  BookOpenIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
  KeyIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ListBulletIcon,
} from '@heroicons/vue/24/outline'

const features = [
  {
    icon: BookOpenIcon,
    title: 'Livros & Módulos',
    desc: 'A tua coleção organizada em módulos. Cada módulo tem exercícios que deves completar para avançar. O progresso é guardado automaticamente.',
    to: '/collection',
    cta: 'Ver coleção',
    chip: 'Coleção',
  },
  {
    icon: CalendarDaysIcon,
    title: 'Exercício Diário',
    desc: 'Uma pergunta especial por dia, associada aos teus livros. Responder diariamente mantém a sequência de estudo e dá XP extra.',
    to: '/daily-exercise',
    cta: 'Fazer hoje',
    chip: 'Diário',
  },
  {
    icon: TrophyIcon,
    title: 'Badges',
    desc: 'Cada livro tem uma badge que evolui com o teu progresso: Bronze, Prata, Ouro, Diamante e Galáxia. Completa módulos para subir de nível.',
    to: '/collection',
    cta: 'Ver coleção',
    chip: 'Conquistas',
  },
  {
    icon: ChartBarIcon,
    title: 'Rankings',
    desc: 'Compara o teu desempenho com outros leitores no ranking global por XP total acumulado. Atualiza em tempo real.',
    to: '/leaderboard',
    cta: 'Ver ranking',
    chip: 'Competição',
  },
  {
    icon: StarIcon,
    title: 'XP & Níveis',
    desc: 'Acumulas XP a cada resposta correta: 30 XP na 1.ª tentativa, 15 XP na 2.ª. Completar o Quiz Final com sucesso dá um bónus de 200 XP. Cada nível é progressivamente mais exigente.',
    to: '/app',
    cta: 'Ver dashboard',
    chip: 'Progressão',
  },
  {
    icon: KeyIcon,
    title: 'Código de Ativação',
    desc: 'Insere o código presente na tua fatura de compra para adicionar o livro à tua coleção digital. Usa o ícone de livro na barra superior.',
    to: null,
    cta: null,
    chip: 'Desbloqueio',
  },
]

const exerciseTypes = [
  {
    icon: ListBulletIcon,
    label: 'Escolha Múltipla',
    desc: 'Escolhe a resposta correta entre quatro opções. O formato mais comum na plataforma.',
  },
  {
    icon: CheckCircleIcon,
    label: 'Verdadeiro ou Falso',
    desc: 'Avalia se uma afirmação está correta ou incorreta. Simples mas eficaz para testar conceitos.',
  },
]


const faqCategories = [
  {
    title: 'Progresso e Pontuação',
    faqs: [
      {
        q: 'Como funciona o sistema de XP e níveis?',
        a: 'Ganhas XP ao responderes corretamente a exercícios de módulos e perguntas diárias. O valor de XP varia com o tipo de exercício e o número de tentativas — responder à primeira tentativa dá mais pontos. À medida que acumulas XP, o teu nível sobe automaticamente, sendo cada nível progressivamente mais exigente.',
      },
      {
        q: 'Como são calculados os pontos de XP por exercício?',
        a: 'Responder corretamente à primeira tentativa dá 30 XP (mais 15 XP de bónus se mantiveres uma sequência de acertos consecutivos). Na segunda tentativa recebes 15 XP. Exercícios já respondidos corretamente anteriormente não voltam a dar XP. O exercício diário segue as mesmas regras. Completar o Quiz Final com sucesso atribui um bónus de 200 XP.',
      },
      {
        q: 'Como funcionam as badges de livro e quais os níveis?',
        a: 'Cada livro tem uma badge própria com cinco níveis: Bronze, Prata, Ouro, Diamante e Galáxia. A badge avança à medida que completas módulos e atinges os objetivos definidos. Podes ver o estado das tuas badges na página da tua coleção, em cada livro.',
      },
      {
        q: 'Como funciona o ranking e quem aparece?',
        a: 'O ranking ordena todos os utilizadores da plataforma por XP total acumulado. Podes ver o pódio dos três primeiros e a tua posição na tabela completa. O ranking atualiza em tempo real à medida que respondes a exercícios.',
      },
      {
        q: 'O que acontece se perder um dia de Exercício Diário?',
        a: 'A tua streak (sequência) diária volta a zero. Tenta responder todos os dias para manteres o bónus extra de streak!',
      }
    ]
  },
  {
    title: 'Livros e Coleção',
    faqs: [
      {
        q: 'Como desbloqueio novos livros?',
        a: 'Os livros são desbloqueados com um código de ativação único fornecido na fatura de compra. Clica no ícone de livro na barra superior, insere o código e clica em "Ativar livro". O livro é adicionado imediatamente à tua coleção. Se tiveres dificuldade, contacta o teu administrador.',
      },
      {
        q: 'O que fazer se o código de ativação não for aceite?',
        a: 'Verifica se copiaste o código exatamente como aparece na fatura, incluindo os hífens. Os códigos têm o formato XXXX-XXXX-XXXX (letras maiúsculas e números). Se o problema persistir, o código pode já ter sido utilizado ou pode estar incorreto — contacta o administrador da tua instituição.',
      },
      {
        q: 'Os módulos têm uma ordem obrigatória?',
        a: 'Sim, os módulos de cada livro seguem uma ordem definida pelo conteúdo. Deves completar os exercícios de um módulo antes de avançar para o seguinte. O número mínimo de exercícios aprovados por módulo é definido pelo administrador do livro.',
      },
      {
        q: 'Posso remover um livro da minha coleção?',
        a: 'Atualmente, os livros adicionados permanecem na tua coleção para manteres em segurança o histórico do teu progresso e pontuações.',
      }
    ]
  },
  {
    title: 'Exercícios e Testes',
    faqs: [
      {
        q: 'O que são as perguntas diárias e quando aparecem?',
        a: 'As perguntas diárias são exercícios especiais associados aos livros da tua coleção que podes responder uma vez por dia. Aparecem na secção "Exercício Diário" da barra lateral. A pergunta muda todos os dias à meia-noite. Responder diariamente mantém o teu progresso ativo e dá XP extra.',
      },
      {
        q: 'O que é o Quiz Final e como o desbloquear?',
        a: 'O Quiz Final é desbloqueado automaticamente quando completares todos os módulos de um livro (badge Diamante). É composto por 10 perguntas de todo o conteúdo do livro e precisas de acertar 8 ou mais para passar. Ao completares com sucesso: conquistas o badge Galaxy e recebes um bónus de 200 XP. Em caso de falha, podes tentar novamente após 24 horas.',
      },
      {
        q: 'O que acontece se responder incorretamente?',
        a: 'Podes tentar novamente. Para exercícios de verdadeiro/falso tens apenas 1 tentativa; para os restantes tens 2 tentativas. A primeira tentativa correta dá XP máximo — se acertares na segunda tentativa, o XP é reduzido. Se esgotares as tentativas, o exercício fica registado como errado e não dá XP.',
      },
      {
        q: 'Posso ver o meu histórico de exercícios?',
        a: 'No dashboard podes ver o teu progresso geral, XP total acumulado e nível atual. Em cada módulo, o estado de cada exercício (correto, tentativas, pontos ganhos) é mostrado na lista de exercícios aprovados.',
      },
      {
        q: 'Posso repetir um módulo já concluído?',
        a: 'Sim! Podes usar o Modo Estudo para rever todos os exercícios de um livro sem afetar a tua pontuação ou estatísticas. Encontra-o na página do livro.',
      }
    ]
  },
  {
    title: 'Conta e Perfil',
    faqs: [
      {
        q: 'Posso alterar o meu perfil, avatar e nome?',
        a: 'Sim. Acede a Definições > Dados de utilizador para atualizar o teu nome, fotografia de perfil e outras informações. As alterações ficam visíveis de imediato na barra superior, no ranking e no dashboard.',
      },
      {
        q: 'Como funcionam as notificações?',
        a: 'O ícone de sino no topo da plataforma avisa-te de novos eventos, como a conquista de uma nova badge, subida de nível ou a adição de um livro novo à tua coleção.',
      },
      {
        q: 'Esqueci-me da minha palavra-passe, o que devo fazer?',
        a: 'Contacta o administrador da tua instituição. Eles têm acesso a um painel de gestão onde podem rapidamente efetuar a reposição da tua password.',
      }
    ]
  }
]

const selectedCategory = ref<string>('Todos')

const categoryOptions = computed(() => [
  { label: 'Todos', value: 'Todos' },
  ...faqCategories.map(c => ({
    label: c.title,
    value: c.title
  }))
])

const filteredFaqCategories = computed(() => {
  if (selectedCategory.value === 'Todos') return faqCategories
  return faqCategories.filter(c => c.title === selectedCategory.value)
})
</script>

<template>
  <section class="help">

    <!-- Hero -->
    <div class="hero" data-tour="help-hero">
      <div class="hero-icon-wrap">
        <QuestionMarkCircleIcon class="hero-icon" aria-hidden="true" />
      </div>
      <div class="hero-text">
        <h1>Centro de Ajuda</h1>
        <p class="hero-sub">
          Tudo o que precisas de saber sobre a GamiBook — desde os primeiros passos até às funcionalidades mais
          avançadas.
        </p>
      </div>
      <div class="hero-chips">
        <UiChip label="Suporte" variant="soft" />
        <UiChip label="FAQ" variant="outline" />
      </div>
    </div>

    <!-- Funcionalidades -->
    <div class="section">
      <div class="section-header">
        <div class="section-label">
          <BookOpenIcon class="section-label-icon" aria-hidden="true" />
          <span>Plataforma</span>
        </div>
        <h2>Como funciona a plataforma</h2>
        <p class="section-sub">As principais áreas da GamiBook e o que podes fazer em cada uma.</p>
      </div>
      <div class="features-grid">
        <UiCard v-for="feat in features" :key="feat.title" class="feature-card">
          <div class="feat-top">
            <div class="feat-icon-wrap">
              <component :is="feat.icon" class="feat-icon" aria-hidden="true" />
            </div>
            <UiChip :label="feat.chip" variant="outline" />
          </div>
          <h3 class="feat-title">{{ feat.title }}</h3>
          <p class="feat-desc">{{ feat.desc }}</p>
          <RouterLink v-if="feat.to && feat.cta" :to="feat.to" class="feat-link">
            {{ feat.cta }}
            <ArrowRightIcon class="feat-link-icon" aria-hidden="true" />
          </RouterLink>
        </UiCard>
      </div>
    </div>

    <!-- Tipos de exercício -->
    <div class="section">
      <div class="section-header">
        <div class="section-label">
          <ClockIcon class="section-label-icon" aria-hidden="true" />
          <span>Exercícios</span>
        </div>
        <h2>Tipos de exercício</h2>
        <p class="section-sub">A plataforma suporta dois formatos de exercício, gerados por IA a partir do conteúdo
          dos livros.</p>
      </div>
      <div class="exercise-types-grid">
        <div v-for="et in exerciseTypes" :key="et.label" class="exercise-type-card">
          <div class="et-icon-wrap">
            <component :is="et.icon" class="et-icon" aria-hidden="true" />
          </div>
          <div class="et-body">
            <h3 class="et-title">{{ et.label }}</h3>
            <p class="et-desc">{{ et.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="section">
      <div class="section-header">
        <div class="section-label">
          <QuestionMarkCircleIcon class="section-label-icon" aria-hidden="true" />
          <span>Dúvidas</span>
        </div>
        <h2>Perguntas Frequentes</h2>
        <p class="section-sub">Respostas às dúvidas mais comuns sobre a plataforma.</p>
      </div>

      <!-- Filtros de Categorias -->
      <div class="faq-filters">
        <UiSegmented :model-value="selectedCategory" :options="categoryOptions" @update="selectedCategory = $event as string" />
      </div>

      <div class="faq-categories">
        <div v-for="category in filteredFaqCategories" :key="category.title" class="faq-category">
          <!-- Apenas mostrar o título da secção se não houver um filtro selecionado em específico -->
          <h3 class="category-title" v-if="selectedCategory === 'Todos'">{{ category.title }}</h3>
          <HelpFaq :faqs="category.faqs" :prefix="category.title" />
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped>
.help {
  display: flex;
  flex-direction: column;
  gap: var(--space-700);
}

/* ── Hero ── */
.hero {
  display: flex;
  align-items: flex-start;
  gap: var(--space-500);
  padding: var(--space-600);
  border-radius: var(--radius-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-900);
  box-shadow: 6px 6px 0 var(--color-shadow);
  flex-wrap: wrap;
}

.hero-icon-wrap {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-900);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-icon {
  width: 28px;
  height: 28px;
  color: var(--color-wild-100);
  stroke-width: 1.5;
}

.hero-text {
  flex: 1;
  min-width: 220px;
}

.hero-text h1 {
  margin: 0 0 var(--space-200);
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1.1;
  color: var(--color-mirage-900);
}

.hero-sub {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-mirage-600);
  max-width: 560px;
}

.hero-chips {
  display: flex;
  gap: var(--space-200);
  align-items: center;
  align-self: center;
  margin-left: auto;
}

/* ── Section ── */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-500);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  font-size: 12px;
  font-weight: 800;
  color: var(--color-deep-600);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-label-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

.section-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.section-sub {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

/* ── Feature cards ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-400);
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.feat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
}

.feat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-200);
  background: var(--color-deep-100);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feat-icon {
  width: 20px;
  height: 20px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

.feat-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.feat-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-mirage-600);
  flex: 1;
}

.feat-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-deep-600);
  text-decoration: none;
  margin-top: auto;
  transition: gap 0.15s ease;
}

.feat-link:hover {
  gap: 8px;
  color: var(--color-deep-800);
}

.feat-link-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

/* ── Exercise types ── */
.exercise-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-400);
}

.exercise-type-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-400) var(--space-500);
}

.et-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-200);
  background: var(--color-deep-100);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.et-icon {
  width: 18px;
  height: 18px;
  color: var(--color-deep-700);
  stroke-width: 1.75;
}

.et-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.et-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.et-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-mirage-600);
}

/* ── FAQ Categories ── */
.faq-categories {
  display: flex;
  flex-direction: column;
  gap: var(--space-600);
}

.faq-category {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

.category-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-mirage-900);
  border-bottom: 2px dashed var(--color-mirage-200);
  padding-bottom: var(--space-200);
}

/* ── FAQ Filters ── */
.faq-filters {
  display: flex;
  gap: var(--space-200);
  flex-wrap: wrap;
  margin-bottom: var(--space-200);
}

/* ── Responsive ── */
@media (max-width: 53.75em) {
  .hero {
    padding: var(--space-400);
  }

  .hero-text h1 {
    font-size: clamp(1.375rem, 4vw, 1.75rem);
  }

  .features-grid {
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  }

  .section-header h2 {
    font-size: 1.25rem;
  }
}

@media (max-width: 37.5em) {
  .help {
    gap: var(--space-500);
  }

  .hero {
    flex-direction: column;
    gap: var(--space-300);
    padding: var(--space-300);
  }

  .hero-icon-wrap {
    width: 3rem;
    height: 3rem;
  }

  .hero-icon {
    width: 1.375rem;
    height: 1.375rem;
  }

  .hero-text {
    min-width: 0;
  }

  .hero-text h1 {
    font-size: clamp(1.25rem, 5vw, 1.5rem);
  }

  .hero-sub {
    font-size: 0.875rem;
  }

  .hero-chips {
    margin-left: 0;
  }

  .section {
    gap: var(--space-400);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .exercise-types-grid {
    grid-template-columns: 1fr;
  }

  .exercise-type-card {
    padding: var(--space-300);
  }

  /* FAQ filters — scroll horizontal */
  .faq-filters {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: var(--space-100);
    scrollbar-width: none;
  }

  .faq-filters::-webkit-scrollbar { display: none; }

  .category-title {
    font-size: 1rem;
  }
}

@media (max-width: 25em) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
