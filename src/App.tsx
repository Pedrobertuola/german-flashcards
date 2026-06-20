import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { goetheB1Cards } from './goetheB1Cards'

const STORAGE_KEY = 'deutschdeck:v1'
const DAY_IN_MS = 24 * 60 * 60 * 1000
const GOETHE_DECK_ID = 'deck-goethe-b1-wordlist'
const SEED_CREATED_AT = new Date('2026-01-01T00:00:00.000Z').getTime()

type View = 'study' | 'words' | 'lists'
type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'
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
  again: "Didn't know it",
  hard: 'Need review',
  good: 'Remembered',
  easy: 'Too easy',
}

const reviewIcons: Record<ReviewGrade, string> = {
  again: '!',
  hard: '~',
  good: '+',
  easy: '✓',
}

const reviewHints: Record<ReviewGrade, string> = {
  again: 'Comes back soon',
  hard: 'Keep it close',
  good: 'Keep the rhythm',
  easy: 'Increase interval',
}

const reviewFeedback: Record<ReviewGrade, string> = {
  again: 'No pressure. This one comes back soon.',
  hard: "Good call. Let's reinforce it.",
  good: "Nice. Let's keep going.",
  easy: 'Sehr gut! Next word.',
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

  if (!match) {
    return { articleText: '', rest: german }
  }

  return { articleText: match[1].toLowerCase(), rest: match[2] }
}

function GermanWord({ card, compact = false }: { card: Flashcard; compact?: boolean }) {
  const article = getArticle(card)
  const parts = getWordParts(card.german)

  if (!parts.articleText) {
    return <>{card.german}</>
  }

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
    description: 'Starter deck with Goethe B1 vocabulary.',
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

function createDeck(title = 'New deck', description = ''): Deck {
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
    title: 'German A1 essentials',
    description: 'Short words for first conversations.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('der Apfel', 'the apple', 'Ich esse einen Apfel.'),
      createCard('das Wasser', 'the water', 'Ein Glas Wasser, bitte.'),
      createCard('die Wohnung', 'the apartment', 'Meine Wohnung ist klein.'),
      createCard('arbeiten', 'to work', 'Ich arbeite heute.'),
      createCard('schnell', 'fast', 'Der Zug ist schnell.'),
      createCard('langsam', 'slow', 'Bitte sprechen Sie langsam.'),
    ],
  },
  {
    id: 'deck-daily-phrases',
    title: 'Everyday phrases',
    description: 'Practical expressions to use without overthinking.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('Guten Morgen', 'good morning', 'Guten Morgen, wie geht es dir?'),
      createCard("Ich verstehe nicht", "I don't understand", 'Entschuldigung, ich verstehe nicht.'),
      createCard('Wie viel kostet das?', 'how much does this cost?', 'Wie viel kostet das Brot?'),
      createCard('Bis später', 'see you later', 'Bis später im Kurs.'),
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
  if (diff <= 0) return 'due today'

  const days = Math.ceil(diff / DAY_IN_MS)
  return days === 1 ? 'tomorrow' : `in ${days} days`
}

function getDifficultyScore(card: Flashcard) {
  const lapsePressure = card.lapses * 3
  const easePressure = Math.max(0, 3 - card.ease) * 2
  const newCardPressure = card.repetitions === 0 ? 1 : 0

  return lapsePressure + easePressure + newCardPressure
}

