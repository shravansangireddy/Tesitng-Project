export interface RealBook {
  id: string;
  title: string;
  ages: string;
  pages: number;
  pdf: string;
  credit: string;
}

// Real picture books shared by their publishers under Creative Commons
// CC BY 4.0 licences — free to read, download, print, and share with
// credit. Page images live in public/books/pages/<id>-pNN.webp and the
// full PDFs in public/books/<pdf>. Full attribution is printed inside
// each book and repeated in `credit` here and beside the reader.
export const realBooks: RealBook[] = [
  { id: "fossils", title: "Fossils: Tales of Long Ago", ages: "Grades 2–5 · Nonfiction", pages: 19, pdf: "fossils-tales-of-long-ago.pdf", credit: "Written by Anupama Chandrasekaran · Illustrated by Rai · © Pratham Books, 2021 · CC BY 4.0" },
  { id: "how-many", title: "How Many?", ages: "Pre-K–Grade 1 · Counting", pages: 20, pdf: "how-many.pdf", credit: "Written by Sudeshna Shome Ghosh · Illustrated by Sayan Mukherjee · © Pratham Books, 2021 · CC BY 4.0" },
  { id: "croak", title: "Croak", ages: "Grades 1–3 · Story", pages: 16, pdf: "croak.pdf", credit: "Written by Kavitha Punniyamurthi · Illustrated by Ekta Bharti · © Pratham Books, 2020 · CC BY 4.0" },
  { id: "colours", title: "Colours", ages: "Pre-K–Kindergarten · First words", pages: 24, pdf: "colours.pdf", credit: "Written by Priyanka · Illustrated by Ajanta Guhathakurta · Translated by Alisha Berger · © Room to Read, 2015 · CC BY 4.0" },
  { id: "rain", title: "Rain", ages: "Pre-K–Grade 1 · Nature", pages: 12, pdf: "rain.pdf", credit: "Written by Letta Machoga · Illustrated by Marleen Visser · © African Storybook Initiative, 2014 · CC BY 4.0" },
  { id: "i-feel", title: "I Feel…", ages: "Pre-K–Grade 1 · Feelings", pages: 20, pdf: "i-feel.pdf", credit: "By Craig Aldred · © Bloom Library, 2015 · CC BY 4.0" },
];

export const realBookPageSrc = (book: RealBook, page: number) =>
  `/books/pages/${book.id}-p${String(page + 1).padStart(2, "0")}.webp`;
