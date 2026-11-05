import { useState, type ChangeEvent } from "react";
import { gradeLabels } from "./content-schema";
import type { MotivationBook } from "./motivation-books";
import {
  TEACHER_BOOK_SKELETON,
  TEACHER_BOOK_TEMPLATE,
  newTeacherBookId,
  parseTeacherBook,
  type TeacherStore,
} from "./teacher-books";
import "./teacher-studio.css";

// The Teacher Studio: a grown-up who teaches can switch the teacher
// role on here and add their own Motivation Books — written in a
// simple plain-text format, checked line by line, then saved onto the
// Motivation Books shelf with a "From my teacher" badge. Uploads live
// in the device's teacher store (see teacher-books.ts); they are not
// published anywhere and nobody else's account can see them.
export default function TeacherStudio({
  store,
  onStoreChange,
}: {
  store: TeacherStore;
  onStoreChange: (store: TeacherStore) => void;
}) {
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Omit<MotivationBook, "id"> | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  function downloadTemplate() {
    const url = URL.createObjectURL(
      new Blob([TEACHER_BOOK_TEMPLATE], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "motivation-book-template.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setDraft(await file.text());
      setErrors([]);
      setPreview(null);
      setNotice(`Loaded “${file.name}”. Press Check my book when you're ready.`);
    } catch {
      setNotice("That file could not be read. Try pasting the text instead.");
    }
  }

  function checkDraft() {
    const result = parseTeacherBook(draft);
    setErrors(result.errors);
    setPreview(result.book);
    setNotice(
      result.book
        ? null
        : "Almost there — fix the items below, then check again.",
    );
  }

  function saveBook() {
    if (!preview) return;
    const book: MotivationBook = { ...preview, id: newTeacherBookId() };
    onStoreChange({ ...store, books: [...store.books, book] });
    setNotice(
      `Saved “${book.title}”. It is on the Motivation Books shelf now, with a From my teacher badge.`,
    );
    setDraft("");
    setPreview(null);
    setErrors([]);
  }

  function deleteBook(book: MotivationBook) {
    if (!window.confirm(`Delete “${book.title}” from this device?`)) return;
    onStoreChange({
      ...store,
      books: store.books.filter((entry) => entry.id !== book.id),
    });
    setNotice(`Deleted “${book.title}”.`);
  }

  return (
    <section className="teacher-studio" aria-labelledby="teacher-studio-title">
      <h2 id="teacher-studio-title">Teacher Studio</h2>
      {!store.teacher ? (
        <>
          <p>
            Teachers can write their own short Motivation Books — a little
            story, five friendly questions, points and stars for young
            readers — and add them to this device's Motivation Books shelf.
          </p>
          <label className="ts-switch">
            <input
              type="checkbox"
              checked={false}
              onChange={(event) =>
                onStoreChange({ ...store, teacher: event.target.checked })
              }
            />
            Are you a teacher? Turn on the Teacher Studio.
          </label>
        </>
      ) : (
        <>
          <label className="ts-switch">
            <input
              type="checkbox"
              checked
              onChange={(event) =>
                onStoreChange({ ...store, teacher: event.target.checked })
              }
            />
            Teacher Studio is on. Your uploaded books stay saved below.
          </label>
          <p>
            Write your book in the plain-text format below — a title, a
            grade, a theme, 3 to 6 story pages, then exactly 5 questions,
            each with 3 or 4 choices, one correct ANSWER letter, and a
            short WHY. Paste the text (or upload a .txt file), press Check
            my book, and the checker will point at anything to fix before
            you save. Saved books appear on the Motivation Books shelf
            with a <strong>From my teacher</strong> badge and play just
            like the built-in books.
          </p>
          <p className="ts-note">
            Your books are saved on this device for the children who learn
            here. They are not published or shared with other accounts.
          </p>
          <details className="ts-format">
            <summary>See the exact format</summary>
            <pre>{TEACHER_BOOK_SKELETON}</pre>
          </details>
          <div className="ts-actions">
            <button type="button" onClick={downloadTemplate}>
              Download template (.txt)
            </button>
            <label className="button ts-upload">
              Upload a .txt file
              <input type="file" accept=".txt,text/plain" onChange={loadFile} />
            </label>
          </div>
          <label className="ts-draft-label" htmlFor="ts-draft">
            Your book text
          </label>
          <textarea
            id="ts-draft"
            className="ts-draft"
            rows={16}
            value={draft}
            placeholder="Paste your book here, starting with BOOK TITLE: …"
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="ts-actions">
            <button type="button" onClick={checkDraft}>
              Check my book
            </button>
            {preview && (
              <button type="button" onClick={saveBook}>
                Save to the shelf
              </button>
            )}
          </div>
          {errors.length > 0 && (
            <div className="ts-errors" role="alert">
              <p>
                <strong>
                  {errors.length === 1
                    ? "One thing to fix:"
                    : `${errors.length} things to fix:`}
                </strong>
              </p>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {preview && (
            <div className="ts-preview">
              <h3>
                {preview.emoji} {preview.title}
              </h3>
              <p>
                {gradeLabels[preview.grade]} · Theme: {preview.theme} ·{" "}
                {preview.pages.length} pages · {preview.questions.length}{" "}
                questions
              </p>
              {preview.description && (
                <p>
                  <strong>What grown-ups will see:</strong>{" "}
                  {preview.description}
                </p>
              )}
              <p className="ts-preview-page">{preview.pages[0]}</p>
              <p>
                Looking good! Press <strong>Save to the shelf</strong> to add
                it to Motivation Books.
              </p>
            </div>
          )}
          {store.books.length > 0 && (
            <>
              <h3>Your uploaded books</h3>
              <ul className="ts-book-list">
                {store.books.map((book) => (
                  <li key={book.id} className="ts-book-row">
                    <span>
                      {book.emoji} <strong>{book.title}</strong>{" "}
                      <small>
                        {gradeLabels[book.grade]} · {book.pages.length} pages
                      </small>
                    </span>
                    <button type="button" onClick={() => deleteBook(book)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {notice && (
        <p className="ts-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
