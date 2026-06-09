import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { goetheB1Cards } from './goetheB1Cards'

const STORAGE_KEY = 'deutschdeck:v1'
const DAY_IN_MS = 24 * 60 * 60 * 1000
const GOETHE_DECK_ID = 'deck-goethe-b1-wordlist'
const SEED_CREATED_AT = new Date('2026-01-01T00:00:00.000Z').getTime()

type View = 'study' | 'words' | 'lists'
type ReviewGrade = 'again' | 'hard' | 'easy'
type ArticleTag = 'der' | 'die' | 'das' | 'plural'

type Flashcard = {
  id: string
  german: string
  translation: string
  note: string
  createdAt: number
  updatedAt: number
  dueAt: number
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  article?: ArticleTag
  lastReviewedAt?: number
}

type Deck = {
  id: string
  title: string
  description: string
  createdAt: number
  updatedAt: number
  cards: Flashcard[]
}

type CardForm = {
  german: string
  translation: string
  note: string
  article: ArticleTag | ''
}

type DeckForm = {
  title: string
  description: string
}

const studyGrades: ReviewGrade[] = ['again', 'hard', 'easy']

const reviewLabels: Record<ReviewGrade, string> = {
  again: 'Não sabia',
  hard: 'Preciso revisar',
  easy: 'Foi fácil',
}

const reviewIcons: Record<ReviewGrade, string> = {
  again: '!',
  hard: '~',
  easy: '✓',
}

const reviewHints: Record<ReviewGrade, string> = {
  again: 'Volta daqui a pouco',
  hard: 'Mantém perto de você',
  easy: 'Aumenta o intervalo',
}

const reviewFeedback: Record<ReviewGrade, string> = {
  again: 'Sem drama. Essa volta rapidinho.',
  hard: 'Boa percepção. Vamos reforçar.',
  easy: 'Sehr gut! Próxima palavra.',
}

