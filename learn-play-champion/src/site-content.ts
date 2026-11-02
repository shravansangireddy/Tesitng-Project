export interface ContentSection { heading: string; paragraphs: string[]; items?: string[] }
export interface ContentPage {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  sections: ContentSection[];
  questions?: { question: string; answer: string }[];
}

export const editorialPages: ContentPage[] = [
  {
    slug: "for-families",
    title: "Learning at Home for Families | Learn & Play Champion",
    description: "Start a manageable home practice routine with grade-based English and math, illustrated books, and encouraging explanations. No account needed for local play.",
    heading: "A little learning time. A lot to talk about.",
    intro: "You do not need to turn your home into a classroom. Choose one short activity, sit beside your child when helpful, and make room for a question, a mistake, or a new discovery.",
    sections: [
      { heading: "Start with what feels familiar", paragraphs: [
        "Open the learning app and choose local guest play. Select a grade on the dashboard, then browse English Forest, Math Mountain, or the picture books. A grade label is a starting point for browsing, not a judgment about your child.",
        "For younger children, read the question aloud and let them point or choose. For older children, ask them to explain a clue or show their reasoning. There is no need to rush through every activity.",
      ] },
      { heading: "Let the explanation do some teaching", paragraphs: [
        "An ordinary adventure has five questions. Hints and explanations can help you discuss why an answer makes sense. If the task is frustrating, try a more familiar idea or take a break; finishing quickly is not the goal.",
        "My Learning Path can suggest what to explore next after an optional eight-question check. Use its snapshot alongside your own observations and teacher guidance, not as a diagnosis or school placement decision.",
      ] },
      { heading: "Know where progress lives", paragraphs: [
        "Guest progress stays in this browser when storage is available. It does not automatically follow a child to another device, and clearing browser data removes it. Optional adult sign-in and cloud saving require the website operator to configure online services and privacy procedures.",
        "The current account model supports one learner per adult account. Separate child profiles and a multi-child family dashboard are not included. Use Privacy & data to review the current save and available export or erasure controls.",
      ] },
    ],
  },
  {
    slug: "for-teachers",
    title: "Supplemental Practice for Teachers | Learn & Play Champion",
    description: "Explore adult-guided Pre-K–5 practice, teacher-authored passages and quizzes, administrator review, and the current limits of classroom features.",
    heading: "More ways to practice. Room for your judgment.",
    intro: "Use short English and math activities as a starting point for discussion, guided practice, or a hands-on follow-up. Teacher observation remains central: game scores are not a replacement for assessment.",
    sections: [
      { heading: "Choose an activity with a clear purpose", paragraphs: [
        "Browse the seven levels from Pre-K through Grade 5 and choose a skill that fits your instructional goal. Grade-selected activities include 80 questions across 16 strands. Selected lessons offer teaching tips and adult-led extensions.",
        "The library is original supplemental content informed by selected U.S. standards, not complete standards coverage or a full-year curriculum. Familiar questions repeat. Introduce a new example to check whether the idea transfers.",
      ] },
      { heading: "Contribute content, with review before publication", paragraphs: [
        "When connected services are enabled, verified operator-approved teacher accounts can save passages and three-choice quizzes as drafts, preview them, and submit them. Content administrators review before publishing and can return work for changes or archive a publication.",
        "Content roles are assigned by the operator; ordinary sign-in does not grant teacher privileges. Published material is deployment-wide, not a private class workspace. Do not include student information, unlicensed copies, external solicitations, or private classroom stories.",
      ] },
      { heading: "Make an informed school-use decision", paragraphs: [
        "Private practice rooms are optional, invite-only, and asynchronous. They use generated nicknames and have no chat, but their client-reported completion scores are not proctored or suitable for grading and prizes.",
        "Class rosters, assignment management, LMS integration, and longitudinal teacher analytics are not implemented. Before online school use, confirm district authorization, provider arrangements, purpose limits, retention, and parent rights with the operator.",
      ] },
    ],
  },
  {
    slug: "how-it-works",
    title: "How It Works | Learn & Play Champion",
    description: "Choose a grade, try a five-question adventure, learn from explanations, and choose a next step. See how rewards and optional learning checks work.",
    heading: "Choose. Try. Talk. Discover.",
    intro: "A simple practice loop helps children know what comes next while leaving space for adult support. Start locally, choose familiar work, and celebrate the effort behind an answer.",
    sections: [
      { heading: "1. Choose a level and an adventure", paragraphs: [
        "Open the app and use guest play or configured adult sign-in. Pick the appropriate grade on the dashboard. English and math activity titles and questions follow that selection, as do the book shelf and My Learning Path.",
      ] },
      { heading: "2. Try five questions", paragraphs: [
        "An ordinary adventure includes five questions with encouraging feedback. Use a hint when you need one and read the explanation before moving on. Some activities use choices, while spelling uses typed answers.",
        "Correct answers and completed rounds can earn game points and rewards. Ordinary rounds can include speed bonuses, but speed is not required to complete the work. Rewards are cosmetic; they do not certify academic proficiency.",
      ] },
      { heading: "3. Decide what to explore next", paragraphs: [
        "Return to a favorite activity, turn the pages of a mini-book, or try a learning-path check. The check has eight questions, no timer or points, and rule-based recommendations. It does not automatically adjust difficulty or change grades.",
        "Grades 3–5 can also explore coding puzzles and introductory AI lessons. Those activities have their own completion markers rather than replacing English and math practice.",
      ] },
      { heading: "4. Review the save and privacy choices", paragraphs: [
        "Local progress depends on browser storage. Optional cloud saving requires adult account setup and operator privacy readiness. Review Privacy & data for the current save, export and erasure options, and any operator notices before enabling online features.",
      ] },
    ],
  },
  {
    slug: "about",
    title: "About Our Learning Approach | Learn & Play Champion",
    description: "Learn about Champion Island's original supplemental activities, effort-focused rewards, adult-supported practice, and honest learning and privacy boundaries.",
    heading: "Built around curiosity, not comparison.",
    intro: "Learn & Play Champion brings English and math practice into a colorful world called Champion Island. Its aim is simple: make it easier to try, talk about a mistake, and choose another small step.",
    sections: [
      { heading: "An original world for practicing ideas", paragraphs: [
        "English Forest, Math Mountain, picture books, Coding Cove, and AI discovery offer different ways to explore. Pip the Owl and Nova the Fox are friendly guides, not automated tutors or substitutes for an adult.",
        "The platform's activities, stories, and mini-book illustrations are original. Selected learning references inform practice, but no claim is made to cover every standard or to deliver a complete instructional program.",
      ] },
      { heading: "What we choose to celebrate", paragraphs: [
        "Game rewards recognize correct answers, participation, and returning to practice. They are intentionally separate from claims about intelligence, validated growth, or mastery. A high score on familiar questions does not tell the whole learning story.",
      ] },
      { heading: "Clear limits matter", paragraphs: [
        "The project does not claim independent effectiveness research, accredited courses, nationally normed assessments, or COPPA/FERPA certification. There are no fabricated reviews, learner counts, or teacher endorsements here.",
        "Deployment operators are responsible for accurate contact details, service configuration, privacy notices, consent or school authorization, and data handling. Consult the in-app Privacy & data area for deployment-specific information.",
      ] },
    ],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions | Learn & Play Champion",
    description: "Answers about grades, guest play, saved progress, curriculum limits, practice checks, teacher content, voice, donations, and privacy.",
    heading: "A few helpful answers before you begin",
    intro: "Here is what the app offers today and where adult guidance or operator setup is needed. Features described in these guides may be disabled on an unconfigured deployment.",
    sections: [
      { heading: "Start with the right expectations", paragraphs: [
        "Learn & Play Champion is original supplemental Pre-K–5 practice. It is designed to work alongside books, conversation, hands-on examples, and teacher-led instruction, not replace them.",
      ] },
      { heading: "For deployment-specific questions", paragraphs: [
        "The app's Privacy & data area contains operator contact and retention information when configured. If online services are not configured, built-in guest learning can still be used locally.",
      ] },
    ],
    questions: [
      { question: "Which subjects can children practice?", answer: "The core activities cover English and math from Pre-K through Grade 5. Separate Grade 3–5 coding puzzles and introductory AI lessons are also included. There are no dedicated science, social studies, or Spanish courses." },
      { question: "Do we need an account or paid membership?", answer: "Local guest learning does not require an account or purchase. Optional adult sign-in requires configured online services. Donations, when enabled, are separate from learning access and rewards. No paid membership system is implemented." },
      { question: "Are practice checks adaptive or diagnostic?", answer: "No. My Learning Path samples existing questions and uses simple rules to recommend practice. It does not provide a validated diagnostic score, automatically adjust difficulty, or assign a child to a grade." },
      { question: "Can teachers assign work or manage a class?", answer: "Approved teachers can author supplemental content when the backend is configured, with administrator review before publication. Full rosters, assignments, LMS integration, and teacher reporting are not implemented." },
      { question: "Does voice work for every learner?", answer: "Optional browser voice support focuses on early grades and spelling-bee interactions. Browser compatibility, operator privacy settings, adult permission, and provider processing all affect availability. Buttons and typing remain available; the public guides do not use a microphone." },
      { question: "Are books and practice results saved?", answer: "Ordinary progress and completed learning-path summaries use the existing device or account save. Picture-book reading answers and unfinished checks are not saved. Guest saves can be lost when browser data is cleared." },
      { question: "Can children compete with others?", answer: "Configured private rooms offer asynchronous weekly practice standings through adult-shared invitations. Scores are client-reported and unproctored, not verified academic achievement. The separate demo leaderboard uses clearly labeled fictional classmates." },
      { question: "Where do I ask about privacy or deletion?", answer: "Open Privacy & data in the app for save controls and the configured operator contact. Learning erasure does not remove every authentication, teaching, financial, provider-log, or backup record. The operator must handle those processes separately." },
    ],
  },
  {
    slug: "",
    title: "Learn & Play Champion | Pre-K–5 English & Math Practice",
    description: "Explore original Pre-K through Grade 5 English and math practice, picture books, and playful learning activities. Learn how families can get started.",
    heading: "Little practice. Big discoveries.",
    intro: "Learn & Play Champion is a playful place to practice English and math, explore illustrated stories, and celebrate effort. Families can choose a level from Pre-K through Grade 5 and learn together at a comfortable pace.",
    sections: [
      { heading: "A learning adventure, not another high-stakes test", paragraphs: [
        "English Forest invites children to explore words, spelling, sentences, and reading. Math Mountain offers number work, patterns, everyday problems, shapes, measurement, and data. Short five-question adventures include hints and explanations so a mistake can become a useful conversation.",
        "Points, badges, avatar choices, and colorful themes celebrate participation. They are game rewards, not a measure of a child's intelligence or a certified record of academic achievement.",
      ] },
      { heading: "Choose a starting point", paragraphs: [
        "Use the grade selector to find familiar work. Each level has 16 activities and 80 practice questions, along with a story and an informational text. The separate picture-book shelf offers two original illustrated mini-books per level.",
        "My Learning Path offers an optional eight-question practice check and rule-based next-step suggestions. It does not automatically move a child between grades or provide a validated diagnostic score.",
      ] },
      { heading: "Explore beyond English and math", paragraphs: [
        "Grades 3–5 can explore Coding Cove's 18 robot and block-planning puzzles. AI discovery introduces examples, patterns, training, models, and predictions through six lessons and a small local shape-and-color model. It is not a chatbot and does not send children's prompts to an external AI service.",
      ] },
      { heading: "Start with a grown-up", paragraphs: [
        "Local guest play is the default. Optional online accounts, shared teacher content, and private practice rooms require operator setup and privacy review. Pre-K and emerging readers need adult support. This is supplemental practice, not a complete school curriculum.",
      ] },
    ],
    questions: [
      { question: "Can we start without creating an account?", answer: "Yes. Guest learning saves progress in the current browser when browser storage is available. Clearing site data removes that local progress. Cross-device saving requires configured adult sign-in." },
      { question: "Is this a full Pre-K–5 curriculum?", answer: "No. It is an original supplemental library informed by selected U.S. standards. It does not cover every standard or replace teacher-led instruction." },
      { question: "Does the app have advertisements or child chat?", answer: "The app has no advertisements, public child profiles, or unrestricted chat. Optional adult donations do not unlock learning or change rewards." },
    ],
  },
  {
    slug: "english-practice",
    title: "English Practice for Pre-K–Grade 5 | Learn & Play Champion",
    description: "Explore grade-based English practice in sight words, vocabulary, spelling, reading, sentences, and writing preparation, with hints and explanations.",
    heading: "Build word confidence, one small adventure at a time",
    intro: "English practice works best when children can notice, try, and talk about what they discover. English Forest pairs short questions with encouraging feedback and opportunities for a grown-up to extend the learning.",
    sections: [
      { heading: "Seven ways to explore English", paragraphs: [
        "Each selected level offers word recognition, vocabulary, spelling, story comprehension, sentence building, informational reading, and writing preparation. The focus changes with the level: early learners notice letters and sounds, while older learners work with meaning, evidence, structure, and language choices.",
      ], items: ["Read a short passage and look back for evidence.", "Compare word meanings and notice useful word parts.", "Practice spelling in an ordinary activity or a solo five-word spelling bee.", "Choose sentences and plan ideas before writing on paper."] },
      { heading: "Read, discuss, then try", paragraphs: [
        "Before answering, invite the child to say what the question is asking. After an incorrect answer, read the explanation together and ask what clue could help next time. Hints are available during ordinary adventures; speed is never required to finish.",
        "Writing questions are multiple-choice preparation, not an assessment of an original essay. Use the suggested adult-led paper tasks for actual writing and personal feedback. The app does not collect or automatically grade those papers.",
      ] },
      { heading: "Make room for rereading", paragraphs: [
        "The built-in library is intentionally small. Replaying a familiar passage can support discussion, but remembering its answers is not proof of broad reading proficiency. Pair the app with library books, conversation, read-aloud time, and teacher-selected texts.",
      ] },
    ],
  },
  {
    slug: "math-practice",
    title: "Math Practice for Pre-K–Grade 5 | Learn & Play Champion",
    description: "Explore number sense, arithmetic, patterns, shapes, fractions, measurement, and data through short grade-based math activities and explanations.",
    heading: "Make math a discovery, not a race",
    intro: "Math Mountain gives children short opportunities to reason with numbers, notice patterns, and solve everyday problems. Choose a suitable level, use real objects when helpful, and make space to explain an answer.",
    sections: [
      { heading: "Nine math activity strands", paragraphs: [
        "The selected-grade library covers arithmetic, multiplication and division foundations, number patterns, word problems, geometry, place value, fractions and equal shares, measurement, and data. The meaning of each strand changes by level: Pre-K explores small collections and sharing, while older grades encounter more complex operations and representations.",
      ] },
      { heading: "Help children show their thinking", paragraphs: [
        "Ask, 'How did you work that out?' Counters, drawings, number lines, and folded paper can make an abstract question concrete. When an answer is incorrect, use the explanation as a starting point rather than asking the child to guess repeatedly.",
        "Charts include text-table alternatives, and shape questions include labeled illustrations. Ordinary rounds offer hints. Some ordinary answers can earn an optional speed bonus, but taking more time never prevents a child from finishing or receiving correct-answer points.",
      ] },
      { heading: "Practice scores have limits", paragraphs: [
        "Each activity uses five fixed grade-specific questions with shuffled choices on replay. A best round of four out of five highlights practice success; it does not certify standards mastery. Use unfamiliar examples away from the screen to see whether a child can apply the idea in a new situation.",
      ] },
    ],
  },
  {
    slug: "learning-path",
    title: "A Gentle Learning Path for Pre-K–5 | Learn & Play Champion",
    description: "See how an eight-question practice check suggests next steps using saved-grade results, without a timer, diagnostic claims, or automatic grade changes.",
    heading: "A helpful next step, without a high-stakes label",
    intro: "Not sure which adventure to choose? My Learning Path offers a small practice snapshot and simple suggestions. It is designed to start a conversation about learning, not to label a child.",
    sections: [
      { heading: "How the practice check works", paragraphs: [
        "Open My Learning Path in the app. It follows the grade already selected on the dashboard and samples eight questions: four English and four math skills. There is no timer, points, prize, or automatic grade change. A grown-up can read the words and help with the controls.",
        "Finish all eight questions to save the sampled results. Unfinished checks are not saved. Later checks rotate skill groups and questions from the existing practice bank, which eventually repeats.",
      ] },
      { heading: "Why a skill appears next", paragraphs: [
        "Recommendations put a missed check question first, then unexplored skills, continued practice, and review. A missed check remains visible until that skill is sampled again. The progress view shows each skill's latest check date and existing best adventure score.",
        "Choosing a recommendation opens an ordinary adventure. The system does not adapt question difficulty inside a round, infer a child's ability level, or compare the child with a nationally representative group.",
      ] },
      { heading: "Use results thoughtfully", paragraphs: [
        "Adult help, remembered questions, reading demands, and a child's energy can all affect a result. The check is not a validated diagnostic, placement test, or mastery assessment. For persistent concerns, discuss specific examples with the child's teacher or an appropriately qualified professional.",
      ] },
    ],
  },
  {
    slug: "picture-books",
    title: "Original Pre-K–5 Picture Books | Learn & Play Champion",
    description: "Discover 14 original illustrated mini-books, with two books per level, page controls, captions, and a friendly end-of-book comprehension question.",
    heading: "Small books for curious readers",
    intro: "The picture-book shelf adds a quieter kind of adventure: look closely, turn a page, and talk about what happens. Each level has a story mini-book and a discovery mini-book.",
    sections: [
      { heading: "What is on the shelf?", paragraphs: [
        "There are 14 original mini-books across Pre-K, Kindergarten, and Grades 1–5. Each has four illustrated pages, accessible image descriptions or captions, page controls, and a final comprehension question with explanations and retries.",
        "These are short in-app readers, not a complete leveled reading program. A selected grade is a browsing aid, not a formally measured reading level. Pictures reuse a small collection of original scene designs; simplified discovery diagrams are not to scale.",
      ] },
      { heading: "Turn a page into a conversation", paragraphs: [
        "Before reading, look at the title and picture together. During reading, pause to notice a detail or predict what might happen. At the end, ask the child to explain the answer using something from the book.",
        "A grown-up can read aloud while the child follows the pictures. Book reading does not award competitive points or save reading-answer history. The shelf is a place to explore without pressure to build a score.",
      ] },
    ],
  },
  {
    slug: "books-for-curious-kids",
    title: "Books for Curious Kids: The 'in a Minute' Series | Learn & Play Champion",
    description: "A family bookshelf of comic-style learning books for kids: the 11-book 'in a Minute' series, from Physics and Math to Astronomy, Dinosaurs, and Emotions.",
    heading: "Big ideas, one minute at a time",
    intro: "Some learning happens away from screens. These comic-style books explain one big idea per short, illustrated read — the series families keep asking about after spotting Physics in a Minute online. They are outside books, not part of this app, and they are sold by bookstores and online sellers, not by Learn & Play Champion.",
    sections: [
      { heading: "Physics in a Minute — the one that started it", paragraphs: [
        "Physics in a Minute: The Comic Book Edition, by Chaoyang Wang (KF Times Group Inc., 226 pages, softcover), turns physics into colorful comic stories for roughly ages 6–12. It is the book that prompted this page.",
      ], items: ["Motion and gravity", "Magnets and energy", "Space and planets", "Light and sound", "Everyday science phenomena and fun facts"] },
      { heading: "Chemistry in a Minute", paragraphs: [
        "What everything is made of, and what happens when things mix, fizz, melt, and change — chemistry at kitchen-table scale.",
      ], items: ["Everyday materials and what they are made of", "Mixing, dissolving, and simple reactions", "Bubbles, fizz, and color changes", "Solids, liquids, and gases", "Science to notice together at home"] },
      { heading: "Astronomy in a Minute", paragraphs: [
        "A one-minute-at-a-time tour of the sky, from the Moon outside the window to the rockets that leave Earth.",
      ], items: ["The Sun, Moon, and planets", "Stars and constellations", "Day, night, and the seasons", "Rockets and space travel", "Telescopes and looking up"] },
      { heading: "Biology in a Minute", paragraphs: [
        "How living things grow, eat, move, and survive — plants, animals, and the tiny worlds in between.",
      ], items: ["Plants and how they grow", "Animals and their habitats", "Insects, birds, and sea life", "Life cycles, from seed to adult", "Caring for living things"] },
      { heading: "Geography in a Minute", paragraphs: [
        "The shape of the world: maps, mountains, rivers, and weather, explained in short illustrated reads.",
      ], items: ["Continents and oceans", "Reading maps", "Mountains, rivers, and deserts", "Weather and climates", "Famous places around the world"] },
      { heading: "Math in a Minute", paragraphs: [
        "Numbers, shapes, and patterns from everyday life, in the same comic style — a natural reading companion to Math Mountain practice in the app.",
      ], items: ["Numbers and counting patterns", "Shapes all around us", "Measuring things", "Fractions in everyday life", "Puzzles and quick challenges"] },
      { heading: "Dinosaurs in a Minute", paragraphs: [
        "Fossil hunters, giant plant-eaters, and sharp-toothed hunters — the dinosaur book for kids who ask how big, how fast, and how do we know.",
      ], items: ["Famous dinosaurs and how we know about them", "Fossils and fossil hunters", "Giant plant-eaters and hunters", "Flying and swimming reptiles", "Why the dinosaurs disappeared"] },
      { heading: "Animals of the World in a Minute", paragraphs: [
        "A trip across the animal kingdom, habitat by habitat, full of adaptations that sound like superpowers.",
      ], items: ["Animals across the continents", "Desert, ocean, jungle, and polar animals", "Animal superpowers and adaptations", "Baby animals and how they grow", "Protecting wildlife"] },
      { heading: "Anatomy in a Minute", paragraphs: [
        "How the body works, one system at a time — the questions kids ask about themselves, answered in pictures.",
      ], items: ["Bones and muscles", "The heart and blood", "The brain and the senses", "Breathing and eating", "Keeping the body healthy"] },
      { heading: "Emotions in a Minute", paragraphs: [
        "The gentlest book in the series: feelings named, explained, and made easier to talk about, in the same one-minute comic style.",
      ], items: ["Naming feelings — happy, sad, angry, scared, calm", "Why feelings change", "What to do with big feelings", "Kindness and empathy", "Talking about feelings with family"] },
      { heading: "Great Historical Figures in a Minute", paragraphs: [
        "One short life story per read: inventors, explorers, artists, and leaders, and the moments that made them worth remembering.",
      ], items: ["Inventors and scientists", "Explorers", "Artists and writers", "Leaders who changed their countries", "One short life story per read"] },
      { heading: "About the series — read this before you buy", paragraphs: [
        "The 'in a Minute' books share a format: one idea per short illustrated read, in comic style, written for elementary-age readers (about ages 6–12). Physics in a Minute is a printed softcover. The wider series is sold in different formats by different sellers — some listings are printed books and some are digital editions — so check the format, page count, and seller before ordering, and compare prices, which vary widely between sellers.",
        "Listing these books is a reading suggestion for families, not a sales partnership: Learn & Play Champion does not sell them and does not earn anything if you buy one. Pair a book with matching practice in the app — read a minute, then play a minute.",
      ] },
    ],
    questions: [
      { question: "Can I buy these books on this site?", answer: "No. Learn & Play Champion does not sell books. Look for the titles in bookstores, libraries, or online marketplaces, and check the format (print or digital) on the listing before ordering." },
      { question: "Which book should we start with?", answer: "Start with the topic your child already asks about — Physics for how things work, Astronomy for space fans, Dinosaurs for fossil fans, and Math in a Minute alongside Math Mountain practice." },
      { question: "Are the download books on this page really free?", answer: "Yes. Six books on this page are shared by their publishers under Creative Commons CC BY 4.0 licences, which means anyone may download, print, and share them free, with credit to the creators. The full credits are printed inside each book and listed under every download." },
    ],
  },
  {
    slug: "coding-and-ai",
    title: "Coding & AI Basics for Grades 3–5 | Learn & Play Champion",
    description: "Explore 18 coding puzzles and six introductory AI lessons. Children practice sequences, loops, conditions, patterns, training, and predictions.",
    heading: "From giving instructions to questioning predictions",
    intro: "Children do not need a chatbot or a complicated programming setup to begin thinking about computing. Coding Cove and AI discovery use small, visible examples that learners can discuss with an adult.",
    sections: [
      { heading: "Coding Cove: plan, run, and debug", paragraphs: [
        "Eighteen Grade 3–5 puzzles introduce sequences, turns, debugging, loops, conditions, and reusable helpers. Children arrange a plan for a robot, run it, observe the result, and revise their instructions.",
        "Later puzzles combine earlier ideas. This is a bounded block-and-robot environment, not a general-purpose code editor, a professional programming certification, or a full computer science course.",
      ] },
      { heading: "AI discovery: examples are not guarantees", paragraphs: [
        "Six introductory lessons explain patterns, examples, training, models, and predictions. A local toy classifier counts shape-and-color examples so children can see why a prediction changes, ties, or fails on something unfamiliar.",
        "The model is deliberately simple. It is not a neural network and does not represent every kind of AI. No outside AI service receives the child's examples or prompts. Lab examples are temporary, while completed lesson checks can be saved with ordinary progress.",
      ] },
      { heading: "Questions worth asking together", paragraphs: [
        "Ask which examples were used, which examples are missing, and what would make a prediction wrong. Encourage children to check a result instead of treating a confident answer as automatically true. Keep names, private stories, and other personal information out of technology experiments.",
      ] },
    ],
  },
  {
    slug: "parents-and-teachers",
    title: "For Parents & Teachers | Learn & Play Champion",
    description: "Plan adult-supported practice, understand progress limits, and learn how approved teachers submit supplemental passages and quizzes for review.",
    heading: "A grown-up guide to purposeful play",
    intro: "A useful practice session does not need to be long. Choose one suitable activity, listen to the child's reasoning, and finish with one idea to try away from the screen.",
    sections: [
      { heading: "A simple practice routine", paragraphs: [
        "Begin with familiar work. Let the child attempt a question, use a hint when needed, and discuss the explanation. If reading the question gets in the way of the target skill, offer adult read-aloud support. Pre-K activities are intended for adult-supported exploration.",
        "Use My Learning Path for suggestions rather than a verdict. Best scores, badges, and points do not replace observation or teacher feedback. The current account model is one learner per adult account, not a multi-child family dashboard.",
      ] },
      { heading: "Teaching content with a review step", paragraphs: [
        "When online services are configured, an operator-approved teacher can create plain-text passages and three-choice quizzes for a selected grade. Saved drafts are submitted to a content administrator, who can publish, return for changes, or archive them.",
        "Published content is readable across the deployment, not restricted to an individual class. Teachers must not include student personal information, private classroom stories, unlicensed textbook copies, or solicitations. Human approval is not an accuracy or safety certification.",
      ] },
      { heading: "School features: know what is and is not included", paragraphs: [
        "Optional private invite-code rooms offer asynchronous weekly practice standings with generated nicknames and host moderation. They have no chat or public discovery. Completion reports are client-reported and unproctored, so standings must not be used for prizes or academic grading.",
        "The app does not provide complete class rosters, assignment management, district integrations, or longitudinal teacher analytics. School use requires operator privacy readiness, district approval, and appropriate agreements before collecting student data online.",
      ] },
    ],
  },
  {
    slug: "privacy-and-safety",
    title: "Privacy & Safety Guide for Families | Learn & Play Champion",
    description: "Understand local progress, optional cloud accounts, browser voice processing, private rooms, and the operator responsibilities before children use online features.",
    heading: "Make informed choices before going online",
    intro: "Child-friendly design and legal compliance are not the same thing. This guide describes the app's behavior and important limits. It does not replace the operator's published privacy notice, consent process, or school agreements.",
    sections: [
      { heading: "Local play comes first", paragraphs: [
        "Guest progress is stored in the current browser, including the selected grade, rewards, and optional completed practice-check summaries. The app has no advertisements, tracking scripts, public child profiles, unrestricted chat, or external AI calls. A website host can still receive connection information such as IP addresses and browser logs.",
        "The in-app Privacy & data area lets an adult review, export, and erase the current learning save. Clearing local browser data does not delete a separately saved cloud record.",
      ] },
      { heading: "Optional services have separate data flows", paragraphs: [
        "Configured Supabase services can process adult email, authentication information, learning progress, and private-room participation. Browser speech recognition or synthesis may send audio or text to the browser provider. The app does not promise that speech processing is local or offline.",
        "Adult donations use PayPal when enabled. Financial and teaching-author records are separate from learner progress erasure. Provider logs, backups, authentication identity, and financial retention require operator handling.",
      ] },
      { heading: "Kid logins are created and controlled by a grown-up", paragraphs: [
        "A parent or guardian can create a kid login: a simple username and 4-digit PIN the child uses to sign in on any device and keep their own learning progress. A kid login needs no email address, and the username is never shown publicly — there are no public child profiles, followers, or chat.",
        "The grown-ups who manage a kid login control it: the creator chooses the username, the child's display name (a first name or nickname is enough) and starting grade, and can share managing with another grown-up — for example the child's other parent — who can then also reset the PIN, pause the login, assign tasks, and see progress. A managing grown-up can delete the login at any time from Privacy & data. Deleting a kid login also deletes the progress saved under it. Kid logins store only the display name, grade, and learning progress — no photos, voice recordings, or contact details.",
        "The same grown-up can also view the progress saved under each of their kid logins — points, streaks, badges, and best scores — from the Kid logins area in Privacy & data. No one else can see it: other accounts cannot read a kid login's progress.",
        "A grown-up can also give a kid login a task list: short jobs, like “Play Math Mountain”, that appear on the child's home screen after they sign in. A task can open its activity directly, and the child checks it off when finished; the grown-up can see which tasks are done. Tasks store only the job name and whether it is finished.",
      ] },
      { heading: "What the operator must do", paragraphs: [
        "Online features default to disabled until required privacy configuration is supplied. Configuration flags and adult checkboxes are not verified parental consent, a district agreement, or COPPA/FERPA certification. The operator must establish appropriate notices, authorization, security, retention, access, and deletion procedures.",
        "Before online child use, open Privacy & data and check the operator contact and retention notice. If these are missing or unclear, keep online features disabled. Schools should confirm district authorization and contractual protections rather than assuming a teacher account is sufficient.",
      ] },
    ],
    questions: [
      { question: "Is the app certified COPPA or FERPA compliant?", answer: "No. Compliance depends on the operator's actual practices, consent or school authorization, provider arrangements, applicable law, and deployment. The software does not provide a compliance certification." },
      { question: "How do kid logins work?", answer: "A parent or guardian creates a username and 4-digit PIN for their child from Privacy & data in the app. The child signs in with that username and PIN — no email address is collected — and gets their own progress at the grade the grown-up chose. The grown-up can reset the PIN or delete the login and its progress at any time. Usernames are never displayed publicly." },
      { question: "Does learner erasure delete every record?", answer: "No. Cloud learning erasure removes learning and room records. Adult authentication, teaching records, financial records, provider logs, and backups require separate operator processes." },
    ],
  },
];

