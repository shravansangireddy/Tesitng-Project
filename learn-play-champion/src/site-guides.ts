// Original parent skill guides for the /learn grade pages. Each grade gets
// three English and three math guides. Every guide explains what the skill
// is and why it matters at that grade, how the app practices it, and simple
// at-home activities a grown-up can do with ordinary household things.
export interface SkillGuide {
  skill: string;
  what: string;
  practice: string;
  home: string;
  activities: string[];
}

export const gradeSkillGuides: Record<string, { english: SkillGuide[]; math: SkillGuide[] }> = {
  "pre-k": {
    english: [
      {
        skill: "Letters and the sounds they make",
        what: "Letter learning is the very first step toward reading. In Pre-K, children begin to notice that the marks on a page are letters, that each letter has a name, and that letters stand for sounds in the words we say. Most children start with the letters in their own name, because those letters feel personal and important. There is no rush to know the whole alphabet. Steady, playful exposure — seeing letters on signs, in books, and on the fridge door — builds recognition far better than drilling with flashcards until a small child is frustrated.",
        practice: "In English Forest, Pre-K letter activities show a letter and ask your child to find its match, or the picture whose name starts with its sound, while a grown-up reads the choices aloud. Questions are short and forgiving, and the explanation names the letter and its sound one more time, so hearing it twice becomes part of the game. Sit alongside and say the sounds out loud together — at this age, your voice is the main teaching tool.",
        home: "Letters hide everywhere once you start looking. Try these together:",
        activities: [
          "Go on a letter hunt at home: pick one letter, then find it together on food boxes, books, and mail. Celebrate every find, even the same letter found twice.",
          "Trace letters in a shallow tray of dry rice, flour, or sand with a finger. The wobbly, touchable part matters much more than neat shapes at this age.",
          "Sing the alphabet song slowly while pointing at a printed alphabet, so the song connects to real letters instead of running together as one long word.",
        ],
      },
      {
        skill: "Words we know on sight",
        what: "A few short, common words — like the, my, see, and go — appear so often in books that readers eventually recognize them instantly, without sounding anything out. Pre-K children are not expected to read these words alone yet, but noticing them is a strong start. When a child spots the word 'the' in a storybook and announces 'I know that one!', they are learning that print carries meaning and that some words come back again and again. That noticing is genuine reading readiness.",
        practice: "The app's early word activities show one familiar word and ask your child to pick the matching word or the picture it names, always with adult read-aloud support. Because the same small set of words returns across activities, children get the gentle repetition that makes recognition stick, without any timer or pressure. If your child guesses from the picture or the first letter, that is fine — guessing this way is exactly how early word learning begins.",
        home: "You can make familiar words part of everyday talk:",
        activities: [
          "Write three favorite words — your child's name, a family word like 'Dad', and a beloved word like 'dog' — on sticky notes, and let your child stick each one on the right person, pet, or picture.",
          "During a bedtime story, pause when a word your child knows appears and let them 'read' that word out loud while you read the rest of the sentence.",
          "Make two sets of word cards by hand and play a matching game. Matching identical words builds the visual memory that knowing words on sight depends on.",
        ],
      },
      {
        skill: "Listening to stories",
        what: "Long before children can read stories by themselves, they learn how stories work by listening. A Pre-K listener practices paying attention from beginning to end, remembering who is in the story, noticing what happened first and what happened next, and guessing what might happen after that. These are the same comprehension skills older readers use on every page — right now they are simply carried by the ears instead of the eyes. Talking about a story matters as much as hearing it: a child who retells a story in their own words is building real understanding.",
        practice: "The app includes short read-aloud stories and mini-books for every level, with a friendly question at the end about something that happened in the story. A grown-up reads aloud while the child follows the pictures, so the question checks listening rather than decoding. When an answer is wrong, the explanation gently points back to a detail in the story, which models the habit of checking the words and pictures instead of guessing wildly.",
        home: "Story talk works with any book — or even without one:",
        activities: [
          "After any picture book, ask three small questions: Who was in the story? What happened first? What happened at the end? Short answers are fine; they grow over time.",
          "Pause just before a page turn and ask, 'What do you think happens next?' There are no wrong predictions — the point is picturing the story as it unfolds.",
          "Retell a favorite story together with stuffed animals acting it out, and let your child correct you when you 'forget' a part. Correcting you means they remember the sequence.",
        ],
      },
    ],
    math: [
      {
        skill: "Counting and comparing small groups",
        what: "Counting looks simple, but a young child is learning several ideas at once: the number words always go in the same order, each object gets exactly one number word, and the last number said tells how many there are altogether. Comparing comes next — seeing that four crackers is more than two — which grows into the idea of bigger and smaller numbers. Pre-K counting in the app stays with small groups a child can actually see and touch, because understanding five deeply matters far more than reciting to fifty.",
        practice: "On Math Mountain, Pre-K counting questions show a small group of pictures and ask how many there are, or which group has more. A grown-up can count aloud with the child, pointing to each picture as they go. The answers stay within small numbers on purpose, so the counting itself is the skill being practiced. The explanation counts the group again slowly, which reinforces the one-point, one-number habit that makes counting reliable.",
        home: "Counting fits into ordinary moments all day long:",
        activities: [
          "Count real things that have a job: stairs as you climb, spoons as you set the table, socks as you sort laundry. Touch or move each item as you count it.",
          "Make two small piles of snacks and ask which pile has more — then count both piles together to check. Checking turns a guess into early math reasoning.",
          "Play 'give me a number': ask for three crayons, five blocks, or two apples, and let your child count them one by one into your hand.",
        ],
      },
      {
        skill: "Patterns and sorting",
        what: "A pattern is something that repeats in a way you can predict — red, blue, red, blue. Noticing what comes next in a pattern is one of the earliest forms of mathematical thinking, because it asks a child to find a rule rather than a single answer. Sorting builds the same skill from the other side: grouping objects by color, size, or kind teaches children to notice likenesses and explain them in words. Both skills quietly prepare children for number patterns, skip counting, and early problem solving in the grades ahead.",
        practice: "Pattern questions in the app show a short repeating sequence of pictures or shapes and ask what comes next, and sorting questions ask children to put pictures into groups that belong together. The explanations say the repeating rule out loud — 'circle, square, circle, square' — which helps children learn to say the rule themselves instead of just spotting an answer. Keep your own voice in it: before they answer, ask 'What do you see repeating?'",
        home: "Patterns are easy to build with whatever is already on the floor:",
        activities: [
          "Make clap-and-pat patterns together — clap, pat your knees, clap, pat your knees — then let your child continue the pattern, and eventually invent one for you to copy.",
          "Line up spoons and forks in a repeating order and leave one gap; ask your child what belongs in the empty spot, and what makes them think so.",
          "Sort a mixed basket of toys or laundry by one rule, then mix everything up and sort by a different rule, such as size instead of color.",
        ],
      },
      {
        skill: "Shapes and fair sharing",
        what: "Young children learn shapes by seeing and touching them everywhere: a round plate, a square cracker, a triangular slice of sandwich. Naming circles, squares, rectangles, and triangles — and finding them hiding in real rooms — builds the spatial sense that later geometry depends on. Sharing belongs in the same guide: splitting a set of objects or a snack into equal groups is a child's first experience of fairness in numbers, and it becomes the foundation for division and fractions a few years from now.",
        practice: "The app's Pre-K shape questions ask children to find or name a shape, sometimes hidden inside a bigger picture, and sharing questions show a small set of items being split between two characters. Explanations point to a shape's sides and corners in plain words, and count shared items out one by one, so 'fair' becomes something children can see and check, not just a word grown-ups use.",
        home: "Shape talk and sharing practice need no special materials:",
        activities: [
          "Take a shape walk: find one circle, one square, and one triangle somewhere in your home or on your street, and let your child announce each find.",
          "Cut a sandwich, or a folded piece of paper, into two equal halves and then into quarters, talking about whether each person got the same amount.",
          "Deal out cards, berries, or blocks to two stuffed animals — 'one for you, one for you' — until they are gone, then count each pile to prove it was fair.",
        ],
      },
    ],
  },
  kindergarten: {
    english: [
      {
        skill: "Beginning sounds and phonics",
        what: "Phonics is the understanding that letters stand for sounds, and sounds join together to make words. Kindergarten starts at the front of the word: hearing that 'sun' begins with the /s/ sound, that 'map' and 'moon' start the same way, and that rhyming words like cat and hat share an ending. Children who can hear and play with the sounds inside words are building the exact skill they will use to sound out their first real books, so this sound play is serious learning dressed up as a game.",
        practice: "Kindergarten sound activities in English Forest ask children things like which picture starts with the same sound as a spoken word, or which word rhymes with a word they hear. A grown-up reads everything aloud — at this level the app is testing ears, not eyes. The explanations repeat the sounds slowly, and saying them along with the app, stretched out like a rubber band, genuinely helps the idea land.",
        home: "Sound games work beautifully in the car, the bath, and the kitchen:",
        activities: [
          "Play sound I-spy: 'I spy something that starts with /b/.' Accept the sound, not the letter name — hearing sounds is the skill being built.",
          "Clap the rhymes: say a word and ask your child for a rhyming word, real or silly. Silly rhymes count; they show your child is listening to sounds.",
          "Sort the groceries or the laundry basket by beginning sound — socks, soap, and spoons in one pile — and let your child name the sound that links them.",
        ],
      },
      {
        skill: "Words we spot right away",
        what: "Some words show up in nearly every book a young child opens: I, the, and, is, you, like. These words are hard to sound out — 'the' does not behave politely — so beginning readers learn to recognize them on sight, the way they recognize a friend's face. Each word a kindergartner knows instantly frees up attention for the harder, interesting words on the page, which is why teachers keep a short, friendly list of these words in steady rotation all year.",
        practice: "The app's kindergarten word activities present one common word at a time and ask children to find it again among a few choices, or match it to a simple sentence read aloud. The same words return across sessions in new company, which is precisely how instant recognition forms. There is no speed demand — spotting the word comfortably is the whole goal, and explanations show the word in a short, readable sentence.",
        home: "Keep these words visible and playful around the house:",
        activities: [
          "Put three or four of this week's words on the fridge with magnets or sticky notes, and let your child be the one to read them to anyone who walks by.",
          "Hunt for one chosen word in a bedtime book: every time it appears, your child reads it and you read everything else. Familiar books work best.",
          "Write words big on paper and play a gentle swat game with a rolled-up magazine — call a word, and your child finds and taps it.",
        ],
      },
      {
        skill: "Sentences and story details",
        what: "In kindergarten, children begin to see that a sentence is a complete thought — it starts with a capital letter, it tells about someone or something, and it ends with a mark that tells the reader how to say it. Alongside that, young listeners practice pulling details out of a story: who was there, where it happened, and one thing that took place. These two skills — knowing what a sentence is, and noticing what a text actually says — carry every bit of reading and writing that comes later.",
        practice: "Sentence activities in the app ask children to choose the group of words that makes a complete sentence, or to notice what a real sentence needs at its start and end, with everything read aloud by a grown-up. Story questions ask for one detail at a time and point back to the page when an answer is checked. The short explanations keep the language simple: a sentence tells a whole idea, and details are the small true things the story said.",
        home: "Sentence and story talk fit naturally into reading time:",
        activities: [
          "Read one page of a book, then have your child tell you one thing that happened on it. One true detail is a complete success.",
          "Play 'finish my sentence': start with 'The dog is…' and let your child finish the thought out loud, then swap roles and finish theirs.",
          "Draw the story: after a short book, your child draws the main character and one thing that happened, and tells you about the picture in a full sentence.",
        ],
      },
    ],
    math: [
      {
        skill: "Counting, comparing, and numbers to 100",
        what: "Kindergarten counting has two layers. The first is the counting sequence itself — the words one through one hundred, in order, including the tricky teen numbers and the jumps from twenty-nine to thirty. The second layer is deeper: understanding that numbers mean amounts, that seventeen is more than twelve in a way you can show, and that the number after another is always exactly one more. Children who only recite numbers have the song; children who can count objects and compare groups have the meaning underneath the song.",
        practice: "Math Mountain counting activities for kindergarten ask children to count pictured groups, choose the number that matches, and decide which of two groups or numbers is more or fewer. Picture groups are kept countable — a child can point to each item — and explanations count the group aloud in order. Comparing questions introduce the words more, fewer, and equal in situations a child can verify by counting both sides.",
        home: "Big counting grows out of small daily counting:",
        activities: [
          "Keep a collection to count — bottle caps, pebbles, or crayons — and count it often, sometimes starting from a number other than one, like 'Let's count from 7.'",
          "Play the comparison game with two handfuls of snacks: guess which hand has more, then count both to settle it fairly.",
          "Count to one hundred in chunks across the day — ten on the stairs, ten at the door — so the full sequence feels friendly instead of enormous.",
        ],
      },
      {
        skill: "Adding and subtracting with real things",
        what: "For a kindergartner, addition is not a symbol on a worksheet — it is what happens when two more blocks join the tower, and subtraction is what happens when three grapes get eaten. Children build these ideas by joining groups, taking away from groups, and telling tiny stories about what happened. The plus and minus signs come later and simply record what their hands already know. Working within ten keeps the amounts small enough to see, count, and trust.",
        practice: "The app's early arithmetic questions show picture groups being joined or partly removed, and ask how many there are now, with a grown-up free to count aloud alongside. The pictures do the heavy lifting: children can count all the items, count on from the first group, or count what is left. Explanations retell the little story in numbers, connecting what happened to the answer in words a child can repeat.",
        home: "The best early math kit is a handful of anything small:",
        activities: [
          "Tell snack math stories: 'You have four berries. I give you two more. How many now?' Let your child act it out and eat the answer.",
          "Hide some counters under a cup: show seven, hide some while eyes are closed, and let your child figure out how many are hiding by counting what is left.",
          "Roll one die and have your child build that number with blocks, then roll again and add the new blocks on. Say the total together.",
        ],
      },
      {
        skill: "Shapes, sorting, and first data",
        what: "Kindergarten geometry is about describing, not just naming: a triangle has three sides and three corners wherever it sits, even upside down, and a rectangle stretched long is still a rectangle. Sorting and simple data grow from the same careful looking — children group things by a rule, count how many landed in each group, and answer questions like 'Which group has the most?' That is a child's first chart, built out of real objects before it is ever drawn on paper.",
        practice: "Shape activities in the app ask children to name shapes in different positions and sizes and to notice sides and corners, while sorting activities group pictured objects and count the groups. Explanations point at the features that make the answer true — 'four equal sides' — rather than relying on how a shape happens to look. Data questions stay tiny: two or three groups, counted out loud, with a clear winner or a tie to discover.",
        home: "Sorting something real beats any worksheet at this age:",
        activities: [
          "Empty a junk drawer or button jar together and invent a sorting rule, then count each pile and declare which pile won.",
          "Build a shape with sticks, straws, or crayons and count its sides and corners out loud; then flip it over and check whether it is still the same shape.",
          "Make a family favorites tally on paper — marks for apples versus bananas at snack time — and count the marks to read your first graph together.",
        ],
      },
    ],
  },
  "grade-1": {
    english: [
      {
        skill: "Vowel patterns and word families",
        what: "English spelling looks wild until children notice its patterns. In Grade 1, the big discovery is that vowels behave differently depending on their company: the a in cap says its short sound, while the a in cape, with a silent e standing guard, says its name. Word families make the same point in groups — a child who can read 'cat' is one letter away from bat, hat, and flat. Learning these patterns means children stop memorizing every word as a separate picture and start decoding new words on their own.",
        practice: "English Forest vowel activities ask children to choose the word that matches a picture or a spoken word, pick the right word to finish a sentence, or sort words by their vowel sound. Because the choices differ by one small spelling change, children have to actually look at the pattern instead of guessing from length. Explanations name the pattern in plain words — 'the silent e makes the a say its name' — so a grown-up can reuse the same phrase later during book reading.",
        home: "Word families are wonderfully gameable at home:",
        activities: [
          "Build a word family with letter cards or magnets: keep '-at' fixed and swap the first letter to make new words, reading each one aloud together.",
          "Hunt for silent-e words in a bedtime book and let your child tap each one and read it with its long vowel sound.",
          "Write two short word lists — short-a words and long-a words — and race to sort a mixed handful of word cards into the right pile.",
        ],
      },
      {
        skill: "Putting stories in order",
        what: "Understanding a story means holding its shape in mind: something happened first, something happened next, and something wrapped it up at the end. Grade 1 readers practice retelling in order, noticing signal words like first, then, and finally, and finding the detail in the text that proves where an event belongs. Sequence matters beyond stories, too — instructions, recipes, and explanations all lean on order. A child who can say 'First this, then that, because the book told us' is reasoning about text, not just remembering it.",
        practice: "Story questions in the app follow short passages written for each grade and ask what happened first, what a character did next, or which detail the story actually gave. The passage stays available in the child's mind because it is short, and the explanations point back to the exact sentence that settles the question. Informational questions work the same muscle on nonfiction: find the detail, in the order the text presented it, rather than answering from what the child already believes.",
        home: "Sequencing practice hides inside everyday routines:",
        activities: [
          "After reading, retell the story with three drawings — beginning, middle, end — and let your child put shuffled drawings back in order and explain the choice.",
          "Cook something simple together and have your child give the steps in order before you start, using the words first, next, and last.",
          "Ask 'What happened in your day?' and gently press for the order of events: what came before lunch, and what came after?",
        ],
      },
      {
        skill: "Writing sentences and giving an opinion",
        what: "Grade 1 writing begins with the humble complete sentence: it starts with a capital letter, it says something whole about someone or something, and it ends with a period, question mark, or exclamation point that fits its job. On top of that foundation, young writers learn the opinion pattern — say what you think, then give a reason with the word because. That tiny structure, a claim plus a reason, is the seed of every essay, argument, and persuasive letter your child will ever write.",
        practice: "Writing-preparation activities in the app are multiple-choice by design: children choose the sentence that is written correctly, pick the end mark a sentence needs, or select the reason that best supports an opinion. This lets them practice a writer's judgment before handwriting and spelling can slow them down. The real writing happens on paper with a grown-up, and the explanations give you the exact language to use there — 'This sentence needs a capital at the start.'",
        home: "Keep real writing short, real, and praised for its ideas:",
        activities: [
          "Write one sentence together each day — about the weather, a pet, or a meal — and let your child add the capital letter and end mark as the finishing job.",
          "Play opinion-of-the-day at dinner: best fruit, best game, best color. Everyone must say their pick and a because-reason, children first.",
          "Fix-it game: write a sentence with the capital letter or end mark missing, and let your child be the editor who catches the mistake with a red crayon.",
        ],
      },
    ],
    math: [
      {
        skill: "Adding and subtracting within 20",
        what: "Grade 1 arithmetic moves from counting everything, one by one, to using smarter strategies. Children learn to count on from the bigger number instead of starting over, to use doubles they know — 6 + 6 — to crack near-doubles like 6 + 7, and above all to make a ten: 8 + 5 becomes 8 + 2 + 3, an easier problem wearing the same answer. These strategies are not tricks; they are the beginning of mental math, and they make later multi-digit work feel familiar instead of frightening.",
        practice: "Arithmetic activities on Math Mountain mix plain number questions with small story problems inside twenty, and the hints often suggest a strategy rather than just urging another guess. Explanations show one clean path — counting on, or making a ten — so children see that there is a way to figure an answer out, not just to know it or not. If your child still counts on fingers, that is a fine stage; strategies arrive through practice, not pressure.",
        home: "Short, cheerful number games build these strategies best:",
        activities: [
          "Play 'make ten' with a deck of cards: lay out pairs and hunt for two cards that add to ten, like 7 and 3, and say the pair out loud.",
          "Use two dice and ask your child to add by counting on — 'Start at 6… 7, 8, 9, 10' — tapping fingers only as needed.",
          "Tell take-away stories with objects: twelve grapes, four get eaten, and your child shows the subtraction with the real grapes before answering.",
        ],
      },
      {
        skill: "Tens and ones: place value",
        what: "Place value is the idea that where a digit sits decides what it is worth: in 47, the 4 is not four, it is four tens — forty — and the 7 is seven single ones. Grade 1 children build this by bundling objects into groups of ten and leftovers, reading two-digit numbers as 'so many tens and so many ones', and comparing numbers like 63 and 36, which use the same digits in different places. Nearly everything in later math — regrouping, decimals, big multiplication — stands on this one idea.",
        practice: "Place value activities in the app show bundles and single items and ask children to name the number, or show a number and ask how many tens and ones it holds. Comparison questions put two numbers side by side and reward looking at the tens first. Explanations rebuild the number out loud — '4 tens and 7 ones make 47' — a sentence worth copying at home, because saying the structure is how children come to see it.",
        home: "Bundling real objects makes place value click:",
        activities: [
          "Bundle ten craft sticks, straws, or pencils with a rubber band; build numbers like 34 with bundles and loose sticks, and let your child read them back.",
          "Play the digit swap: write 52, then swap the digits to make 25, and talk about why the new number is smaller even though nothing was added or removed.",
          "Guess-my-number with tens clues: 'My number has 6 tens and 3 ones' — your child names it, then invents a clue for you.",
        ],
      },
      {
        skill: "Measuring length and telling time",
        what: "Measurement begins with a simple, surprising discovery: to measure something, you cover it with equal units and count them — and if the units change, the count changes, even though the object did not. Grade 1 children measure with paper clips and cubes before rulers, compare which of two objects is longer, and learn that a proper measurement has no gaps or overlaps. Telling time joins the same guide because it is also measurement: reading a clock to the hour and half hour, and feeling what an hour of play or a half hour of reading actually lasts.",
        practice: "Measurement activities in the app show objects measured with unit pictures and ask for the count, or show two objects and ask which is longer and by how much. Time questions show clock faces set to the hour and half hour and ask children to read them, or match a time to an everyday moment. Explanations count the units out loud and name the clock's hands plainly, so grown-ups can echo the same words with real objects and the family clock.",
        home: "Your house is full of things waiting to be measured:",
        activities: [
          "Measure a book, a table, and a shoe in paper clips, lining them up end to end with no gaps, and write down each count to compare.",
          "Set a toy clock — or draw one — to times your child chooses, and have them read each time back to you, big hand and little hand named out loud.",
          "Time real activities for a week: how long teeth-brushing, a bath, or a walk around the block actually takes, guessed first and checked second.",
        ],
      },
    ],
  },
  "grade-2": {
    english: [
      {
        skill: "Compound words and word parts",
        what: "Vocabulary growth in Grade 2 gets a powerful shortcut: many big words are built from smaller pieces a child already knows. Compound words join two whole words — rain plus bow makes rainbow — while prefixes and suffixes change a word's meaning at its edges: un- flips it, re- repeats it, and -ful fills it. A child who can spot the pieces inside 'unhelpful' or 'playground' can make a smart guess at words they have never seen, which matters more every year as school reading grows longer and denser.",
        practice: "Vocabulary activities in English Forest ask children to build and break compound words, choose what a prefix or suffix does to a word's meaning, and pick the word that fits a sentence. The choices are close cousins of each other, so the word part itself has to do the deciding. Explanations pull the word apart in plain view — 'un- means not, so unhappy means not happy' — giving grown-ups a reusable script for unknown words in any book.",
        home: "Word building is a natural car and kitchen game:",
        activities: [
          "Compound word snap: one person says a first half — 'pop' — and the other finishes it — 'corn!' — then swaps roles and tries to stump each other.",
          "Prefix detective: during reading, stop at any word starting with un- or re- and have your child explain what the word must mean from its parts.",
          "Write word halves on separate cards — sun, flower, butter, fly — and let your child match, mix, and read the real and silly combinations aloud.",
        ],
      },
      {
        skill: "Main idea and text features",
        what: "Ask a Grade 2 reader what a passage was about and you may get a beloved tiny detail — 'There was a dog!' The main idea is a bigger net: the one thing the whole text is mostly about, with details serving as supporting evidence underneath it. Nonfiction adds its own helpers: headings announce what a section covers, captions explain pictures, and diagrams show what words describe. Children who learn to use these features stop reading nonfiction as a wall of words and start reading it as a map.",
        practice: "Reading activities in the app pair short story and informational passages with questions that separate main idea from mere detail: what was this mostly about, which detail supports that, what does this heading tell you is coming. Explanations point back to the sentences doing the supporting, so children see that answers live inside the text. Story questions also ask about the lesson a character learned, which is the main idea wearing a story's clothes.",
        home: "Main-idea talk works with any book or article:",
        activities: [
          "After one page of nonfiction, cover the page and ask, 'What was that page mostly about — in one sentence?' Then find the detail that proves it.",
          "Read the headings first: before a chapter or article, read only the headings and captions together and predict what each part will teach, then check while reading.",
          "Play detail-or-big-idea: you say statements about a story — 'The fox was sneaky' versus 'The fox hid behind one bush' — and your child sorts the big idea from the small detail.",
        ],
      },
      {
        skill: "Editing sentences like a writer",
        what: "Editing is the moment a young writer stops reading what they meant and starts reading what is actually on the page. In Grade 2 that means hunting for a short list of fixable things: a capital letter at the start, the right end mark, capitals for names and the word I, and common spelling patterns spelled the standard way. None of this is about neatness — it is about courtesy to the reader. Children who edit their own work, even imperfectly, are learning that writing is something you can improve, not something you simply get right or wrong.",
        practice: "Sentence activities in the app show sentences with one thing wrong and ask children to find the fix — a missing capital, a wrong end mark, a name that needs its capital. Writing-preparation questions ask which version of a sentence a reader would understand best. Because the app cannot collect your child's own papers, the explanations double as coaching: they name exactly what was fixed and why, in words you can borrow the next time your child writes anything at home.",
        home: "Make editing a game with low stakes:",
        activities: [
          "Write a silly sentence with two deliberate mistakes and appoint your child the editor-in-chief, red crayon in hand, to catch and fix them both.",
          "Keep a family 'name wall' of proper nouns — family names, pets, your street and town — spelled correctly, to consult when writing cards and notes.",
          "When your child writes anything real — a card, a list, a note to a grandparent — ask them to read it aloud slowly and fix one thing before it goes out.",
        ],
      },
    ],
    math: [
      {
        skill: "Place value and bigger adding and subtracting",
        what: "Grade 2 stretches numbers to a thousand and gives children the full place-value picture: ones, tens, and hundreds, each place worth ten of the place beside it. Adding and subtracting grow up alongside it — sums within 100 first, then larger — and children meet regrouping, the moment ten ones trade for one ten (or the reverse) to keep a calculation possible. Done well, regrouping is not a mysterious borrowing ritual; it is the same bundling children did with sticks in Grade 1, now recorded in digits.",
        practice: "Place value activities on Math Mountain ask children to build and read numbers into the hundreds, compare them place by place, and add or subtract with the steps shown honestly. Explanations talk in trades — 'that makes 12 ones, so we trade 10 of them for a ten' — instead of magic. Word problems wrap the same operations in short, readable stories, and hints suggest drawing the hundreds, tens, and ones before reaching for an answer.",
        home: "Place value stays concrete with money and bundling:",
        activities: [
          "Draw place-value pieces on paper — big squares for hundreds, sticks for tens, dots for ones — and build numbers like 247 together, trading ten dots for a stick whenever the ones pile reaches ten.",
          "Play the trading game with dried beans: roll a die, add that many beans, and whenever ones reach ten, trade them for a ten-stick; first to three hundreds wins.",
          "Compare prices in a grocery flyer: which costs more, 385 cents or 358 cents? Have your child explain using hundreds first, then tens, then ones.",
        ],
      },
      {
        skill: "Equal groups, arrays, time, and money",
        what: "Before multiplication has a name, it has a shape: equal groups. Grade 2 children arrange objects into rows and columns — arrays — and count totals by skip counting, discovering that four rows of three is the same total approached four at a time. Time and money join this guide because both run on the same grouping ideas: minutes gather in fives around the clock, and coins gather value in fixed amounts. Reading a clock to five minutes and counting a mixed handful of coins are really lessons in unit thinking — different-sized pieces combining into one total.",
        practice: "Activities in the app show arrays and equal groups and ask for totals or group counts, show clocks set to five-minute marks, and present small collections of coins to count. Explanations count by fives around the clock and by coin value from largest to smallest, modeling an order that prevents the classic mistake of counting coins by size or by how many there are. Hints suggest skip counting aloud — a strategy worth practicing in the car long after the screen is off.",
        home: "Equal groups and real money are everywhere at home:",
        activities: [
          "Build arrays with crackers, tiles, or stickers — three rows of four — then count by rows and by columns and notice both counts land on the same total.",
          "Empty a piggy bank together: sort coins by kind, count each kind from largest value down, and announce the grand total like a bank teller.",
          "Ask for the time at five-minute moments all week: 'The little hand is past 4, the big hand is on the 7 — that's 4:35. How do we know?'",
        ],
      },
      {
        skill: "Fractions as fair, equal parts",
        what: "Grade 2 fractions begin with one non-negotiable word: equal. A shape split into two parts only shows halves if the parts are exactly the same size; four equal parts make fourths, three equal parts make thirds. Children shade one part and learn to name what they see — one half, two thirds — connecting a picture to its fraction name. This equal-parts foundation is what makes fractions sensible later; children who rush past it often spend years treating fractions as two unrelated whole numbers stacked by accident.",
        practice: "Fraction activities in the app show circles and rectangles split into equal parts with some shaded, and ask children to name the fraction, or show a fraction name and ask which picture matches. The distractors are educational: parts that are unequal, or the count of unshaded parts, catch the two most common misunderstandings. Explanations always return to the same check — 'Are the parts equal? How many parts in all? How many are shaded?' — a three-question routine worth adopting at home.",
        home: "Food and paper make fractions deliciously obvious:",
        activities: [
          "Fold a paper plate, napkin, or tortilla into halves, then fourths, opening it each time to count the equal parts before anyone takes a share.",
          "Share a snack by fractions on purpose: 'There are 8 grapes. Half of them is 4 — can you show me three fourths of the grapes?'",
          "Draw shape pizzas together, shade a named fraction of each — one third, two fourths — and let your child invent the next order for you to shade.",
        ],
      },
    ],
  },
  "grade-3": {
    english: [
      {
        skill: "Context clues and word parts",
        what: "By Grade 3, children meet new words on nearly every page — far too many for any word list to cover. The skill that keeps reading moving is figuring out an unfamiliar word from its surroundings: the sentences nearby often define it, give an example, or set up a contrast. Word parts help from the inside, as prefixes, suffixes, and familiar roots offer hints. Children who learn to pause and mine these clues read more confidently and actually grow their vocabulary from reading itself, which is how most strong vocabularies are built.",
        practice: "Vocabulary activities in English Forest place an unfamiliar word inside a short passage and ask what it most likely means, with choices that reward reading the whole clue rather than grabbing the first familiar word. Word-part questions ask what a prefix or root contributes to a word's meaning. Explanations quote the clue back — 'the sentence says the desert was arid, with no rain for months' — teaching children that the text usually helps readers who know how to ask it.",
        home: "Turn unknown words into small detective cases:",
        activities: [
          "Clue hunt during reading: when a hard word appears, cover it and have your child guess its meaning from the sentence, then uncover and check how close the guess came.",
          "Keep a family word journal on the fridge: each week, add two words somebody figured out from context, with the clue sentence that gave them away.",
          "Play root-word building: take a root like 'port' (carry) and hunt together for its relatives — transport, portable, import — explaining how carrying hides inside each.",
        ],
      },
      {
        skill: "Main idea, evidence, and character",
        what: "Grade 3 reading raises the standard from 'What happened?' to 'Show me where it says that.' Children learn to state a main idea and then defend it with details from the text, and to describe a character by what the character does and says rather than by how the character looks. This habit — claims resting on evidence — is the backbone of all later school reading and writing. It also protects young readers from a common trap: answering from what they already think instead of what this particular text actually says.",
        practice: "Reading activities in the app ask for a passage's main idea, the detail that best supports an answer, and what a character's actions show about them. Wrong choices are often true-sounding statements the passage never made, so children must return to the text to decide. Explanations point to the supporting sentence each time, quietly rehearsing the sentence every teacher loves to hear: 'I know because the text says…'. Try asking for that sentence at home whenever your child answers a question about a book.",
        home: "Evidence talk makes dinner conversation smarter, too:",
        activities: [
          "After a chapter, ask for one claim about a character — 'She is brave' — and one moment from the book that proves it. No proof, no problem: go back and find some together.",
          "Play true-or-not-in-the-book: you make statements about a story your child knows, and they rule each one 'in the book' or 'not in the book' and defend the ruling.",
          "Summarize in one breath: challenge your child to retell a whole short passage in a single sentence, then name the two details that sentence is standing on.",
        ],
      },
      {
        skill: "Organizing a piece of writing",
        what: "A Grade 3 writer's ideas often arrive faster than they can be arranged. Organization is the fix: a piece of writing groups related ideas into paragraphs, puts events in an order a reader can follow, and uses linking words — first, also, for example, finally — as signposts. Opinion writing adds its signature move: state the opinion early, support it with reasons, and close by reminding the reader what was argued. Children are not expected to write long pieces; a well-arranged short piece beats a wandering long one every time.",
        practice: "Writing-preparation activities in the app ask children to choose the sentence that belongs in a paragraph, pick the linking word that fits a gap, or select the order in which sentences make sense. Choosing well among finished options isolates the organizational judgment from handwriting and spelling, so children can practice it cleanly. Explanations say why a sentence belongs or does not — 'this sentence is about a new topic, so it starts a new paragraph' — language you can reuse when your child writes anything real.",
        home: "Small real writing projects teach organization best:",
        activities: [
          "Write instructions together for something your child knows cold — making a sandwich, brushing the dog — then have another family member follow them literally and laugh about the gaps.",
          "Paragraph sort: cut a short magazine paragraph or your own three-sentence story into sentence strips, shuffle, and let your child rebuild it in an order that makes sense.",
          "Family opinion letter: pick a real topic — a later bedtime, a pet — and help your child write four sentences: opinion, two reasons, closing line.",
        ],
      },
    ],
    math: [
      {
        skill: "Multiplication and division",
        what: "Grade 3 is multiplication's big year. The idea underneath is equal groups: 4 × 3 means four groups of three, whether that is four bags of three marbles, a four-by-three array of tiles, or four rows of three chairs. Division is the same picture read backwards — sharing a total into equal groups, or measuring how many groups fit. Children first learn strategies: skip counting, doubling, using a known fact to build a new one. Memorized facts matter, but they stick far better when they are answers to pictures a child can already see in their mind.",
        practice: "Multiplication and division activities on Math Mountain show groups and arrays, ask for totals and missing group sizes, and connect the two operations as fact families — if 6 × 4 = 24, then 24 ÷ 4 = 6. Hints draw the picture: count the rows, count across. Explanations often solve by skip counting aloud, which is a deliberate strategy, not a shortcut. Word problems keep the settings ordinary — stickers, teams, shelves — so the equal-groups structure stands out from the story around it.",
        home: "Equal groups are the easiest math to find at home:",
        activities: [
          "Array hunt: find or build arrays around the house — egg cartons, muffin tins, window panes, ice cube trays — and name each one as a multiplication fact.",
          "Deal-and-share division: hand your child 24 cards, beans, or grapes and a number of stuffed animals, and let them share fairly, reporting how many each animal received.",
          "Fact family triangles: write three numbers like 3, 5, 15 on a card's corners and quiz each other on all four facts the family makes.",
        ],
      },
      {
        skill: "Fractions as numbers",
        what: "Grade 3 fractions step beyond pizza pictures: a fraction is a number in its own right, built from equal unit pieces. One third is one piece when a whole is split into three equal parts; two thirds is two of those pieces, and three thirds is the whole thing again. Children place fractions on a number line — a shock the first time, since fractions were 'food math' — and learn to compare simple fractions by reasoning: with the same-sized pieces, more pieces is more; with the same number of pieces, bigger pieces win. This number sense prevents years of fraction confusion.",
        practice: "Fraction activities in the app show partitioned shapes and number lines and ask children to name, place, and compare fractions, including spotting the simple equivalences like two fourths equaling one half. Explanations always count unit pieces out loud — 'each part is one fourth; we have three of them' — because that counting is the concept. Comparison questions reward reasoning about piece size rather than the common beginner error of comparing denominators as if bigger always meant bigger.",
        home: "Number lines and measuring cups carry this skill:",
        activities: [
          "Draw a number line from 0 to 1 together and place halves, thirds, and fourths on it with folded paper strips, checking which fractions land on the same point.",
          "Cook with measuring cups: fill a cup using only the one-third measure, counting the unit pieces aloud, then try to get the same amount with halves and notice the difference.",
          "Compare with folding: fold two identical paper strips, one into halves and one into fourths, and ask which single piece is bigger — and why the bigger number of parts means smaller pieces.",
        ],
      },
      {
        skill: "Area, perimeter, and reading data",
        what: "Area and perimeter are the classic mix-up pair, and Grade 3 separates them with pictures: area is the space a shape covers, counted in square tiles, while perimeter is the distance around its edge, counted in steps or string. Children tile rectangles to find area — and discover it matches the multiplication they are learning — then walk edges to find perimeter. Alongside, data work grows up: bar graphs and picture graphs use scales greater than one, and line plots record measurements, so children must read values carefully instead of merely counting icons.",
        practice: "Geometry and data activities in the app ask children to count square units inside rectangles, add side lengths around shapes, and answer questions from scaled graphs — 'how many more' questions included. Explanations keep the two measurements visibly separate, tiling for area and tracing for perimeter, and graph explanations read the scale first ('each picture stands for two votes') before counting anything. That scale-first habit is worth copying whenever your child meets a chart in a book or on the news.",
        home: "Tiles, tape, and family polls make this tangible:",
        activities: [
          "Tile a book cover or placemat with square sticky notes or crackers to find its area in squares, then measure around its edge with a string and compare the two numbers.",
          "Draw rectangles on grid paper or a checkerboard and challenge each other: same perimeter, different area — or same area, different perimeter.",
          "Run a family poll — favorite fruit, best day of the week — and graph it with each picture standing for two people by folding in neighbors or pets, then read the graph back.",
        ],
      },
    ],
  },
  "grade-4": {
    english: [
      {
        skill: "Roots, affixes, and idioms",
        what: "Grade 4 vocabulary work goes archaeological: children dig into words and find Greek and Latin roots — struct (build), therm (heat), graph (write) — that explain dozens of English words at once. Affixes keep helping at both ends of a word, and reference skills arrive: when context is not enough, a glossary or dictionary settles it. This grade also untangles idioms, the phrases whose meaning is not in their words at all. A child who knows 'raining cats and dogs' is not a weather report has learned something subtle about how language really works.",
        practice: "Vocabulary activities in English Forest ask children to use a root to unlock an unfamiliar word, choose the right meaning of an idiom inside a sentence, and pick the word that a definition describes. Foils are chosen to trap literal readers — the idiom choices always include the silly word-for-word meaning. Explanations give the root or the story behind the phrase in one clean line, and encourage the two-step habit: try the parts first, then check a reference.",
        home: "Word origins make excellent family trivia:",
        activities: [
          "Root of the week: post one root — 'spect, to look' — and collect its words all week (inspect, spectator, respect), awarding a point per word with its meaning explained.",
          "Idiom charades: act out or draw idioms like 'spill the beans' or 'a piece of cake' literally first, then explain what people actually mean by them.",
          "Dictionary races with a real dictionary or glossary: name a word, and your child finds its meaning and one clue — its part of speech or an example sentence — before a timer ends.",
        ],
      },
      {
        skill: "Theme and point of view",
        what: "Two Grade 4 ideas deepen every story a child reads. Theme is the message a story carries about life — friendship requires honesty, courage grows with practice — which is bigger than the main idea and never stated in one sentence by the author. Point of view is who is telling the story: a character inside it, saying 'I', or a narrator outside it, and what that choice lets the reader know or hides from them. Children who can discuss both are no longer just following plots; they are reading like critics, and enjoying it more.",
        practice: "Reading activities in the app ask what lesson a story teaches, which detail best supports that theme, and who is narrating a passage — or how two tellings of the same event would differ. Choices separate theme from topic: 'friendship' is a topic, while 'friends tell each other the truth' is a theme. Explanations cite the character's choices and changes as the evidence, modeling how readers actually find themes — not by guessing, but by watching what the story rewards and what it costs.",
        home: "Theme talk turns any story into a conversation:",
        activities: [
          "After a movie or book, each person names the theme in one sentence — 'the story teaches that…' — and defends it with one scene. Different defensible answers are a win, not a problem.",
          "Retell a scene from the other chair: have your child tell a familiar story moment as a different character, noticing what that character knows, feels, and would leave out.",
          "Compare two versions — a fairy tale and its retelling, or a book and its movie scene — and list what each version wants you to think about the hero.",
        ],
      },
      {
        skill: "Supporting ideas with details and editing well",
        what: "Grade 4 writing asks children to build a small structure: a clear main idea or claim, details and examples chosen to support it, and sentences polished enough that a reader never has to stop and restart. Editing grows more specific too — checking that pronouns match the people they stand for, that verb tenses do not wander, and that dialogue and titles are punctuated in the standard way. The underlying lesson transfers everywhere: strong writing is not found, it is built, then repaired.",
        practice: "Writing-preparation activities in the app ask which detail best supports a given idea, which sentence does not belong in a paragraph, and which edited version of a sentence is correct and clear. These choices practice an editor's eye without requiring long compositions on a screen. Explanations name the fault plainly — 'this detail is true, but it does not support the idea' — which is exactly the distinction young writers most need when they revise their own drafts on paper.",
        home: "Revision feels different when the stakes are real:",
        activities: [
          "Detail draft: your child writes three sentences arguing for something small — a dessert, a game — then must add one example or fact to each sentence to make it stronger.",
          "Read-aloud edit: have your child read their own writing aloud and mark any spot where they stumble; stumbles are where readers will stumble, and they mark the fix list.",
          "Cut-one-sentence game: take a paragraph your child wrote and together find the one sentence that could be removed without losing meaning — then discuss what it was doing there.",
        ],
      },
    ],
    math: [
      {
        skill: "Multi-digit multiplication, division, and remainders",
        what: "Grade 4 operations go big: multiplying a four-digit number by a one-digit number, then two-digit by two-digit, and dividing with up to four digits — all built from place value rather than memorized steps. Area models and partial products show why the standard method works: 23 × 4 is twenty-threes plus three fours' worth of pieces, drawn as a split rectangle. Division brings remainders, and remainders bring judgment: sometimes the leftover is dropped, sometimes it forces the answer up by one, and sometimes the remainder is the answer. Context decides, which makes these problems small exercises in reasoning.",
        practice: "Activities on Math Mountain walk multi-digit problems with the pieces visible, ask children to choose the right way to handle a remainder in a story — '28 children, vans hold 6' — and mix in factors and multiples along the way. Explanations use the area model and partial products instead of jumping to a final algorithm, and remainder explanations always return to the story's question. Hints suggest splitting the problem by place value, the single most useful rescue strategy at this level.",
        home: "Big-number thinking shows up in real quantities:",
        activities: [
          "Estimate groceries: 'These cost about $3 each and we need 14 — about how much?' Reward close estimates and the rounding strategy behind them, not exact answers.",
          "Remainder stories at home: 29 cookies, plates hold 4 — how many plates to serve them all? Then change the question: how many full plates? Watch the answer change.",
          "Area-model the garden or a rug: measure a rectangle's sides in feet, split one side into tens and ones on paper, and multiply out the pieces to find the area.",
        ],
      },
      {
        skill: "Equivalent fractions and fraction operations",
        what: "The heart of Grade 4 fractions is equivalence: one half, two fourths, and five tenths are different names for the same amount, and children prove it with folded paper, number lines, and the multiply-top-and-bottom pattern. With equivalence in hand, comparing fractions becomes a strategy game — same denominators, same numerators, or a benchmark like one half decides most contests. Adding and subtracting stay friendly at this level: like denominators, plus mixed numbers, where the whole numbers and fraction parts are handled as separate friendly piles.",
        practice: "Fraction activities in the app ask children to find equivalent names for a fraction, compare fractions using benchmarks and reasoning, and add or subtract fractions and mixed numbers with like denominators. Explanations draw the equivalence — showing two fourths covering exactly one half — before showing the number pattern, so the shortcut never outruns the understanding. Common wrong answers, like adding denominators straight across, appear as choices specifically so the explanation can retire that error for good.",
        home: "Paper folding remains the best fraction teacher:",
        activities: [
          "Fold the same strip into halves, fourths, and eighths, label every piece, and hunt for pieces that match exactly — the physical proof of equivalence.",
          "Benchmark sort: write fractions on cards — 3/8, 5/6, 1/4, 7/8 — and sort them into 'less than a half', 'about a half', and 'more than a half', defending each placement.",
          "Measure and add in the kitchen: combine 3/4 cup and 1/2 cup of flour by first renaming a half as 2/4 with the measuring cups themselves.",
        ],
      },
      {
        skill: "Decimals, angles, and symmetry",
        what: "Three Grade 4 topics share one theme: precision. Decimals name the fractions with denominators of ten and one hundred — money amounts in disguise — and children connect 0.4, 4/10, and four dimes as one amount in three costumes, placing them on number lines beside their fraction twins. Angles arrive as amounts of turn, measured in degrees with a protractor, with right and straight angles as landmarks. Symmetry asks for exactness of a different kind: fold a shape and the halves must match perfectly, along a line children learn to find and draw.",
        practice: "Activities in the app move between fraction and decimal names for the same amounts, ask children to identify and estimate angles in shapes and everyday objects, and test which shapes carry lines of symmetry and where those lines run. Explanations lean on the dimes-and-pennies model for decimals and the open-door model for angles — a door opened a crack, a quarter turn, wide open. Angle answers reward landmark reasoning — 'more than a right angle, less than a straight one' — before degree counting.",
        home: "Precision games hide in money, doors, and paper:",
        activities: [
          "Coin conversions: lay out dimes and pennies and have your child name the amount three ways — 47 cents, 47/100 of a dollar, $0.47 — until the three names feel like one idea.",
          "Angle hunt with a corner: use the corner of a book as a right-angle tester and classify angles around the house as smaller than, equal to, or bigger than a right angle.",
          "Fold-and-cut symmetry: fold paper, cut a shape along the fold, and open it to reveal a symmetric design; then challenge your child to draw the fold lines on shapes you sketch.",
        ],
      },
    ],
  },
  "grade-5": {
    english: [
      {
        skill: "Academic vocabulary and figurative language",
        what: "Grade 5 texts speak a more formal dialect: words like analyze, consequence, and approximately appear in science and history reading, and children are expected to pin down their meanings from context, word parts, and references. Figurative language deepens at the same time — metaphors that never say 'like', similes that do, and personification that hands human feelings to storms and clocks. Understanding these is not decoration: authors use them to pack an argument or a mood into a few words, and readers who miss them miss part of the message.",
        practice: "Vocabulary activities in English Forest ask children to determine the meaning of an academic word from the sentence around it, identify what a metaphor or simile is comparing, and explain what a figurative phrase suggests. Choices include the literal reading of every figure of speech, so guessing from the words alone fails informatively. Explanations translate each figure into plain language and name the comparison — 'the city is called a jungle to suggest it is wild and hard to survive in' — a move children can copy with any text.",
        home: "Rich words reward collecting and playing with:",
        activities: [
          "Metaphor swap: take turns describing something ordinary — the wind, a messy room, a slow morning — with a comparison, and let everyone else name what two things were compared.",
          "Word-of-the-week with teeth: choose an academic word like 'predict' or 'essential', post its meaning, and score a family point each time anyone uses it correctly in real conversation.",
          "Translate the figure: when a book says someone 'has a heart of stone', your child explains it in plain words, then invents a kinder figure for the same person.",
        ],
      },
      {
        skill: "Conclusions and claims backed by evidence",
        what: "The most grown-up reading skill in elementary school is separating what a text says from what a reader concludes. A conclusion combines text evidence with reasoning: the passage never announces it, yet the details make it the sensible reading. Claims work the same way from the writer's side — an author states a position and owes the reader reasons and evidence that actually support it, and Grade 5 readers learn to check whether the support truly connects or merely sounds impressive. This is the beginning of critical reading, the kind that later protects against weak arguments everywhere.",
        practice: "Reading activities in the app ask which conclusion the details in a passage best support, which evidence backs a stated claim, and which answer choice goes beyond what the text can prove. Overreaching choices are written to tempt — they are plausible, but the passage never earns them — and the explanations show the gap between 'could be true' and 'the text supports this'. That distinction, practiced in small doses here, is the exact one to rehearse aloud whenever your child reads nonfiction for school.",
        home: "Evidence habits transfer to screens, sports, and sibling disputes:",
        activities: [
          "Conclusion court: state a conclusion about your day — 'The dog was outside all afternoon' — and have your child demand the evidence, then judge whether it truly supports the claim.",
          "Ad or article check: read a headline together and list what evidence the piece actually provides for it, versus what it merely assumes or repeats.",
          "Two-column notes on paper: for one page of nonfiction, write 'the text says' on one side and 'so I conclude' on the other, keeping fact and inference visibly separate.",
        ],
      },
      {
        skill: "Editing and polishing writing",
        what: "Grade 5 editing is about control: keeping verb tenses consistent within a piece, punctuating dialogue and lists correctly, spelling words with the patterns and roots children now know, and combining choppy sentences into smoother ones that show how ideas connect. Young writers also learn the difference between formal and informal language and when each belongs. None of this is fussiness — polished sentences carry meaning further with less effort from the reader, and children who can repair their own drafts write with more confidence because mistakes have stopped being permanent.",
        practice: "Writing-preparation activities in the app ask children to spot the sentence with the tense or punctuation error, choose the best combined version of two short sentences, and pick the word or phrase that fits a formal tone. Explanations isolate one repair at a time and say what rule it follows, building an editor's checklist children can run on their own work: tenses steady, marks in place, sentences varied. The app still cannot read your child's own papers, so that checklist matters most at your kitchen table.",
        home: "Real documents make the best editing practice:",
        activities: [
          "Combine-it game: take two choppy sentences from any draft or book — 'Sam ran. Sam was fast.' — and compete for the smoothest single sentence that keeps both facts.",
          "Tense trap: read a short paragraph aloud with one verb's tense deliberately broken, and let your child catch and repair it; then swap roles and write traps for each other.",
          "Before any real note, card, or email goes out, run the three-point check together: capitals and end marks, steady tenses, one sentence that could be combined or clarified.",
        ],
      },
    ],
    math: [
      {
        skill: "Working with decimals",
        what: "Grade 5 decimals extend place value in both directions: thousandths on the small side, and the pattern that each place is ten times its neighbor becomes the engine for all four operations. Children add and subtract decimals by aligning place values — not decimal points as a magic rule, but tenths with tenths — and begin multiplying and dividing decimals by reasoning about what the answer should reasonably be. Estimation becomes a genuine skill here: a child who knows 4.9 × 3 must land near 15 can catch a misplaced decimal point before it becomes a wrong answer.",
        practice: "Decimal activities on Math Mountain place values on number lines, compare and order decimals past the hundredths, and run operations in money and measurement settings where the decimal point means something. Explanations align place values in columns and estimate first — 'about 5 times 3, so about 15' — then compute, modeling the order real mathematicians use. Wrong choices often show the classic errors, like treating 0.45 as larger than 0.6 because 45 beats 6, so explanations can confront that thinking directly.",
        home: "Money and measurements keep decimals honest:",
        activities: [
          "Receipt rounding: take a grocery receipt and round each price to the nearest dollar together, then estimate the total and compare it with the real one.",
          "Decimal compare war: write decimal cards — 0.7, 0.65, 0.09, 0.5 — and battle for the larger amount, with the loser explaining place by place why the winner won.",
          "Measure in decimals: use a ruler marked in tenths of a unit, or a kitchen scale, and record lengths and weights as decimals, then order the results.",
        ],
      },
      {
        skill: "Fraction and mixed-number operations",
        what: "Grade 5 fractions complete the elementary picture. Adding and subtracting unlike denominators turns on equivalence: rewrite one fraction so both speak the same unit pieces, then combine. Multiplication means taking a part of a part — one half of two thirds of a pizza — which area models make visible, and explains the once-strange rule that multiplying can shrink a number. Division of unit fractions flips intuition the other way: how many one-eighth servings hide inside three wholes is a multiplication in disguise. Children meet all of it through pictures and stories first, so the procedures have something to mean.",
        practice: "Fraction activities in the app ask children to add and subtract with unlike denominators, multiply fractions by fractions and whole numbers, and divide wholes and unit fractions in sharing contexts. Explanations draw or describe the model — the common-unit rewrite for addition, the shaded area grid for multiplication — before computing, and story problems about recipes and ribbons keep the operations attached to quantities. Hints commonly suggest drawing the fractions, still the most reliable rescue move at this level.",
        home: "Recipes are a complete fraction laboratory:",
        activities: [
          "Double or halve a real recipe together: every measurement must be recomputed — 3/4 cup doubled, 2/3 cup halved — and then actually measured out to check.",
          "Paper area models: shade one half of a rectangle, then shade one third of that half with a second color, and read the doubly shaded piece as a fraction of the whole.",
          "Sharing division: 'We have 4 granola bars and each serving is 1/2 a bar — how many servings?' Solve by drawing the bars and slicing them on paper first.",
        ],
      },
      {
        skill: "Volume, coordinates, and conversions",
        what: "Three Grade 5 topics reward systematic thinking. Volume measures how much space a box holds, counted in unit cubes: one layer of length-times-width cubes, stacked height times — which is why volume equals length × width × height, a formula children should meet as a counting shortcut, not a spell. Coordinate pairs give every point on a grid an address, first number across, second number up, and children plot and read points to draw shapes and follow paths. Conversions translate measurements between units of the same system — feet to inches, liters to milliliters — by multiplying or dividing by the exchange rate between them.",
        practice: "Activities in the app ask children to count cube layers or use the volume formula on labeled boxes, plot and identify points on a coordinate grid, and convert measurements in measurement tables and short problems. Explanations build volume one layer at a time and say coordinate pairs in the 'across, then up' order out loud, because most errors at this level are order errors, not idea errors. Conversion explanations name the exchange first — '1 foot is 12 inches, and we have 3 feet' — before touching the arithmetic.",
        home: "Boxes, grids, and measuring tools are already in your house:",
        activities: [
          "Box census: measure three household boxes with a ruler, predict each volume, then check the smallest one by filling it with sugar cubes, dice, or folded paper cubes.",
          "Grid treasure map: draw a coordinate grid over a simple room or garden map, hide 'treasure' at a point, and trade coordinate clues until someone names the exact spot.",
          "Conversion cooking: take a recipe written in cups and rewrite its amounts in tablespoons or milliliters together — 1 cup is 16 tablespoons — then cook from your converted version.",
        ],
      },
    ],
  },
};
