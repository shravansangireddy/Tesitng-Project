import { useEffect, useRef, useState } from "react";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import { pictureBooks, type PictureScene } from "./books";
import "./books.css";

export function BookPicture({ scene, count, description, showBridge = true }: {
  scene: PictureScene; count: number; description: string; showBridge?: boolean;
}) {
  const night = scene === "sky" || scene === "moon";
  return <svg className={`book-picture book-picture-${scene}`} viewBox="0 0 600 300" role="img" aria-label={description}>
    <rect width="600" height="300" rx="22" fill={night ? "#202853" : "#d9f3ff"} />
    {night ? scene === "moon" && <circle cx="455" cy="85" r="48" fill="#fff3c2" />
      : <><circle cx="510" cy="58" r="32" fill="#ffd264" /><path d="M25 67q20-25 40 0q25-35 45 0Z" fill="white" /></>}
    <path d="M0 235Q160 185 300 235T600 230V300H0Z" fill={night ? "#365c64" : "#8bc98e"} />
    {(scene === "pond" || scene === "bridge") && <>
      <ellipse cx="300" cy="232" rx="278" ry="61" fill="#64c8e2" />
      {scene === "pond" && <path d="M55 249V132m0 62-24-30m24 48 24-37M82 251V152" stroke="#317047" strokeWidth="8" fill="none" />}
      {scene === "bridge" && showBridge && <><path d="M20 175Q300 102 580 175" fill="none" stroke="#885533" strokeWidth="18" />
        <path d="M20 123Q300 50 580 123M40 172v-52m130 28V94m130 46V86m130 62V94m130 78v-52" stroke="#704427" strokeWidth="8" fill="none" /></>}
    </>}
    {scene === "robot" && <g transform="translate(460 142)">
      <rect x="-40" y="-55" width="80" height="64" rx="14" fill="#805ac4" />
      <path d="M0-55v-17" stroke="#44346a" strokeWidth="5" /><circle cy="-78" r="8" fill="#ffca59" />
      <circle cx="-16" cy="-27" r="6" fill="white" /><circle cx="16" cy="-27" r="6" fill="white" />
      <path d="M-15-9q15 15 30 0" fill="none" stroke="white" strokeWidth="4" />
      <rect x="-33" y="13" width="66" height="55" rx="8" fill="#a888e6" />
      <circle cx="-24" cy="77" r="13" fill="#34304e" /><circle cx="24" cy="77" r="13" fill="#34304e" />
    </g>}
    {Array.from({ length: count }, (_, i) => {
      const x = 115 + i * 86;
      if (scene === "garden") return <g key={i} transform={`translate(${x} 165)`}>
        <path d="M0 6v81m0-31q-40-32-27-4m27 20q40-32 27-4" stroke="#317047" strokeWidth="7" fill="none" />
        {[0, 60, 120, 180, 240, 300].map(angle => <ellipse key={angle} cy="-17" rx="14" ry="22" fill="#d84e87" transform={`rotate(${angle})`} />)}
        <circle r="13" fill="#ffda67" /></g>;
      if (scene === "pond") return <g key={i} transform={`translate(${x} ${207 + (i % 2) * 25})`}>
        <path d="M-29 26q29 8 58 0" fill="none" stroke="#24748d" strokeWidth="3" />
        <ellipse rx="25" ry="16" fill="#ffe17b" /><circle cx="17" cy="-19" r="14" fill="#ffe17b" />
        <path d="m29-20 15 6-16 5" fill="#b66022" /><circle cx="21" cy="-23" r="3" fill="#282d49" />
        <path d="M-12-2q14 18 25 0" stroke="#c28e25" strokeWidth="3" fill="none" /></g>;
      if (scene === "bridge") return <ellipse key={i} cx={x} cy={247 - (i % 2) * 12} rx="29" ry="12" fill="#697b89" />;
      if (scene === "robot") return <rect key={i} x={40 + i * 74} y="246" width="62" height="24" rx="5" fill="#ffda67" stroke="#936d20" strokeWidth="2" />;
      if (scene === "kite") return <g key={i} transform={`translate(${x} ${65 + (i % 2) * 40})`}>
        <path d="m0 0 24 30-24 40-24-40Z" fill="#d84656" stroke="#94273c" strokeWidth="2" />
        <path d="M0 0v70m-24-40h48M0 70q-20 35 0 55t-10 45" stroke="#94273c" fill="none" strokeWidth="2" />
      </g>;
      return <path key={i} d="m0-20 6 13 15 2-11 11 3 15-13-7-13 7 3-15-11-11 15-2Z"
        transform={`translate(${60 + i * 74} ${60 + (i % 2) * 65})`} fill="#ffe49a" />;
    })}
  </svg>;
}