export interface FreeBook {
  file: string;
  title: string;
  ages: string;
  pages: number;
  size: string;
  blurb: string;
  credit: string;
}

// Real books shared by their publishers under Creative Commons CC BY 4.0
// licences — free to download, print, and share with credit. The full
// attribution is printed inside each PDF and repeated in `credit` here.
export const freeBooks: FreeBook[] = [
  { file: "fossils-tales-of-long-ago.pdf", title: "Fossils: Tales of Long Ago", ages: "Grades 2–5 · nonfiction", pages: 19, size: "1.2 MB", blurb: "How fossils form, and what they tell us about the animals and islands of long ago — real nonfiction for dinosaur detectives.", credit: "Written by Anupama Chandrasekaran · Illustrated by Rai · © Pratham Books, 2021 · Shared under CC BY 4.0" },
  { file: "how-many.pdf", title: "How Many?", ages: "Pre-K–Grade 1 · counting", pages: 20, size: "2.9 MB", blurb: "A count-along book of hands, fingers, and everyday things — with simple adding to try out loud.", credit: "Written by Sudeshna Shome Ghosh · Illustrated by Sayan Mukherjee · © Pratham Books, 2021 · Shared under CC BY 4.0" },
  { file: "croak.pdf", title: "Croak", ages: "Grades 1–3 · story", pages: 16, size: "1.7 MB", blurb: "A frog finds its way into a classroom, and the class is never the same. A funny animal story.", credit: "Written by Kavitha Punniyamurthi · Illustrated by Ekta Bharti · © Pratham Books, 2020 · Shared under CC BY 4.0" },
  { file: "colours.pdf", title: "Colours", ages: "Pre-K–Kindergarten · first words", pages: 24, size: "2.9 MB", blurb: "A white bear meets a new colour on every page — a gentle first book about the colours of the rainbow.", credit: "Written by Priyanka · Illustrated by Ajanta Guhathakurta · Translated by Alisha Berger · © Room to Read, 2015 · Shared under CC BY 4.0" },
  { file: "rain.pdf", title: "Rain", ages: "Pre-K–Grade 1 · nature", pages: 12, size: "1.7 MB", blurb: "A short, joyful book about rain — dancing in it, listening to it, and watching the world get wet.", credit: "Written by Letta Machoga · Illustrated by Marleen Visser · © African Storybook Initiative, 2014 · Shared under CC BY 4.0" },
  { file: "i-feel.pdf", title: "I Feel…", ages: "Pre-K–Grade 1 · feelings", pages: 20, size: "1.1 MB", blurb: "Happy, sad, surprised, excited — a first feelings book with big pictures and very few words.", credit: "By Craig Aldred · © Bloom Library, 2015 · Shared under CC BY 4.0" },
];

