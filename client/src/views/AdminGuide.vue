<script setup lang="ts">
import { ref } from 'vue'
import {
  BookOpenIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  RectangleStackIcon,
  PencilSquareIcon,
  GlobeAltIcon,
  ShieldExclamationIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/outline'
import UiSegmented from '@/components/ui/UiSegmented.vue'

const activeTab = ref('plataforma')
const openAccordions = ref<Record<string, boolean>>({})

const tabOptions = [
  { label: 'Plataforma GamiBook', value: 'plataforma' },
  { label: 'Directus', value: 'directus' },
]

const toggleAccordion = (key: string) => {
  openAccordions.value[key] = !openAccordions.value[key]
}
</script>

<template>
  <div class="guide-page">

    <header class="page-header">
      <p class="kicker">Manual de utilização</p>
      <h1>Guia para Editoras e Autores</h1>
      <p class="subtitle">
        Tudo o que precisas de saber para gerir os teus livros, criar exercícios com IA e trabalhar com o Directus.
      </p>
    </header>

    <div class="tabs-row">
      <UiSegmented
        :model-value="activeTab"
        :options="tabOptions"
        @update="activeTab = $event"
      />
    </div>

    <!-- ──────────────── TAB: PLATAFORMA ──────────────── -->
    <div v-if="activeTab === 'plataforma'" class="tab-content">

      <section class="info-card info-card--blue">
        <InformationCircleIcon class="info-card__icon" aria-hidden="true" />
        <div class="info-card__body">
          <strong>O que podes fazer na plataforma</strong>
          <p>
            Como editora ou autor tens acesso ao painel de administração, onde podes gerar exercícios com IA,
            rever e aprovar os melhores e gerir o estado de publicação de cada livro.
            O processo está dividido em passos sequenciais, descritos em detalhe abaixo.
          </p>
        </div>
      </section>

      <div class="section-block">
        <div class="section-title">
          <SparklesIcon class="section-title__icon" aria-hidden="true" />
          <h2>Passo a passo: gerar exercícios</h2>
        </div>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-body">
              <h3>Acede ao Gerador de Exercícios</h3>
              <p>No menu lateral, clica em <strong>Gerar exercícios</strong>. Serás levado para o gerador, onde verás todos os livros disponíveis.</p>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-body">
              <h3>Escolhe um livro</h3>
              <p>Usa a pesquisa e os filtros para encontrar o teu livro. Podes filtrar por estado e por editora. Clica no livro para o selecionar.</p>
              <div class="tip-box">
                <strong>Etiquetas do livro</strong>
                <ul>
                  <li><span class="chip filled">Conteúdo completo</span> — todos os módulos têm pelo menos 5 exercícios aprovados.</li>
                  <li><span class="chip outline">Conteúdo em falta</span> — ainda há módulos por completar.</li>
                  <li><span class="chip filled">Publicado no site</span> — os utilizadores já podem ver este livro.</li>
                  <li><span class="chip outline">Não publicado</span> — ainda não está visível para os utilizadores.</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">3</div>
            <div class="step-body">
              <h3>Seleciona os módulos</h3>
              <p>Após escolheres o livro, aparecem os seus módulos. Clica nos módulos que precisam de novos exercícios para os selecionar (ficam destacados). Podes selecionar até <strong>4 módulos de cada vez</strong>.</p>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">4</div>
            <div class="step-body">
              <h3>Configura a geração</h3>
              <p>No painel lateral direito, define quantas perguntas queres por módulo. O sistema ajusta automaticamente o máximo permitido com base no número de módulos selecionados (máximo de <strong>40 perguntas no total</strong> por geração).</p>
              <div class="tip-box">
                <strong>Limite por módulo</strong>
                Cada módulo pode ter no máximo <strong>15 exercícios aprovados</strong>. Módulos que já atingiram esse limite são ignorados na geração.
              </div>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">5</div>
            <div class="step-body">
              <h3>Gera os exercícios</h3>
              <p>Clica em <strong>Gerar Exercícios</strong>. A IA irá criar as perguntas com base no conteúdo dos módulos. O processo pode demorar alguns segundos.</p>
              <div class="warning-box">
                <ExclamationTriangleIcon class="warning-icon" aria-hidden="true" />
                <span>A geração consome da tua quota diária. O limite é de <strong>50 exercícios por dia</strong>.</span>
              </div>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">6</div>
            <div class="step-body">
              <h3>Revê e aprova</h3>
              <p>Cada exercício gerado aparece na secção <em>Exercícios Gerados pela IA</em>. Para cada um, podes:</p>
              <ul class="action-list">
                <li><span class="pill green">Aprovar</span> — guarda o exercício no módulo correspondente.</li>
                <li><span class="pill red">Rejeitar</span> — descarta o exercício sem o guardar.</li>
              </ul>
              <div class="tip-box">
                <strong>Exercícios aprovados</strong>
                São necessários <strong>5 exercícios aprovados</strong> por módulo para o módulo ser considerado completo. Quando todos os módulos estiverem completos, o livro passa a "Conteúdo completo".
              </div>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">7</div>
            <div class="step-body">
              <h3>Solicita a publicação do livro</h3>
              <p>Quando o livro atingir o estado <strong>Conteúdo completo</strong>, está pronto para ser publicado. A publicação é feita pela equipa de administração — contacta-a para que o livro fique visível para os utilizadores.</p>
              <div class="tip-box">
                <strong>Como saber se o livro está pronto</strong>
                No painel lateral do gerador, a etiqueta <strong>Conteúdo mínimo</strong> mostrará "Completo" quando todos os módulos tiverem os exercícios necessários.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">
          <CheckCircleIcon class="section-title__icon" aria-hidden="true" />
          <h2>Regras e limites importantes</h2>
        </div>

        <div class="rules-grid">
          <div class="rule-card">
            <div class="rule-icon-wrap">
              <RectangleStackIcon class="rule-icon" aria-hidden="true" />
            </div>
            <div class="rule-body">
              <h4>Tipos de exercício</h4>
              <p>A IA gera dois tipos de perguntas:</p>
              <ul>
                <li><strong>Escolha múltipla</strong> — 4 opções, 2 tentativas.</li>
                <li><strong>Verdadeiro / Falso</strong> — 1 tentativa.</li>
              </ul>
            </div>
          </div>

          <div class="rule-card">
            <div class="rule-icon-wrap">
              <CheckCircleIcon class="rule-icon" aria-hidden="true" />
            </div>
            <div class="rule-body">
              <h4>Limites por geração</h4>
              <ul>
                <li>Máximo de <strong>4 módulos</strong> de cada vez.</li>
                <li>Máximo de <strong>40 perguntas no total</strong>.</li>
                <li>Máximo de <strong>15 exercícios</strong> por módulo.</li>
              </ul>
            </div>
          </div>

          <div class="rule-card">
            <div class="rule-icon-wrap">
              <SparklesIcon class="rule-icon" aria-hidden="true" />
            </div>
            <div class="rule-body">
              <h4>Quota diária</h4>
              <p>Cada editora/autor tem uma quota de <strong>50 exercícios gerados por dia</strong>. A quota reinicia à meia-noite.</p>
            </div>
          </div>

          <div class="rule-card">
            <div class="rule-icon-wrap">
              <GlobeAltIcon class="rule-icon" aria-hidden="true" />
            </div>
            <div class="rule-body">
              <h4>Condições para publicação</h4>
              <p>Para o livro ficar pronto para o admin publicar:</p>
              <ul>
                <li>Pelo menos um módulo com conteúdo.</li>
                <li>Todos os módulos com <strong>5+ exercícios aprovados</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">
          <BookOpenIcon class="section-title__icon" aria-hidden="true" />
          <h2>Como os utilizadores veem os exercícios</h2>
        </div>

        <section class="info-card info-card--neutral">
          <BookOpenIcon class="info-card__icon" aria-hidden="true" />
          <div class="info-card__body">
            <strong>Fluxo do lado do utilizador</strong>
            <p>
              Quando um utilizador abre um módulo, os exercícios aprovados são apresentados em ordem.
              Cada pergunta tem um limite de <strong>30 segundos</strong>. Pontos são atribuídos apenas em respostas corretas.
              O sistema de badges (Bronze → Prata → Ouro → Diamante → Galaxy) baseia-se na percentagem de módulos concluídos.
              Para o badge Galaxy, o utilizador precisa de concluir todos os módulos e passar o quiz final (10 perguntas aleatórias).
            </p>
          </div>
        </section>
      </div>
    </div>

    <!-- ──────────────── TAB: DIRECTUS ──────────────── -->
    <div v-if="activeTab === 'directus'" class="tab-content">

      <section class="info-card info-card--blue">
        <InformationCircleIcon class="info-card__icon" aria-hidden="true" />
        <div class="info-card__body">
          <strong>O que é o Directus</strong>
          <p>
            O Directus é a base de dados da plataforma GamiBook. É aqui que todos os dados (livros, módulos, exercícios, utilizadores)
            são armazenados e geridos. O acesso é feito no URL fornecido pela equipa técnica.
            Como editora ou autor, tens permissões para ver e editar apenas os dados relevantes para o teu trabalho.
          </p>
        </div>
      </section>

      <div class="section-block">
        <div class="section-title">
          <TableCellsIcon class="section-title__icon" aria-hidden="true" />
          <h2>Tabelas que podes gerir</h2>
        </div>

        <div class="table-cards-grid">

          <!-- books -->
          <div class="table-card table-card--books" :class="{ 'is-open': openAccordions['books'] }">
            <button class="table-card__header" @click="toggleAccordion('books')">
              <div class="table-card__meta">
                <code class="table-name">books</code>
                <div class="table-card__text">
                  <span class="table-card__title">Livros</span>
                  <span class="table-card__subtitle">Criação e configuração</span>
                </div>
              </div>
              <ChevronDownIcon class="table-card__chevron" aria-hidden="true" />
            </button>
            <div class="table-card__wrap" :class="{ 'is-open': openAccordions['books'] }">
              <div class="table-card__body">
                <p class="table-desc">Aqui estão todos os livros da plataforma. Podes criar novos livros e editar os teus.</p>
                <div class="field-list">
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">title</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Título do livro. Aparece em toda a plataforma.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">description</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Descrição longa do livro. Mostrada na página de detalhe do livro.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">cover_img</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Imagem de capa. Faz upload de um ficheiro diretamente no Directus.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">editora</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Relação com a tabela <code>editoras</code>. Define a editora responsável pelo livro.</p>
                  </div>
                  <div class="field-item field-item--caution">
                    <div class="field-item__left">
                      <code class="field-item__name">qr_code</code>
                      <span class="field-status field-status--caution">Cautela</span>
                    </div>
                    <p class="field-item__desc">UUID para desbloquear o livro via QR Code. Gerado e gerido pela administração.</p>
                  </div>
                  <div class="field-item field-item--caution">
                    <div class="field-item__left">
                      <code class="field-item__name">is_approved</code>
                      <span class="field-status field-status--caution">Só leitura</span>
                    </div>
                    <p class="field-item__desc">Gerido exclusivamente pela administração. Indica se o livro está visível para os utilizadores.</p>
                  </div>
                  <div class="field-item field-item--caution">
                    <div class="field-item__left">
                      <code class="field-item__name">has_minimum_content</code>
                      <span class="field-status field-status--caution">Automático</span>
                    </div>
                    <p class="field-item__desc">Calculado automaticamente quando todos os módulos atingem os exercícios mínimos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- modules -->
          <div class="table-card table-card--modules" :class="{ 'is-open': openAccordions['modules'] }">
            <button class="table-card__header" @click="toggleAccordion('modules')">
              <div class="table-card__meta">
                <code class="table-name">modules</code>
                <div class="table-card__text">
                  <span class="table-card__title">Módulos</span>
                  <span class="table-card__subtitle">Capítulos do livro</span>
                </div>
              </div>
              <ChevronDownIcon class="table-card__chevron" aria-hidden="true" />
            </button>
            <div class="table-card__wrap" :class="{ 'is-open': openAccordions['modules'] }">
              <div class="table-card__body">
                <p class="table-desc">Cada livro tem vários módulos. Os exercícios são gerados ao nível do módulo.</p>
                <div class="field-list">
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">module_title</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Título do módulo. Aparece na página do livro e no gerador de exercícios.</p>
                  </div>
                  <div class="field-item field-item--highlight">
                    <div class="field-item__left">
                      <code class="field-item__name">additional_description</code>
                      <span class="field-status field-status--highlight">Essencial para a IA</span>
                    </div>
                    <p class="field-item__desc">A IA usa este campo para gerar exercícios relevantes. Quanto mais detalhado, melhor a qualidade dos exercícios gerados.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">id_book</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Relação com a tabela <code>books</code>. Define a que livro pertence este módulo.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">order_number</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Ordem de apresentação dos módulos no livro (número inteiro).</p>
                  </div>
                  <div class="field-item field-item--caution">
                    <div class="field-item__left">
                      <code class="field-item__name">minimum_exercises</code>
                      <span class="field-status field-status--caution">Automático</span>
                    </div>
                    <p class="field-item__desc">Fica <code>true</code> automaticamente quando o módulo tem 5+ exercícios aprovados.</p>
                  </div>
                </div>
                <div class="info-card info-card--yellow inner-card">
                  <ExclamationTriangleIcon class="info-card__icon" aria-hidden="true" />
                  <div class="info-card__body">
                    <strong>Dica importante</strong>
                    <p>Preenche <code>additional_description</code> com resumos dos temas, conceitos-chave, vocabulário específico e objetivos de aprendizagem do módulo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- exercises -->
          <div class="table-card table-card--exercises" :class="{ 'is-open': openAccordions['exercises'] }">
            <button class="table-card__header" @click="toggleAccordion('exercises')">
              <div class="table-card__meta">
                <code class="table-name">exercises</code>
                <div class="table-card__text">
                  <span class="table-card__title">Exercícios</span>
                  <span class="table-card__subtitle">Gestão manual</span>
                </div>
              </div>
              <ChevronDownIcon class="table-card__chevron" aria-hidden="true" />
            </button>
            <div class="table-card__wrap" :class="{ 'is-open': openAccordions['exercises'] }">
              <div class="table-card__body">
                <p class="table-desc">Contém todos os exercícios aprovados. Normalmente geres pela plataforma, mas aqui podes inspecionar ou corrigir diretamente.</p>
                <div class="field-list">
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">id_module</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Módulo a que o exercício pertence.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">type</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Tipo: <code>multiple-choice</code> ou <code>true-false</code>.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">content</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Objeto JSON com a pergunta e as opções (ver exemplos abaixo).</p>
                  </div>
                  <div class="field-item field-item--caution">
                    <div class="field-item__left">
                      <code class="field-item__name">created_by</code>
                      <span class="field-status field-status--caution">Automático</span>
                    </div>
                    <p class="field-item__desc">ID do utilizador que criou o exercício. Atribuído automaticamente.</p>
                  </div>
                </div>
                <div class="code-examples">
                  <p class="code-label">Exemplo — Escolha múltipla</p>
                  <pre class="code-block">{
  "question": "Qual é a capital de Portugal?",
  "options": ["Lisboa", "Porto", "Coimbra", "Faro"],
  "correct": "Lisboa"
}</pre>
                  <p class="code-label">Exemplo — Verdadeiro / Falso</p>
                  <pre class="code-block">{
  "question": "A fotossíntese ocorre nas mitocôndrias.",
  "correct": false
}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- editoras -->
          <div class="table-card table-card--editoras" :class="{ 'is-open': openAccordions['editoras'] }">
            <button class="table-card__header" @click="toggleAccordion('editoras')">
              <div class="table-card__meta">
                <code class="table-name">editoras</code>
                <div class="table-card__text">
                  <span class="table-card__title">Editoras</span>
                  <span class="table-card__subtitle">Dados da tua organização</span>
                </div>
              </div>
              <ChevronDownIcon class="table-card__chevron" aria-hidden="true" />
            </button>
            <div class="table-card__wrap" :class="{ 'is-open': openAccordions['editoras'] }">
              <div class="table-card__body">
                <p class="table-desc">Contém as editoras registadas. Os teus livros estão associados a um registo nesta tabela.</p>
                <div class="field-list">
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">nome_editora</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Nome da editora. Aparece nos cartões dos livros e nos filtros do gerador.</p>
                  </div>
                  <div class="field-item field-item--edit">
                    <div class="field-item__left">
                      <code class="field-item__name">logo</code>
                      <span class="field-status field-status--edit">Editável</span>
                    </div>
                    <p class="field-item__desc">Logótipo da editora. Faz upload de um ficheiro de imagem.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="section-block">
        <div class="section-title">
          <ShieldExclamationIcon class="section-title__icon section-title__icon--danger" aria-hidden="true" />
          <h2>Tabelas que não deves alterar</h2>
        </div>

        <section class="info-card info-card--red">
          <ShieldExclamationIcon class="info-card__icon" aria-hidden="true" />
          <div class="info-card__body">
            <strong>Dados dos utilizadores — não alterar</strong>
            <p>
              As seguintes tabelas contêm dados gerados pelos utilizadores da plataforma.
              Qualquer alteração manual pode corromper o progresso dos utilizadores.
              <strong>Não edites estes dados sem instruções da equipa técnica.</strong>
            </p>
            <div class="restricted-tables">
              <span class="table-badge table-badge--danger">user_books</span>
              <span class="table-badge table-badge--danger">user_exercises</span>
              <span class="table-badge table-badge--danger">user_daily_exercise</span>
              <span class="table-badge table-badge--danger">user_points_history</span>
              <span class="table-badge table-badge--danger">final_quiz_attempts</span>
            </div>
          </div>
        </section>
      </div>

      <div class="section-block">
        <div class="section-title">
          <PencilSquareIcon class="section-title__icon" aria-hidden="true" />
          <h2>Operações comuns no Directus</h2>
        </div>

        <div class="operations-grid">
          <div class="operation-card">
            <div class="op-icon-wrap">
              <PencilSquareIcon class="op-icon" aria-hidden="true" />
            </div>
            <div class="op-body">
              <h4>Criar um livro novo</h4>
              <ol>
                <li>Vai a <strong>Content → books</strong>.</li>
                <li>Clica em <strong>Create Item</strong> (botão +).</li>
                <li>Preenche o título, descrição e faz upload da capa.</li>
                <li>Associa a editora no campo <code>editora</code>.</li>
                <li>Guarda com <strong>Save</strong>.</li>
              </ol>
            </div>
          </div>

          <div class="operation-card">
            <div class="op-icon-wrap">
              <RectangleStackIcon class="op-icon" aria-hidden="true" />
            </div>
            <div class="op-body">
              <h4>Adicionar módulos a um livro</h4>
              <ol>
                <li>Vai a <strong>Content → modules</strong>.</li>
                <li>Clica em <strong>Create Item</strong>.</li>
                <li>Preenche o título e a <strong>descrição adicional</strong>.</li>
                <li>No campo <code>id_book</code>, seleciona o teu livro.</li>
                <li>Define a ordem no campo <code>order</code>.</li>
                <li>Guarda com <strong>Save</strong>.</li>
              </ol>
            </div>
          </div>

          <div class="operation-card">
            <div class="op-icon-wrap">
              <GlobeAltIcon class="op-icon" aria-hidden="true" />
            </div>
            <div class="op-body">
              <h4>Verificar o estado dos módulos</h4>
              <ol>
                <li>Vai a <strong>Content → modules</strong>.</li>
                <li>Filtra por <code>id_book</code> para ver os módulos do teu livro.</li>
                <li>Verifica o campo <code>minimum_exercises</code> — <code>true</code> significa que o módulo está completo.</li>
                <li>Quando todos os módulos estiverem completos, contacta a administração para publicação.</li>
              </ol>
              <p class="op-note">A publicação e despublicação do livro é da responsabilidade da equipa de administração.</p>
            </div>
          </div>

          <div class="operation-card">
            <div class="op-icon-wrap">
              <BookOpenIcon class="op-icon" aria-hidden="true" />
            </div>
            <div class="op-body">
              <h4>Editar um exercício manualmente</h4>
              <ol>
                <li>Vai a <strong>Content → exercises</strong>.</li>
                <li>Filtra por <code>id_module</code> para encontrar os exercícios.</li>
                <li>Abre o exercício e edita o campo <code>content</code>.</li>
                <li>Guarda com <strong>Save</strong>.</li>
              </ol>
              <p class="op-note">Usa esta opção para corrigir gralhas geradas pela IA.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-600);
  color: var(--color-mirage-900);
}

