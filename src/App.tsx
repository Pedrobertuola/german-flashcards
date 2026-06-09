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
}

type DeckForm = {
  title: string
  description: string
}

const initialDecks: Deck[] = [
  createGoetheDeck(),
  {
    id: 'deck-a1-essentials',
    title: 'Alemao A1 essencial',
    description: 'Palavras curtas para as primeiras conversas.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('der Apfel', 'a maca', 'Ich esse einen Apfel.'),
      createCard('das Wasser', 'a agua', 'Ein Glas Wasser, bitte.'),
      createCard('die Wohnung', 'o apartamento', 'Meine Wohnung ist klein.'),
      createCard('arbeiten', 'trabalhar', 'Ich arbeite heute.'),
      createCard('schnell', 'rapido', 'Der Zug ist schnell.'),
      createCard('langsam', 'devagar', 'Bitte sprechen Sie langsam.'),
    ],
  },
  {
    id: 'deck-daily-phrases',
    title: 'Frases do dia a dia',
    description: 'Expressoes praticas para usar sem pensar muito.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [
      createCard('Guten Morgen', 'bom dia', 'Guten Morgen, wie geht es dir?'),
      createCard('Ich verstehe nicht', 'eu nao entendo', 'Entschuldigung, ich verstehe nicht.'),
      createCard('Wie viel kostet das?', 'quanto custa isso?', 'Wie viel kostet das Brot?'),
      createCard('Bis spaeter', 'ate mais tarde', 'Bis spaeter im Kurs.'),
    ],
  },
]

const reviewLabels: Record<ReviewGrade, string> = {
  again: 'Errei',
  hard: 'Dificil',
  good: 'Bom',
  easy: 'Facil',
}

const reviewHints: Record<ReviewGrade, string> = {
  again: 'rever em minutos',
  hard: 'rever amanha',
  good: 'aumentar intervalo',
  easy: 'espacar mais',
}