const gradeGuides = [
  { slug: "pre-k", label: "Pre-K", focus: "Notice letters, small collections, and familiar patterns", english: "Explore letter recognition, familiar words, and short adult-read stories. Invite the child to point, say, or choose rather than expecting independent reading.", math: "Count small groups, compare amounts, notice simple patterns, and talk about shapes and equal sharing with real objects.", together: "Find three safe objects, count them together, and make a matching group. Read a mini-book aloud and ask the child to point out one picture detail.", englishSkills: ["Recognize letters", "Spot familiar words", "Listen to short read-aloud stories", "Point to picture details", "Say or choose an answer out loud"], mathSkills: ["Count small groups of objects", "Compare amounts — more and fewer", "Notice and copy simple patterns", "Name and find shapes", "Share objects into equal groups"] },
  { slug: "kindergarten", label: "Kindergarten", focus: "Connect sounds, words, and early number ideas", english: "Notice beginning sounds, familiar words, simple sentence meaning, and story details. Reading support is welcome; the goal is useful practice, not a timed reading label.", math: "Explore counting, early addition and subtraction, groups of ten, shapes, comparisons, and simple measurement or data questions.", together: "Build a small addition story with counters. Then read a short passage together and ask what happened first.", englishSkills: ["Hear beginning sounds in words", "Recognize familiar words", "Understand simple sentences", "Notice story details", "Say what happened first"], mathSkills: ["Count and compare numbers", "Add and subtract with counters", "Build groups of ten", "Name and compare shapes", "Sort and talk about simple data", "Compare sizes and amounts"] },
  { slug: "grade-1", label: "Grade 1", focus: "Build sentences and stronger number sense", english: "Practice short and long vowel patterns, word families, sentence basics, story sequence, informational details, and reasons for an opinion.", math: "Work with addition and subtraction within 20, tens and ones, equal groups, length, time, and equal shares.", together: "Bundle ten sticks and add a few ones to build a number. Ask the child to explain the number, then write a short opinion on paper with one reason.", englishSkills: ["Short and long vowel patterns", "Word families", "Sentence basics — capitals and end marks", "Put story events in order", "Find details in nonfiction", "Give an opinion with a reason"], mathSkills: ["Add and subtract within 20", "Build numbers with tens and ones", "Make equal groups", "Compare and measure length", "Tell time", "Share equally and name the shares"] },
  { slug: "grade-2", label: "Grade 2", focus: "Explain ideas with words, numbers, and evidence", english: "Explore compound words, affixes, sentence editing, story lessons, nonfiction features, and writing plans. Ask which word or detail supports an answer.", math: "Practice place value, addition and subtraction, equal groups, arrays, time, money, length, and early fractions.", together: "Arrange objects in equal rows and describe the groups. After reading, find a detail that helps explain the main idea.", englishSkills: ["Build and break apart compound words", "Use prefixes and suffixes", "Edit sentences", "Find the lesson in a story", "Use nonfiction text features", "Plan a piece of writing"], mathSkills: ["Place value with hundreds, tens, and ones", "Add and subtract bigger numbers", "Equal groups and arrays", "Tell time and work with money", "Measure length", "Split shapes into equal parts"] },
  { slug: "grade-3", label: "Grade 3", focus: "Connect operations, fractions, and reading clues", english: "Use context clues, word parts, character actions, main ideas, evidence, and writing organization to discuss how a text works.", math: "Explore multiplication and division, place value, fractions, area, perimeter, time, measurement, and data.", together: "Draw an array and explain a matching multiplication fact. In a story, describe a character's action and point to a sentence that supports your idea.", englishSkills: ["Use context clues", "Break words into meaningful parts", "Describe character actions", "Find the main idea", "Support an answer with evidence", "Organize a piece of writing"], mathSkills: ["Multiply with arrays and equal groups", "Divide by grouping and sharing", "Place value in larger numbers", "Compare and order fractions", "Find area and perimeter", "Solve time and measurement problems", "Read and make simple data displays"] },
  { slug: "grade-4", label: "Grade 4", focus: "Compare representations and support an explanation", english: "Explore roots and affixes, context, idioms, perspective, theme, supporting details, and editing. Discuss why an answer fits the whole passage.", math: "Practice multi-digit operations, factors and multiples, remainders, equivalent fractions, fraction addition and subtraction, decimals, angles, and symmetry.", together: "Draw two equivalent fractions and explain why they name the same amount. Compare two ideas about a passage and look for supporting evidence.", englishSkills: ["Use roots and affixes", "Figure out words from context", "Understand idioms", "Compare points of view", "Find the theme of a story", "Support ideas with details", "Edit and revise writing"], mathSkills: ["Multiply and divide multi-digit numbers", "Find factors and multiples", "Solve problems with remainders", "Find equivalent fractions", "Add and subtract fractions", "Connect fractions and decimals", "Measure angles", "Find lines of symmetry"] },
  { slug: "grade-5", label: "Grade 5", focus: "Reason across texts, operations, and representations", english: "Explore academic vocabulary, figurative language, evidence, conclusions, claims, and editing. Use explanations to distinguish a supported conclusion from a guess.", math: "Work with decimal and fraction operations, mixed numbers, numerical rules, coordinate pairs, volume, and measurement conversions.", together: "Model a fraction operation with a drawing. Write a short claim about a text on paper and support it with relevant details.", englishSkills: ["Learn academic vocabulary", "Understand figurative language", "Draw conclusions from evidence", "Support a claim with details", "Edit writing for clarity"], mathSkills: ["Add, subtract, multiply, and divide decimals", "Operate with fractions and mixed numbers", "Describe numerical patterns and rules", "Plot points with coordinate pairs", "Find the volume of a box", "Convert measurements"] },
];