/* ── Header ── */
.page-header {
  display: grid;
  gap: var(--space-100);
}

.kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
  margin: 0;
}

h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

.subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--color-mirage-600);
  line-height: 1.5;
  max-width: 680px;
}

/* ── Tab row ── */
.tabs-row {
  display: flex;
}

/* ── Tab content ── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-600);
}

/* ── Section block ── */
.section-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-250);
  padding-bottom: var(--space-200);
  border-bottom: 2px dashed var(--color-mirage-300);
}

.section-title h2 {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

.section-title__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  stroke-width: 1.5;
  color: var(--color-deep-600);
}

.section-title__icon--danger {
  color: var(--color-error-strong, #b91c1c);
}

/* ── Info cards ── */
.info-card {
  display: flex;
  gap: var(--space-400);
  align-items: flex-start;
  padding: var(--space-400) var(--space-500);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.info-card.inner-card {
  margin-top: var(--space-400);
  box-shadow: none;
}

.info-card--blue {
  background: var(--color-deep-100);
  border-color: var(--color-deep-500);
}

.info-card--yellow {
  background: var(--color-amber-100);
  border-color: #92400e;
}

.info-card--red {
  background: var(--color-error-muted);
  border-color: var(--color-red-500, #dc2626);
}

.info-card--neutral {
  background: var(--color-wild-200);
}

.info-card__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  stroke-width: 1.5;
  margin-top: 2px;
  color: var(--color-mirage-600);
}

.info-card--blue .info-card__icon   { color: var(--color-deep-600); }
.info-card--yellow .info-card__icon { color: #92400e; }
.info-card--red .info-card__icon    { color: var(--color-error-strong, #b91c1c); }

.info-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.info-card__body strong {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.info-card__body p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-700);
  line-height: 1.6;
}

/* ── Steps ── */
.steps-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.step-card {
  display: flex;
  gap: var(--space-400);
  align-items: flex-start;
  padding: var(--space-400) var(--space-500);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.step-number {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-deep-600);
  color: var(--color-wild-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  border: 2px solid var(--color-mirage-900);
  box-shadow: 2px 2px 0 var(--color-shadow);
  margin-top: 2px;
}

.step-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.step-body h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.step-body p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-700);
  line-height: 1.6;
}

.step-body ul {
  margin: 0;
  padding-left: var(--space-400);
  font-size: 14px;
  color: var(--color-mirage-700);
  line-height: 1.7;
}

.tip-box {
  padding: var(--space-300) var(--space-400);
  border-radius: 10px;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-300);
  font-size: 13px;
  color: var(--color-mirage-700);
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.tip-box strong {
  font-weight: 800;
  color: var(--color-mirage-900);
}

.tip-box ul {
  margin: 0;
  padding-left: var(--space-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-200);
  padding: var(--space-300) var(--space-400);
  border-radius: 10px;
  background: var(--color-amber-100);
  border: 2px solid #92400e;
  font-size: 13px;
  color: #78350f;
  line-height: 1.5;
}

.warning-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  stroke-width: 1.5;
  color: #92400e;
  margin-top: 1px;
}

/* ── Chips ── */
.chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  font-size: 12px;
  font-weight: 700;
  box-shadow: 2px 2px 0 var(--color-shadow);
  white-space: nowrap;
}

.chip.filled {
  background: var(--color-deep-600);
  color: #fff;
  border-color: var(--color-mirage-900);
}

.chip.outline {
  background: var(--color-wild-100);
  color: var(--color-mirage-800);
}

/* ── Action list ── */
.action-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.action-list li {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  font-size: 14px;
  color: var(--color-mirage-700);
}

.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  border: 2px solid;
  box-shadow: 2px 2px 0 var(--color-shadow);
  flex-shrink: 0;
}