export default function BookShelf({ grade, onGradeChange }: {
  grade: GradeId; onGradeChange: (grade: GradeId) => void;
}) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const book = pictureBooks.find(item => item.id === bookId && item.grade === grade);
  useEffect(() => { title.current?.focus(); }, [bookId, page]);
  const levelBooks = pictureBooks.filter(item => item.grade === grade);
  return <section className="book-world panel" aria-label="Picture book library">
    <div className="book-library-top">
      <div><span className="eyebrow">PICTURE BOOK ISLAND</span><h1 ref={!book ? title : undefined} tabIndex={-1}>Your little bookshelf</h1></div>
      <label htmlFor="book-grade">Reading grade
        <select id="book-grade" value={grade} onChange={event => {
          const next = gradeIds.find(id => id === event.target.value);
          if (next) { setBookId(null); setPage(0); setAnswer(null); onGradeChange(next); }
        }}>{gradeIds.map(id => <option key={id} value={id}>{gradeLabels[id]}</option>)}</select>
      </label>
    </div>
    <p>Two original illustrated mini-books for {gradeLabels[grade]}. Try a story or discover something new.
      {" "}Read together, point to pictures, and talk about your ideas. Choose an easier or harder grade with your grown-up;
      these are suggested practice levels, not measured reading scores.</p>
    <p className="book-note">Your grade is saved with your learning preference. Book pages and answers are temporary:
      no reading history, points, or voice data are recorded. No outside book sites or downloads are needed.</p>
    {!book ? <div className="book-grid">
      {levelBooks.map(item => <article className="book-card" key={item.id}>
        <BookPicture scene={item.scene} count={item.pages[0].count} description={item.pages[0].picture} showBridge={item.id !== "1-bridge"} />
        <div><span className="eyebrow">{item.kind} · {gradeLabels[grade]} · {item.pages.length} pages</span>
          <h2>{item.title}</h2><p>{item.focus}</p>
          <button className="button primary" onClick={() => { setBookId(item.id); setPage(0); setAnswer(null); }}>Read {item.title}</button>
        </div>
      </article>)}
    </div> : <article className="book-reader" aria-label={book.title}>
      <button className="text-button" onClick={() => { setBookId(null); setPage(0); setAnswer(null); }}>Back to bookshelf</button>
      <h2 ref={title} tabIndex={-1}>{book.title}</h2>
      <p className="book-page-status" role="status">Page {page + 1} of {book.pages.length} · {book.kind}</p>
      <progress aria-label="Book page progress" value={page + 1} max={book.pages.length} />
      <figure><BookPicture scene={book.scene} count={book.pages[page].count} description={book.pages[page].picture} showBridge={book.id !== "1-bridge" || page >= 2} />
        <figcaption>{book.pages[page].picture}</figcaption></figure>
      <p className={`book-page-text ${grade === "prek" || grade === "k" ? "book-early-text" : ""}`}>{book.pages[page].text}</p>
      <div className="book-page-controls">
        <button className="button secondary" disabled={page === 0} onClick={() => setPage(current => current - 1)}>Previous page</button>
        <button className="button primary" disabled={page === book.pages.length - 1} onClick={() => setPage(current => current + 1)}>Next page</button>
      </div>
      {page === book.pages.length - 1 && <section className="book-question" aria-label="Book question">
        <h3>You reached the end! Let's think together.</h3>
        <p>{book.question}</p>
        <div className="book-answer-options">{book.choices.map((choice, index) =>
          <button key={choice} className="button secondary" aria-pressed={answer === index}
            onClick={() => setAnswer(index)}>{choice}</button>)}</div>
        {answer !== null && <p className="book-feedback" role="status">
          {answer === book.answer ? "You found it! " : "Let's look again. "}
          {book.explanation} {answer !== book.answer && "You can try another answer."}
        </p>}
        <button className="text-button" onClick={() => { setPage(0); setAnswer(null); }}>Read again from the beginning</button>
      </section>}
    </article>}
  </section>;
}