function getDifficultyLabel(card: Flashcard) {
  const score = getDifficultyScore(card)

  if (score >= 6) return 'very hard'
  if (score >= 3) return 'hard'
  if (card.repetitions === 0) return 'new'

  return 'stable'
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

function getStudyPriority(card: Flashcard) {
  if (card.lapses > 0) return 0
  if (card.repetitions === 0) return 1
  return 2
}

function shuffleCards(cards: Flashcard[]) {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function updateCardReview(card: Flashcard, grade: ReviewGrade): Flashcard {
  const now = Date.now()
  const nextEase =
    grade === 'again'
      ? Math.max(1.3, card.ease - 0.25)
      : grade === 'hard'
        ? Math.max(1.3, card.ease - 0.1)
        : grade === 'easy'
          ? Math.min(3, card.ease + 0.2)
          : card.ease

  const nextInterval =
    grade === 'again'
      ? 0
      : grade === 'hard'
        ? Math.max(1, Math.round(card.intervalDays * 1.2))
        : grade === 'easy'
          ? card.repetitions === 0
            ? 3
            : Math.max(3, Math.round(card.intervalDays * (nextEase + 0.65)))
          : card.repetitions === 0
            ? 1
            : Math.max(2, Math.round(card.intervalDays * nextEase))

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
  const [shuffleNonce, setShuffleNonce] = useState(0)
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
    () => {
      void shuffleNonce

      return [0, 1, 2].flatMap((priority) =>
        shuffleCards(
          activeCards.filter(
            (card) => card.dueAt <= now && getStudyPriority(card) === priority,
          ),
        ),
      )
    },
    [activeCards, now, shuffleNonce],
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
    setShuffleNonce((value) => value + 1)
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
    updateDecks(nextDecks.length > 0 ? nextDecks : [createDeck('Basic German')])
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
          <h1>Your German practice, light and consistent.</h1>
          <p>Review a few cards each day and track your progress without pressure.</p>
        </div>
        <label className="deck-picker">
          <span>Active deck</span>
          <select value={activeDeck?.id ?? ''} onChange={(event) => changeDeck(event.target.value)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="view-tabs" aria-label="Main navigation">
        <button type="button" className={view === 'study' ? 'active' : ''} onClick={() => setView('study')}>
          Study
        </button>
        <button type="button" className={view === 'words' ? 'active' : ''} onClick={() => setView('words')}>
          Words
        </button>
        <button type="button" className={view === 'lists' ? 'active' : ''} onClick={() => setView('lists')}>
          Decks
        </button>
      </nav>

      {view === 'study' && (
        <section className="study-panel">
          <section className="today-panel" aria-label="Today study panel">
            <div className="today-copy">
              <p className="eyebrow">Good study session</p>
              <h2>{activeDueTotal > 0 ? 'Ready to review?' : 'All clear here.'}</h2>
              <p>{activeDeck ? `${activeDeck.title} is selected.` : 'Choose a deck to start.'}</p>
            </div>
            <div className="progress-ring" aria-label={`${masteryPercent}% estimated mastery`}>
              <span>{masteryPercent}%</span>
              <small>mastery</small>
            </div>
            <div className="daily-stats" aria-label="Study summary">
              <article>
                <strong>{activeDueTotal}</strong>
                <span>due today</span>
              </article>
              <article>
                <strong>{reviewedToday}</strong>
                <span>reviewed</span>
              </article>
              <article>
                <strong>{streak}</strong>
                <span>streak</span>
              </article>
              <article>
                <strong>{dueTotal}</strong>
                <span>across decks</span>
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
                setShuffleNonce((value) => value + 1)
              }}
            >
              Start review
            </button>
          </section>

          {reviewMessage && <p className="review-toast">{reviewMessage}</p>}

          {activeDeck && currentCard ? (
            <>
              <div className="study-meta">
                <span>
                  {dueCards.length} cards in session · {getDifficultyLabel(currentCard)}
                </span>
                <button
                  type="button"
                  className="shuffle-action"
                  onClick={() => {
                    setShuffleNonce((value) => value + 1)
                    setIsAnswerVisible(false)
                  }}
                >
                  Shuffle
                </button>
              </div>

              <article
                key={`${currentCard.id}-${isAnswerVisible ? 'answer' : 'front'}`}
                className={`flashcard ${isAnswerVisible ? 'is-revealed' : ''}`}
              >
                <div className="card-topline">
                  <p className="card-label">German</p>
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
                    <p className="card-label">Translation</p>
                    <strong>{currentCard.translation}</strong>
                    <div className="example-box">
                      <span>{currentCard.note || 'No example added yet.'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="prompt">Read it quietly and try to remember before revealing.</p>
                )}
              </article>

              {isAnswerVisible ? (
                <div className="review-actions" aria-label="How well did you remember this word?">
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
                  Show answer
                </button>
              )}
            </>
          ) : (
            <section className="empty-state">
              <p className="eyebrow">All caught up</p>
              <h2>No due cards in this deck.</h2>
              <p>Add new words or restudy the deck whenever you want to reinforce it.</p>
              <div className="inline-actions">
                <button type="button" onClick={() => setView('words')}>
                  Edit words
                </button>
                <button type="button" onClick={resetProgress}>
                  Restudy deck
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
              <p className="eyebrow">{editingCardId ? 'Edit word' : 'New word'}</p>
              <h2>{activeDeck.title}</h2>
            </div>
            <label>
              German word
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
              Article or type
              <select
                value={cardForm.article}
                onChange={(event) =>
                  setCardForm((form) => ({
                    ...form,
                    article: event.target.value as CardForm['article'],
                  }))
                }
              >
                <option value="">Detect automatically</option>
                <option value="der">der - blue</option>
                <option value="die">die - pink</option>
                <option value="das">das - green</option>
                <option value="plural">Plural - orange</option>
              </select>
            </label>
            <label>
              Translation
              <input
                value={cardForm.translation}
                onChange={(event) =>
                  setCardForm((form) => ({ ...form, translation: event.target.value }))
                }
                placeholder="the newspaper"
                required
              />
            </label>
            <label>
              Example or note
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
                {editingCardId ? 'Save word' : 'Add word'}
              </button>
              {editingCardId && (
                <button type="button" onClick={resetCardForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section className="word-list">
            <div className="section-heading">
              <p className="eyebrow">Vocabulary</p>
              <h2>{activeDeck.cards.length} words</h2>
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
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteCard(card.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">This deck does not have any words yet.</p>
            )}
          </section>
        </section>
      )}

      {view === 'lists' && (
        <section className="workspace-grid">
          <section className="deck-list">
            <div className="section-heading">
              <p className="eyebrow">My decks</p>
              <h2>{decks.length} saved decks</h2>
            </div>
            <button type="button" className="primary-action" onClick={createNewDeck}>
              Create deck
            </button>
            {decks.map((deck) => (
              <article
                key={deck.id}
                className={`deck-row ${deck.id === activeDeck?.id ? 'selected' : ''}`}
              >
                <button type="button" className="deck-select" onClick={() => changeDeck(deck.id)}>
                  <strong>{deck.title}</strong>
                  <span>
                    {deck.cards.length} words ·{' '}
                    {deck.cards.filter((card) => card.dueAt <= now).length} due
                  </span>
                </button>
                <button type="button" onClick={() => startDeckEdit(deck)}>
                  Edit
                </button>
              </article>
            ))}
          </section>

          <form className="editor-panel" onSubmit={saveDeck}>
            <div className="section-heading">
              <p className="eyebrow">Deck editor</p>
              <h2>{editingDeckId ? 'Adjust deck' : 'Select a deck'}</h2>
            </div>
            <label>
              Deck name
              <input
                value={deckForm.title}
                onChange={(event) =>
                  setDeckForm((form) => ({ ...form, title: event.target.value }))
                }
                placeholder="German for travel"
                disabled={!editingDeckId}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={deckForm.description}
                onChange={(event) =>
                  setDeckForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="Context, goal, or level for this deck"
                disabled={!editingDeckId}
                rows={4}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-action" disabled={!editingDeckId}>
                Save deck
              </button>
              {editingDeckId && (
                <button type="button" className="danger" onClick={() => deleteDeck(editingDeckId)}>
                  Delete deck
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <footer className="app-footer" aria-hidden="true">
        <span>{allCards.length} total words</span>
        <span>{hardTotal} need extra care</span>
      </footer>
    </main>
  )
}

export default App