.pill.green { background: #d1fae5; color: #065f46; border-color: #065f46; }
.pill.red   { background: var(--color-error-muted); color: var(--color-error-strong, #b91c1c); border-color: var(--color-error-strong, #b91c1c); }

/* ── Rules grid ── */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-400);
}

.rule-card {
  display: flex;
  gap: var(--space-300);
  align-items: flex-start;
  padding: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.rule-icon-wrap {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-deep-100);
  display: grid;
  place-items: center;
}

.rule-icon {
  width: 22px;
  height: 22px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

.rule-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.rule-body h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--color-mirage-900); }
.rule-body p  { margin: 0; font-size: 13px; color: var(--color-mirage-600); line-height: 1.5; }
.rule-body ul { margin: 0; padding-left: var(--space-400); font-size: 13px; color: var(--color-mirage-700); line-height: 1.7; }

/* ── Table cards grid ── */
.table-cards-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.table-card {
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 4px 4px 0 var(--color-shadow);
  background: var(--color-wild-100);
}

.table-card__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
  padding: var(--space-300) var(--space-400);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.table-card__header:hover {
  background: var(--color-wild-300);
}

.table-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}

.table-name {
  font-family: monospace;
  font-size: 13px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 8px;
  border: 2px solid;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.table-card--books     .table-name { background: var(--color-deep-100);    border-color: var(--color-deep-500);    color: var(--color-deep-800); }
.table-card--modules   .table-name { background: var(--color-teal-100);    border-color: var(--color-teal-500);    color: var(--color-teal-800); }
.table-card--exercises .table-name { background: var(--color-pumpkin-100); border-color: var(--color-pumpkin-600); color: var(--color-pumpkin-900); }
.table-card--editoras  .table-name { background: var(--color-amber-100);   border-color: var(--color-amber-600);   color: var(--color-amber-900); }

.table-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-card__title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1.2;
}