function createId(prefix: string) {
  const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? fallback}`
}

function createSeedCard(id: string, german: string, translation: string, note = ''): Flashcard {
  return {
    id,
    german,
    translation,
    note,
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
    description: 'Lista inicial enviada pela cliente, com vocabulario Goethe B1.',
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

function loadDecks() {
  if (typeof window === 'undefined') {
    return initialDecks
  }

  try {
    const savedDecks = window.localStorage.getItem(STORAGE_KEY)
    if (!savedDecks) {
      return initialDecks
    }

    const parsed = JSON.parse(savedDecks) as Deck[]
    if (parsed.length === 0) {
      return initialDecks
    }

    const hasGoetheDeck = parsed.some((deck) => deck.id === GOETHE_DECK_ID)
    return hasGoetheDeck ? parsed : [createGoetheDeck(), ...parsed]
  } catch {
    return initialDecks
  }
}

function getDueLabel(card: Flashcard, now: number) {
  const diff = card.dueAt - now

  if (diff <= 0) {
    return 'vence hoje'
  }

  const days = Math.ceil(diff / DAY_IN_MS)
  return days === 1 ? 'amanha' : `em ${days} dias`
}

function getDifficultyScore(card: Flashcard) {
  const lapsePressure = card.lapses * 3
  const easePressure = Math.max(0, 3 - card.ease) * 2
  const newCardPressure = card.repetitions === 0 ? 1 : 0

  return lapsePressure + easePressure + newCardPressure
}

function getDifficultyLabel(card: Flashcard) {
  const score = getDifficultyScore(card)

  if (score >= 6) {
    return 'muito dificil'
  }

  if (score >= 3) {
    return 'dificil'
  }

  if (card.repetitions === 0) {
    return 'nova'
  }

  return 'estavel'
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
  const [cardForm, setCardForm] = useState<CardForm>({ german: '', translation: '', note: '' })
  const [now, setNow] = useState(() => Date.now())
  const [studySeed, setStudySeed] = useState(() => createId('study'))

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
  const dueCards = useMemo(
    () =>
      [...(activeDeck?.cards ?? [])]
        .filter((card) => card.dueAt <= now)
        .sort(
          (first, second) =>
            getDifficultyScore(second) - getDifficultyScore(first) ||
            first.dueAt - second.dueAt ||
            getShuffleScore(first.id, studySeed) - getShuffleScore(second.id, studySeed),
        ),
    [activeDeck, now, studySeed],
  )
  const currentCard = dueCards[0]
  const dueTotal = allCards.filter((card) => card.dueAt <= now).length
  const hardTotal = allCards.filter((card) => getDifficultyScore(card) >= 3).length

  function updateDecks(nextDecks: Deck[]) {
    setDecks(nextDecks)
    if (!nextDecks.some((deck) => deck.id === activeDeckId)) {
      setActiveDeckId(nextDecks[0]?.id ?? '')
    }
  }

  function handleReview(grade: ReviewGrade) {
    if (!activeDeck || !currentCard) {
      return
    }

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

    if (!editingDeckId || !title) {
      return
    }

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
    updateDecks(nextDecks.length > 0 ? nextDecks : [createDeck('Alemao basico')])
    setEditingDeckId(null)
  }

  function resetCardForm() {
    setEditingCardId(null)
    setCardForm({ german: '', translation: '', note: '' })
  }

  function startCardEdit(card: Flashcard) {
    setEditingCardId(card.id)
    setCardForm({ german: card.german, translation: card.translation, note: card.note })
    setView('words')
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const german = cardForm.german.trim()
    const translation = cardForm.translation.trim()

    if (!activeDeck || !german || !translation) {
      return
    }

    setDecks((currentDecks) =>
      currentDecks.map((deck) => {
        if (deck.id !== activeDeck.id) {
          return deck
        }

        const nextCard = {
          ...createCard(german, translation, cardForm.note.trim()),
          id: editingCardId ?? createId('card'),
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
    if (!activeDeck) {
      return
    }

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

    if (editingCardId === cardId) {
      resetCardForm()
    }
  }

  function resetProgress() {
    if (!activeDeck) {
      return
    }

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
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DeutschDeck</p>
          <h1>Flashcards de alemao</h1>
        </div>
        <label className="deck-picker">
          <span>Lista ativa</span>
          <select
            value={activeDeck?.id ?? ''}
            onChange={(event) => {
              setActiveDeckId(event.target.value)
              setStudySeed(createId('study'))
              setIsAnswerVisible(false)
            }}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="stats-grid" aria-label="Resumo do estudo">
        <article>
          <strong>{dueTotal}</strong>
          <span>para revisar</span>
        </article>
        <article>
          <strong>{allCards.length}</strong>
          <span>palavras</span>
        </article>
        <article>
          <strong>{hardTotal}</strong>
          <span>difíceis</span>
        </article>
      </section>

      <nav className="view-tabs" aria-label="Navegacao principal">
        <button
          type="button"
          className={view === 'study' ? 'active' : ''}
          onClick={() => setView('study')}
        >
          Estudar
        </button>
        <button
          type="button"
          className={view === 'words' ? 'active' : ''}
          onClick={() => setView('words')}
        >
          Palavras
        </button>
        <button
          type="button"
          className={view === 'lists' ? 'active' : ''}
          onClick={() => setView('lists')}
        >
          Listas
        </button>
      </nav>

      {view === 'study' && (
        <section className="study-panel">
          {activeDeck && currentCard ? (
            <>
              <div className="study-meta">
                <span>{activeDeck.title}</span>
                <span>
                  {dueCards.length} agora · {getDifficultyLabel(currentCard)}
                </span>
              </div>
              <button
                type="button"
                className="shuffle-action"
                onClick={() => {
                  setStudySeed(createId('study'))
                  setIsAnswerVisible(false)
                }}
              >
                Embaralhar ordem
              </button>

              <article className={`flashcard ${isAnswerVisible ? 'is-revealed' : ''}`}>
                <p className="card-label">Alemao</p>
                <h2>{currentCard.german}</h2>
                {isAnswerVisible ? (
                  <div className="answer">
                    <p className="card-label">Portugues</p>
                    <strong>{currentCard.translation}</strong>
                    {currentCard.note && <span>{currentCard.note}</span>}
                  </div>
                ) : (
                  <p className="prompt">Toque para conferir a traducao.</p>
                )}
              </article>

              {isAnswerVisible ? (
                <div className="review-actions">
                  {(Object.keys(reviewLabels) as ReviewGrade[]).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      className={`grade grade-${grade}`}
                      onClick={() => handleReview(grade)}
                    >
                      <strong>{reviewLabels[grade]}</strong>
                      <span>{reviewHints[grade]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => setIsAnswerVisible(true)}
                >
                  Mostrar traducao
                </button>
              )}
            </>
          ) : (
            <section className="empty-state">
              <p className="eyebrow">Tudo em dia</p>
              <h2>Nenhum card vencido nesta lista.</h2>
              <p>
                Adicione novas palavras ou volte quando a proxima revisao aparecer.
              </p>
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
              Palavra em alemao
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
              Traducao
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
                    <strong>{card.german}</strong>
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
              <p className="muted">Esta lista ainda nao tem palavras.</p>
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
                <button
                  type="button"
                  className="deck-select"
                  onClick={() => {
                    setActiveDeckId(deck.id)
                    setStudySeed(createId('study'))
                    setIsAnswerVisible(false)
                  }}
                >
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
                placeholder="Alemao para viagem"
                disabled={!editingDeckId}
                required
              />
            </label>
            <label>
              Descricao
              <textarea
                value={deckForm.description}
                onChange={(event) =>
                  setDeckForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="Contexto, objetivo ou nivel desta lista"
                disabled={!editingDeckId}
                rows={4}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-action" disabled={!editingDeckId}>
                Salvar lista
              </button>
              {editingDeckId && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteDeck(editingDeckId)}
                >
                  Apagar lista
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </main>
  )
}

export default App