export const gradePages: ContentPage[] = gradeGuides.map(grade => ({
  slug: grade.slug,
  title: `${grade.label} English & Math Practice | Learn & Play Champion`,
  description: `Explore ${grade.label} English and math practice, illustrated mini-books, and adult-supported learning ideas. Original supplemental activities, not a full curriculum.`,
  heading: `${grade.label}: ${grade.focus.toLowerCase()}`,
  intro: `Choose ${grade.label} on the app dashboard to open 16 level-specific activities and 80 practice questions. The level also has one story, one informational text, and two separate illustrated mini-books. A grade label helps you browse; it is not an individualized ability assessment.`,
  sections: [
    { heading: "English to explore", paragraphs: [grade.english] },
    { heading: `Skills in ${grade.label} English`, paragraphs: [`${grade.label} English practice in the app covers these skills:`], items: grade.englishSkills },
    { heading: "Math to explore", paragraphs: [grade.math] },
    { heading: `Skills in ${grade.label} Math`, paragraphs: [`${grade.label} math practice in the app covers these skills:`], items: grade.mathSkills },
    { heading: "Try it together", paragraphs: [grade.together, "Let the child explain a choice before checking it. Use a hint or explanation when helpful, then try a new example with a grown-up. Hints and slower answers are part of learning, not a reason to stop."] },
    { heading: "Choose the next small step", paragraphs: [
      "My Learning Path offers an optional eight-question check at the selected level and suggests skills to revisit or explore. It awards no points and does not change the grade. Results are practice snapshots, not validated diagnostic or mastery scores.",
      "This is a small original supplemental library, not a complete year of instruction or coverage of every standard. Questions eventually repeat. Pair practice with books, conversation, hands-on examples, and guidance from the child's teacher.",
    ] },
  ],
}));

export const sitePages = [...editorialPages.filter(page => !page.slug), ...editorialPages.filter(page => page.slug), ...gradePages];