.table-card__subtitle {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-mirage-400);
  line-height: 1.2;
}

.table-card__chevron {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--color-mirage-400);
  transition: transform 0.25s ease;
}

.table-card.is-open .table-card__chevron {
  transform: rotate(180deg);
}

.table-card__wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-card__wrap.is-open {
  grid-template-rows: 1fr;
}

.table-card__body {
  overflow: hidden;
  padding: 0 var(--space-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.table-card__wrap.is-open .table-card__body {
  padding: var(--space-400);
  border-top: 2px dashed var(--color-mirage-200);
}

.table-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.5;
}

/* ── Field list ── */
.field-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.field-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-300);
  align-items: baseline;
  padding: var(--space-200) var(--space-300);
  border-radius: 8px;
  border: 2px solid var(--color-mirage-200);
  background: var(--color-wild-200);
}

.field-item--edit {
  background: var(--color-deep-100);
  border-color: var(--color-deep-300);
}

.field-item--caution {
  background: var(--color-amber-100);
  border-color: var(--color-amber-300);
}

.field-item--highlight {
  background: var(--color-teal-100);
  border-color: var(--color-teal-400);
}

.field-item__left {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
  min-width: 0;
}

.field-item__name {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 5px;
  border: 1.5px solid;
}

.field-item--edit      .field-item__name { background: var(--color-deep-200);    border-color: var(--color-deep-500);    color: var(--color-deep-800); }
.field-item--caution   .field-item__name { background: var(--color-amber-200);   border-color: var(--color-amber-600);   color: var(--color-amber-900); }
.field-item--highlight .field-item__name { background: var(--color-teal-200);    border-color: var(--color-teal-600);    color: var(--color-teal-800); }