function createId(prefix: string) {
  const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? fallback}`
}

function detectArticle(german: string): ArticleTag | undefined {
  const normalized = german.trim().toLowerCase()

  if (normalized.startsWith('der ')) return 'der'
  if (normalized.startsWith('die ')) return 'die'
  if (normalized.startsWith('das ')) return 'das'

  return undefined
}

function getArticle(card: Flashcard): ArticleTag | undefined {
  return card.article ?? detectArticle(card.german)
}

function getArticleLabel(article: ArticleTag | undefined) {
  if (!article) return ''
  return article === 'plural' ? 'Plural' : article
}

function getWordParts(german: string) {
  const match = german.trim().match(/^(der|die|das)\s+(.+)$/i)
  return match ? { articleText: match[1].toLowerCase(), rest: match[2] } : { articleText: '', rest: german }
}

function GermanWord({ card, compact = false }: { card: Flashcard; compact?: boolean }) {
  const article = getArticle(card)
  const parts = getWordParts(card.german)

  if (!parts.articleText) return <>{card.german}</>

  return (
    <span className={`german-word ${compact ? 'compact' : ''}`}>
      <span className={`article-token article-${article ?? parts.articleText}`}>
        {parts.articleText}
      </span>
      <span>{parts.rest}</span>
    </span>
  )
}

function createSeedCard(id: string, german: string, translation: string, note = ''): Flashcard {
  return {
    id,
    german,
    translation,
    note,
    article: detectArticle(german),
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
    dueAt: SEED_CREATED_AT,
    intervalDays: 0,
    ease: 2.3,
    repetitions: 0,
    lapses: 0,
  }
}

function createGoetheDeck(): Deck {
  return {
    id: GOETHE_DECK_ID,
    title: 'Goethe B1 - Wortschatz',
    description: 'Lista inicial com vocabulário Goethe B1.',
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
    cards: goetheB1Cards.map((card, index) =>
      createSeedCard(`goethe-b1-${index + 1}`, card.german, card.translation),
    ),
  }
}

function createCard(german = '', translation = '', note = ''): Flashcard {
  const now = Date.now()

  return {
    id: createId('card'),
    german,
    translation,
    note,
    article: detectArticle(german),
    createdAt: now,
    updatedAt: now,
    dueAt: now,
    intervalDays: 0,
    ease: 2.3,
    repetitions: 0,
    lapses: 0,
  }
}

function createDeck(title = 'Nova lista', description = ''): Deck {
  const now = Date.now()

  return {
    id: createId('deck'),
    title,
    description,
    createdAt: now,
    updatedAt: now,
    cards: [],
  }
}

const initialDecks: Deck[] = [
  createGoetheDeck(),
  {
    id: 'deck-a1-essentials',
    title: 'Alemão A1 essencial',
    description: 'Palavras curtas para as primeiras conversas.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('der Apfel', 'a maçã', 'Ich esse einen Apfel.'),
      createCard('das Wasser', 'a água', 'Ein Glas Wasser, bitte.'),
      createCard('die Wohnung', 'o apartamento', 'Meine Wohnung ist klein.'),
      createCard('arbeiten', 'trabalhar', 'Ich arbeite heute.'),
      createCard('schnell', 'rápido', 'Der Zug ist schnell.'),
      createCard('langsam', 'devagar', 'Bitte sprechen Sie langsam.'),
    ],
  },
  {
    id: 'deck-daily-phrases',
    title: 'Frases do dia a dia',
    description: 'Expressões práticas para usar sem pensar muito.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('Guten Morgen', 'bom dia', 'Guten Morgen, wie geht es dir?'),
      createCard('Ich verstehe nicht', 'eu não entendo', 'Entschuldigung, ich verstehe nicht.'),
      createCard('Wie viel kostet das?', 'quanto custa isso?', 'Wie viel kostet das Brot?'),
      createCard('Bis später', 'até mais tarde', 'Bis später im Kurs.'),
    ],
  },
]

function loadDecks() {
  if (typeof window === 'undefined') return initialDecks

  try {
    const savedDecks = window.localStorage.getItem(STORAGE_KEY)
    if (!savedDecks) return initialDecks

    const parsed = JSON.parse(savedDecks) as Deck[]
    if (parsed.length === 0) return initialDecks

    const hasGoetheDeck = parsed.some((deck) => deck.id === GOETHE_DECK_ID)
    return hasGoetheDeck ? parsed : [createGoetheDeck(), ...parsed]
  } catch {
    return initialDecks
  }
}

function getDueLabel(card: Flashcard, now: number) {
  const diff = card.dueAt - now
  if (diff <= 0) return 'vence hoje'

  const days = Math.ceil(diff / DAY_IN_MS)
  return days === 1 ? 'amanhã' : `em ${days} dias`
}

function getDifficultyScore(card: Flashcard) {
  const lapsePressure = card.lapses * 3
  const easePressure = Math.max(0, 3 - card.ease) * 2
  const newCardPressure = card.repetitions === 0 ? 1 : 0

  return lapsePressure + easePressure + newCardPressure
}

function getDifficultyLabel(card: Flashcard) {
  const score = getDifficultyScore(card)

  if (score >= 6) return 'muito difícil'
  if (score >= 3) return 'difícil'
  if (card.repetitions === 0) return 'nova'

  return 'estável'
}

function getStartOfToday(now: number) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

function getMasteryPercent(cards: Flashcard[]) {
  if (cards.length === 0) return 0

  const masteredScore = cards.reduce((total, card) => {
    if (card.repetitions >= 3 && card.lapses === 0) return total + 1
    if (card.repetitions >= 2 && getDifficultyScore(card) < 3) return total + 0.75
    if (card.repetitions >= 1) return total + 0.35
    return total
  }, 0)

  return Math.round((masteredScore / cards.length) * 100)
}

function getShuffleScore(cardId: string, seed: string) {
  const value = `${seed}:${cardId}`
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function updateCardReview(card: Flashcard, grade: ReviewGrade): Flashcard {
  const now = Date.now()
  const nextEase =
    grade === 'again'
      ? Math.max(1.3, card.ease - 0.25)
      : grade === 'hard'
        ? Math.max(1.3, card.ease - 0.1)
        : Math.min(3, card.ease + 0.2)

  const nextInterval =
    grade === 'again'
      ? 0
      : grade === 'hard'
        ? Math.max(1, Math.round(card.intervalDays * 1.2))
        : card.repetitions === 0
          ? 3
          : Math.max(3, Math.round(card.intervalDays * (nextEase + 0.65)))

  return {
    ...card,
    ease: nextEase,
    intervalDays: nextInterval,
    repetitions: grade === 'again' ? 0 : card.repetitions + 1,
    lapses: grade === 'again' ? card.lapses + 1 : card.lapses,
    lastReviewedAt: now,
    updatedAt: now,
    dueAt: grade === 'again' ? now + 15 * 60 * 1000 : now + nextInterval * DAY_IN_MS,
  }
}

function App() {
  const [decks, setDecks] = useState<Deck[]>(loadDecks)
  const [activeDeckId, setActiveDeckId] = useState(() => loadDecks()[0]?.id ?? '')
  const [view, setView] = useState<View>('study')
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [deckForm, setDeckForm] = useState<DeckForm>({ title: '', description: '' })
  const [cardForm, setCardForm] = useState<CardForm>({
    german: '',
    translation: '',
    note: '',
    article: '',
  })
  const [now, setNow] = useState(() => Date.now())
  const [studySeed, setStudySeed] = useState(() => createId('study'))
  const [streak, setStreak] = useState(0)
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
  }, [decks])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const activeDeck = useMemo(
    () => decks.find((deck) => deck.id === activeDeckId) ?? decks[0],
    [activeDeckId, decks],
  )

  const allCards = useMemo(() => decks.flatMap((deck) => deck.cards), [decks])
  const activeCards = useMemo(() => activeDeck?.cards ?? [], [activeDeck])
  const dueCards = useMemo(
    () =>
      [...activeCards]
        .filter((card) => card.dueAt <= now)
        .sort(
          (first, second) =>
            getDifficultyScore(second) - getDifficultyScore(first) ||
            first.dueAt - second.dueAt ||
            getShuffleScore(first.id, studySeed) - getShuffleScore(second.id, studySeed),
        ),
    [activeCards, now, studySeed],
  )

  const currentCard = dueCards[0]
  const dueTotal = allCards.filter((card) => card.dueAt <= now).length
  const hardTotal = allCards.filter((card) => getDifficultyScore(card) >= 3).length
  const todayStart = getStartOfToday(now)
  const activeDueTotal = activeCards.filter((card) => card.dueAt <= now).length
  const reviewedToday = activeCards.filter(
    (card) => card.lastReviewedAt && card.lastReviewedAt >= todayStart,
  ).length
  const masteryPercent = getMasteryPercent(activeCards)
  const completionPercent =
    activeDueTotal + reviewedToday === 0
      ? 100
      : Math.round((reviewedToday / (activeDueTotal + reviewedToday)) * 100)

  function changeDeck(deckId: string) {
    setActiveDeckId(deckId)
    setStudySeed(createId('study'))
    setIsAnswerVisible(false)
    setReviewMessage('')
    setStreak(0)
  }

  function updateDecks(nextDecks: Deck[]) {
    setDecks(nextDecks)
    if (!nextDecks.some((deck) => deck.id === activeDeckId)) {
      setActiveDeckId(nextDecks[0]?.id ?? '')
    }
  }

  function handleReview(grade: ReviewGrade) {
    if (!activeDeck || !currentCard) return

    setReviewMessage(reviewFeedback[grade])
    setStreak((currentStreak) => (grade === 'again' ? 0 : currentStreak + 1))
    setDecks((currentDecks) =>
      currentDecks.map((deck) =>
        deck.id === activeDeck.id
          ? {
              ...deck,
              updatedAt: Date.now(),
              cards: deck.cards.map((card) =>
                card.id === currentCard.id ? updateCardReview(card, grade) : card,
              ),
            }
          : deck,
      ),
    )
    setIsAnswerVisible(false)
    window.setTimeout(() => setReviewMessage(''), 1200)
  }

  function startDeckEdit(deck: Deck) {
    setEditingDeckId(deck.id)
    setDeckForm({ title: deck.title, description: deck.description })
    setView('lists')
  }

  function createNewDeck() {
    const deck = createDeck()
    updateDecks([...decks, deck])
    setActiveDeckId(deck.id)
    startDeckEdit(deck)
  }

  function saveDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = deckForm.title.trim()

    if (!editingDeckId || !title) return

    setDecks((currentDecks) =>
      currentDecks.map((deck) =>
        deck.id === editingDeckId
          ? {
              ...deck,
              title,
              description: deckForm.description.trim(),
              updatedAt: Date.now(),
            }
          : deck,
      ),
    )
    setEditingDeckId(null)
  }

  function deleteDeck(deckId: string) {
    const nextDecks = decks.filter((deck) => deck.id !== deckId)
    updateDecks(nextDecks.length > 0 ? nextDecks : [createDeck('Alemão básico')])
    setEditingDeckId(null)
  }

  function resetCardForm() {
    setEditingCardId(null)
    setCardForm({ german: '', translation: '', note: '', article: '' })
  }

  function startCardEdit(card: Flashcard) {
    setEditingCardId(card.id)
    setCardForm({
      german: card.german,
      translation: card.translation,
      note: card.note,
      article: getArticle(card) ?? '',
    })
    setView('words')
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const german = cardForm.german.trim()
    const translation = cardForm.translation.trim()

    if (!activeDeck || !german || !translation) return

    const selectedArticle = cardForm.article || detectArticle(german)

    setDecks((currentDecks) =>
      currentDecks.map((deck) => {
        if (deck.id !== activeDeck.id) return deck

        const nextCard = {
          ...createCard(german, translation, cardForm.note.trim()),
          id: editingCardId ?? createId('card'),
          article: selectedArticle,
          createdAt:
            deck.cards.find((card) => card.id === editingCardId)?.createdAt ?? Date.now(),
        }

        return {
          ...deck,
          updatedAt: Date.now(),
          cards: editingCardId
            ? deck.cards.map((card) =>
                card.id === editingCardId
                  ? {
                      ...card,
                      german,
                      translation,
                      note: cardForm.note.trim(),
                      article: selectedArticle,
                      updatedAt: Date.now(),
                    }
                  : card,
              )
            : [...deck.cards, nextCard],
        }
      }),
    )
    resetCardForm()
  }

  function deleteCard(cardId: string) {
    if (!activeDeck) return

    setDecks((currentDecks) =>
      currentDecks.map((deck) =>
        deck.id === activeDeck.id
          ? {
              ...deck,
              updatedAt: Date.now(),
              cards: deck.cards.filter((card) => card.id !== cardId),
            }
          : deck,
      ),
    )

    if (editingCardId === cardId) resetCardForm()
  }

  function resetProgress() {
    if (!activeDeck) return

    setDecks((currentDecks) =>
      currentDecks.map((deck) =>
        deck.id === activeDeck.id
          ? {
              ...deck,
              updatedAt: Date.now(),
              cards: deck.cards.map((card) => ({
                ...card,
                dueAt: Date.now(),
                intervalDays: 0,
                repetitions: 0,
                lapses: 0,
                lastReviewedAt: undefined,
              })),
            }
          : deck,
      ),
    )
    setIsAnswerVisible(false)
    setStreak(0)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">DeutschDeck</p>
          <h1>Seu treino de alemão, leve e constante.</h1>
          <p>Revise alguns cards por dia e acompanhe seu avanço sem pressão.</p>
        </div>
        <label className="deck-picker">
          <span>Lista ativa</span>
          <select value={activeDeck?.id ?? ''} onChange={(event) => changeDeck(event.target.value)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="view-tabs" aria-label="Navegação principal">
        <button type="button" className={view === 'study' ? 'active' : ''} onClick={() => setView('study')}>
          Estudar
        </button>
        <button type="button" className={view === 'words' ? 'active' : ''} onClick={() => setView('words')}>
          Palavras
        </button>
        <button type="button" className={view === 'lists' ? 'active' : ''} onClick={() => setView('lists')}>
          Listas
        </button>
      </nav>

      {view === 'study' && (
        <section className="study-panel">
          <section className="today-panel" aria-label="Painel de estudo de hoje">
            <div className="today-copy">
              <p className="eyebrow">Bom estudo</p>
              <h2>{activeDueTotal > 0 ? 'Pronto para revisar?' : 'Tudo leve por aqui.'}</h2>
              <p>{activeDeck ? `${activeDeck.title} está selecionada.` : 'Escolha uma lista para começar.'}</p>
            </div>
            <div className="progress-ring" aria-label={`${masteryPercent}% de domínio aproximado`}>
              <span>{masteryPercent}%</span>
              <small>domínio</small>
            </div>
            <div className="daily-stats" aria-label="Resumo do estudo">
              <article>
                <strong>{activeDueTotal}</strong>
                <span>faltam hoje</span>
              </article>
              <article>
                <strong>{reviewedToday}</strong>
                <span>revisadas</span>
              </article>
              <article>
                <strong>{streak}</strong>
                <span>sequência</span>
              </article>
              <article>
                <strong>{dueTotal}</strong>
                <span>em todas listas</span>
              </article>
            </div>
            <div className="soft-progress" aria-hidden="true">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
            <button
              type="button"
              className="primary-action start-action"
              onClick={() => {
                setIsAnswerVisible(false)
                setStudySeed(createId('study'))
              }}
            >
              Começar revisão
            </button>
          </section>

          {reviewMessage && <p className="review-toast">{reviewMessage}</p>}

          {activeDeck && currentCard ? (
            <>
              <div className="study-meta">
                <span>
                  {dueCards.length} cards na sessão · {getDifficultyLabel(currentCard)}
                </span>
                <button
                  type="button"
                  className="shuffle-action"
                  onClick={() => {
                    setStudySeed(createId('study'))
                    setIsAnswerVisible(false)
                  }}
                >
                  Embaralhar
                </button>
              </div>

              <article
                key={`${currentCard.id}-${isAnswerVisible ? 'answer' : 'front'}`}
                className={`flashcard ${isAnswerVisible ? 'is-revealed' : ''}`}
              >
                <div className="card-topline">
                  <p className="card-label">Alemão</p>
                  {getArticle(currentCard) && (
                    <span className={`article-badge article-${getArticle(currentCard)}`}>
                      {getArticleLabel(getArticle(currentCard))}
                    </span>
                  )}
                </div>
                <h2>
                  <GermanWord card={currentCard} />
                </h2>
                {isAnswerVisible ? (
                  <div className="answer">
                    <p className="card-label">Tradução</p>
                    <strong>{currentCard.translation}</strong>
                    <div className="example-box">
                      <span>{currentCard.note || 'Sem exemplo cadastrado ainda.'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="prompt">Leia em voz baixa e tente lembrar antes de revelar.</p>
                )}
              </article>

              {isAnswerVisible ? (
                <div className="review-actions" aria-label="Como foi lembrar esta palavra?">
                  {studyGrades.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      className={`grade grade-${grade}`}
                      onClick={() => handleReview(grade)}
                    >
                      <span className="grade-icon" aria-hidden="true">
                        {reviewIcons[grade]}
                      </span>
                      <strong>{reviewLabels[grade]}</strong>
                      <span>{reviewHints[grade]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="primary-action reveal-action"
                  onClick={() => setIsAnswerVisible(true)}
                >
                  Mostrar resposta
                </button>
              )}
            </>
          ) : (
            <section className="empty-state">
              <p className="eyebrow">Tudo em dia</p>
              <h2>Nenhum card vencido nesta lista.</h2>
              <p>Adicione novas palavras ou reestude a lista quando quiser reforçar.</p>
              <div className="inline-actions">
                <button type="button" onClick={() => setView('words')}>
                  Editar palavras
                </button>
                <button type="button" onClick={resetProgress}>
                  Reestudar lista
                </button>
              </div>
            </section>
          )}
        </section>
      )}

      {view === 'words' && activeDeck && (
        <section className="workspace-grid">
          <form className="editor-panel" onSubmit={saveCard}>
            <div className="section-heading">
              <p className="eyebrow">{editingCardId ? 'Editar palavra' : 'Nova palavra'}</p>
              <h2>{activeDeck.title}</h2>
            </div>
            <label>
              Palavra em alemão
              <input
                value={cardForm.german}
                onChange={(event) =>
                  setCardForm((form) => ({ ...form, german: event.target.value }))
                }
                placeholder="die Zeitung"
                required
              />
            </label>
            <label>
              Artigo ou tipo
              <select
                value={cardForm.article}
                onChange={(event) =>
                  setCardForm((form) => ({
                    ...form,
                    article: event.target.value as CardForm['article'],
                  }))
                }
              >
                <option value="">Detectar automaticamente</option>
                <option value="der">der - azul</option>
                <option value="die">die - rosa</option>
                <option value="das">das - verde</option>
                <option value="plural">Plural - laranja</option>
              </select>
            </label>
            <label>
              Tradução
              <input
                value={cardForm.translation}
                onChange={(event) =>
                  setCardForm((form) => ({ ...form, translation: event.target.value }))
                }
                placeholder="o jornal"
                required
              />
            </label>
            <label>
              Exemplo ou nota
              <textarea
                value={cardForm.note}
                onChange={(event) =>
                  setCardForm((form) => ({ ...form, note: event.target.value }))
                }
                placeholder="Ich lese die Zeitung."
                rows={3}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-action">
                {editingCardId ? 'Salvar palavra' : 'Adicionar palavra'}
              </button>
              {editingCardId && (
                <button type="button" onClick={resetCardForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <section className="word-list">
            <div className="section-heading">
              <p className="eyebrow">Vocabulário</p>
              <h2>{activeDeck.cards.length} palavras</h2>
            </div>
            {activeDeck.cards.length > 0 ? (
              activeDeck.cards.map((card) => (
                <article key={card.id} className="word-row">
                  <div>
                    <div className="word-title">
                      {getArticle(card) && (
                        <span className={`article-badge article-${getArticle(card)}`}>
                          {getArticleLabel(getArticle(card))}
                        </span>
                      )}
                      <strong>
                        <GermanWord card={card} compact />
                      </strong>
                    </div>
                    <span>{card.translation}</span>
                    {card.note && <small>{card.note}</small>}
                  </div>
                  <div className="row-actions">
                    <span>{getDueLabel(card, now)}</span>
                    <span className="difficulty-pill">{getDifficultyLabel(card)}</span>
                    <button type="button" onClick={() => startCardEdit(card)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => deleteCard(card.id)}>
                      Apagar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">Esta lista ainda não tem palavras.</p>
            )}
          </section>
        </section>
      )}

      {view === 'lists' && (
        <section className="workspace-grid">
          <section className="deck-list">
            <div className="section-heading">
              <p className="eyebrow">Minhas listas</p>
              <h2>{decks.length} listas salvas</h2>
            </div>
            <button type="button" className="primary-action" onClick={createNewDeck}>
              Criar lista
            </button>
            {decks.map((deck) => (
              <article
                key={deck.id}
                className={`deck-row ${deck.id === activeDeck?.id ? 'selected' : ''}`}
              >
                <button type="button" className="deck-select" onClick={() => changeDeck(deck.id)}>
                  <strong>{deck.title}</strong>
                  <span>
                    {deck.cards.length} palavras ·{' '}
                    {deck.cards.filter((card) => card.dueAt <= now).length} vencidas
                  </span>
                </button>
                <button type="button" onClick={() => startDeckEdit(deck)}>
                  Editar
                </button>
              </article>
            ))}
          </section>

          <form className="editor-panel" onSubmit={saveDeck}>
            <div className="section-heading">
              <p className="eyebrow">Editor de lista</p>
              <h2>{editingDeckId ? 'Ajustar lista' : 'Selecione uma lista'}</h2>
            </div>
            <label>
              Nome da lista
              <input
                value={deckForm.title}
                onChange={(event) =>
                  setDeckForm((form) => ({ ...form, title: event.target.value }))
                }
                placeholder="Alemão para viagem"
                disabled={!editingDeckId}
                required
              />
            </label>
            <label>
              Descrição
              <textarea
                value={deckForm.description}
                onChange={(event) =>
                  setDeckForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="Contexto, objetivo ou nível desta lista"
                disabled={!editingDeckId}
                rows={4}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-action" disabled={!editingDeckId}>
                Salvar lista
              </button>
              {editingDeckId && (
                <button type="button" className="danger" onClick={() => deleteDeck(editingDeckId)}>
                  Apagar lista
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <footer className="app-footer" aria-hidden="true">
        <span>{allCards.length} palavras no total</span>
        <span>{hardTotal} pedem carinho extra</span>
      </footer>
    </main>
  )
}

export default App
