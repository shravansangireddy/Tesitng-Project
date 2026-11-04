import { useEffect, useRef, useState } from "react";
import "./motivation-books.css";
import type { MotivationBookOutcome, MotivationBooksProgress } from "./game";
import { gradeLabels, type GradeId } from "./content-schema";
import {
  POINTS_PER_CORRECT,
  booksForGrade,
  motivationBooks,
  starsForScore,
  type MotivationBook,
} from "./motivation-books";

type Phase = "reading" | "questions" | "done";

function Stars({ count }: { count: number }) {
  return (
    <span className="mb-stars" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((star) => (
        <span key={star} aria-hidden="true">{star <= count ? "⭐" : "☆"}</span>
      ))}
    </span>
  );
}

export default function MotivationBooks({ grade, state, onBookComplete, onBack }: {
  grade: GradeId;
  state: MotivationBooksProgress | undefined;
  onBookComplete: (outcome: MotivationBookOutcome) => void;
  onBack: () => void;
}) {
  const completed = state?.completed ?? [];
  const bestScores = state?.bestScores ?? {};
  const [showAll, setShowAll] = useState(false);
  const [book, setBook] = useState<MotivationBook | null>(null);
  const [phase, setPhase] = useState<Phase>("reading");
  const [page, setPage] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const reported = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  const shelf = showAll ? motivationBooks : booksForGrade(grade);
  const question = book && phase === "questions"
    ? book.questions[questionIndex]
    : undefined;
  const lastPage = book ? page === book.pages.length - 1 : false;

  // Report the finished book exactly once, the moment the summary shows —
  // the same pattern Word Battle uses when a battle ends.
  useEffect(() => {
    if (!book || phase !== "done" || reported.current) return;
    reported.current = true;
    onBookComplete({ bookId: book.id, correct });
  }, [book, phase, correct, onBookComplete]);

  const open = (next: MotivationBook) => {
    reported.current = false;
    setBook(next);
    setPhase("reading");
    setPage(0);
    setQuestionIndex(0);
    setPicked(null);
    setCorrect(0);
  };
  const close = () => {
    setBook(null);
    setPhase("reading");
    setPage(0);
    setQuestionIndex(0);
    setPicked(null);
    setCorrect(0);
  };
  const answer = (optionIndex: number) => {
    if (!question || picked !== null) return;
    setPicked(optionIndex);
    if (optionIndex === question.answer) setCorrect((count) => count + 1);
  };
  const nextQuestion = () => {
    if (!book) return;
    if (questionIndex + 1 >= book.questions.length) {
      setPhase("done");
    } else {
      setQuestionIndex((index) => index + 1);
    }
    setPicked(null);
  };

  return (
    <section className="motivation-books" aria-label="Motivation Books">
      <button className="text-button back" onClick={onBack}>Back to adventures</button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MOTIVATION BOOKS · {gradeLabels[grade].toUpperCase()}</span>
          <h1 ref={heading} tabIndex={-1}>Little books, big feelings.</h1>
          <p>Read a short story about feelings and choices, then answer five questions.
            Every correct answer earns +{POINTS_PER_CORRECT} points, just like a regular adventure.
            Finished books get a ✓ on your shelf.</p>
        </div>
      </div>

      {!book && (
        <div className="panel mb-shelf-panel">
          <div className="mb-shelf-head">
            <h2>{showAll ? "Books for every level" : `Books for ${gradeLabels[grade]}`}</h2>
            <button
              className="text-button"
              onClick={() => setShowAll((value) => !value)}
              aria-expanded={showAll}
            >
              {showAll ? `Show only ${gradeLabels[grade]} books` : "Show books for all levels"}
            </button>
          </div>
          <p className="mb-shelf-count">
            You have finished {completed.length} of {motivationBooks.length} books.
          </p>
          <ul className="mb-shelf-grid">
            {shelf.map((entry) => {
              const finished = completed.includes(entry.id);
              const best = bestScores[entry.id];
              return (
                <li key={entry.id} className={`mb-book-card ${finished ? "is-finished" : ""}`}>
                  <span className="mb-book-emoji" aria-hidden="true">{entry.emoji}</span>
                  <strong>{entry.title}</strong>
                  <small className="mb-book-theme">{entry.theme}</small>
                  <small className="mb-book-meta">
                    {gradeLabels[entry.grade]} · {entry.pages.length} pages
                  </small>
                  {finished && (
                    <span className="mb-finished">
                      ✓ Finished{best !== undefined && <> · best <Stars count={starsForScore(best)} /></>}
                    </span>
                  )}
                  <button className="button primary mb-read" onClick={() => open(entry)}>
                    {finished ? `Read again` : `Read this book`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {book && phase === "reading" && (
        <article className="panel mb-reader" aria-label={book.title}>
          <button className="text-button" onClick={close}>Back to the bookshelf</button>
          <div className="mb-reader-head">
            <span className="mb-book-emoji" aria-hidden="true">{book.emoji}</span>
            <div>
              <h2>{book.title}</h2>
              <p className="mb-book-theme">{book.theme} · {gradeLabels[book.grade]}</p>
            </div>
          </div>
          <p className="mb-page-status" role="status">
            Page {page + 1} of {book.pages.length}
          </p>
          <progress aria-label="Book page progress" value={page + 1} max={book.pages.length} />
          <p className={`mb-page-text ${book.grade === "prek" || book.grade === "k" ? "mb-early-text" : ""}`}>
            {book.pages[page]}
          </p>
          <div className="mb-page-controls">
            <button className="button secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Back
            </button>
            {!lastPage ? (
              <button className="button primary" onClick={() => setPage((value) => value + 1)}>
                Next page
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => { setPhase("questions"); setQuestionIndex(0); setPicked(null); }}
              >
                Answer the questions
              </button>
            )}
          </div>
        </article>
      )}

      {book && phase === "questions" && question && (
        <div className="panel mb-quiz">
          <button className="text-button" onClick={close}>Back to the bookshelf</button>
          <p className="mb-round-label">
            {book.emoji} {book.title} · Question {questionIndex + 1} of {book.questions.length}
          </p>
          <h2 className="mb-prompt">{question.prompt}</h2>
          <div className="answer-grid">
            {question.options.map((option, i) => (
              <button
                key={option}
                data-answer={option}
                disabled={picked !== null}
                className={`answer-option ${picked !== null && picked === i ? (i === question.answer ? "right-answer" : "wrong-answer") : ""} ${picked !== null && i === question.answer ? "right-answer" : ""}`}
                onClick={() => answer(i)}
              >
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="option-copy">{option}</span>
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="mb-feedback" role="status">
              <p>{picked === question.answer
                ? "⭐ That's right! "
                : "Good thinking — let's learn from this one. "}
                {question.explanation}</p>
              <button className="button primary" onClick={nextQuestion}>
                {questionIndex + 1 >= book.questions.length ? "See my results" : "Next question"}
              </button>
            </div>
          )}
        </div>
      )}

      {book && phase === "done" && (
        <div className="panel mb-done">
          <span className="mb-book-emoji" aria-hidden="true">🎉</span>
          <h2>You finished “{book.title}”!</h2>
          <p className="mb-done-stars"><Stars count={starsForScore(correct)} /></p>
          <p>You answered {correct} of {book.questions.length} questions correctly
            and earned <strong>{correct * POINTS_PER_CORRECT} points</strong>.</p>
          <p>{correct === book.questions.length
            ? "A perfect read — every answer right! This book now has a ✓ on your shelf."
            : correct >= 3
              ? "Wonderful reading! This book now has a ✓ on your shelf — read it again any time."
              : "Great job finishing the whole book! It now has a ✓ on your shelf. Reading it again is a super way to grow."}</p>
          <div className="mb-done-actions">
            <button className="button primary" onClick={close}>Back to the bookshelf</button>
            <button className="button secondary" onClick={() => open(book)}>Read it again</button>
          </div>
        </div>
      )}
    </section>
  );
}