.field-status {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1.5px solid;
  white-space: nowrap;
  flex-shrink: 0;
}

.field-item--edit      .field-status { background: var(--color-deep-600);    border-color: var(--color-deep-700);    color: var(--color-wild-100); }
.field-item--caution   .field-status { background: var(--color-amber-500);   border-color: var(--color-amber-700);   color: var(--color-wild-100); }
.field-item--highlight .field-status { background: var(--color-teal-600);    border-color: var(--color-teal-700);    color: var(--color-wild-100); }

.field-item__desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-600);
  line-height: 1.5;
}

/* ── Table badges (used in "não alterar") ── */
.table-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--color-mirage-900);
  color: var(--color-wild-100);
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  border: 2px solid var(--color-mirage-900);
}

.table-badge--danger {
  background: var(--color-error-muted);
  color: var(--color-error-strong, #b91c1c);
  border-color: var(--color-error-strong, #b91c1c);
}

.restricted-tables {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  margin-top: var(--space-200);
}

/* ── Code examples ── */
.code-examples {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.code-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-mirage-500);
  margin: 0;
}

.code-block {
  margin: 0;
  padding: var(--space-300) var(--space-400);
  border-radius: 10px;
  background: var(--color-mirage-900);
  color: var(--color-teal-200);
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

/* ── Operations grid ── */
.operations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-400);
}

.operation-card {
  display: flex;
  gap: var(--space-300);
  align-items: flex-start;
  padding: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.op-icon-wrap {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-deep-100);
  display: grid;
  place-items: center;
}

.op-icon {
  width: 22px;
  height: 22px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

.op-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.op-body h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--color-mirage-900); }

.op-body ol {
  margin: 0;
  padding-left: var(--space-400);
  font-size: 13px;
  color: var(--color-mirage-700);
  line-height: 1.8;
}

.op-note {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-style: italic;
}

@media (max-width: 768px) {
  .step-card {
    flex-direction: column;
    gap: var(--space-300);
  }

  .field-name {
    min-width: 120px;
  }
}
</style>
