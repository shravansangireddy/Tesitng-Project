import type { GradeId } from "./content-schema";

export type PictureScene = "garden" | "pond" | "bridge" | "sky" | "robot" | "kite" | "moon";
export interface BookPage {
  text: string;
  picture: string;
  count: number;
}
export interface PictureBook {
  id: string;
  grade: GradeId;
  title: string;
  kind: "Story" | "Discover";
  focus: string;
  scene: PictureScene;
  pages: BookPage[];
  question: string;
  choices: [string, string, string];
  answer: number;
  explanation: string;
}
type PageDraft = [text: string, picture: string, count: number];
function book(
  id: string, grade: GradeId, title: string, kind: PictureBook["kind"],
  focus: string, scene: PictureScene, pages: PageDraft[],
  question: string, choices: PictureBook["choices"], answer: number, explanation: string,
): PictureBook {
  return { id, grade, title, kind, focus, scene,
    pages: pages.map(([text, picture, count]) => ({ text, picture, count })),
    question, choices, answer, explanation };
}

// Original supplemental read-together books, not certified reading-level assessments.
export const pictureBooks: PictureBook[] = [
  book("prek-seed", "prek", "Hello, Little Flower!", "Story", "Point, name colors, and count to three.", "garden", [
    ["Look! A flower.", "One pink flower grows in the green garden.", 1],
    ["Hello, two flowers!", "Two pink flowers stand beside the garden path.", 2],
    ["Three flowers. Pink, pink, pink!", "Three pink flowers stretch toward the sunshine.", 3],
    ["Wave to the flowers. Bye-bye!", "Three flowers sway above bright green leaves.", 3],
  ], "Point to the color of the flowers.", ["Blue", "Pink", "Orange"], 1,
  "The petals are pink. You can point or say 'pink' with a grown-up."),
  book("prek-ducks", "prek", "Duck, Duck, Splash!", "Discover", "Notice water and count with a grown-up.", "pond", [
    ["One duck. Splash!", "One yellow duck floats on blue pond water.", 1],
    ["Two ducks. Paddle, paddle.", "Two yellow ducks paddle beside a green reed.", 2],
    ["Three ducks. Quack, quack!", "Three yellow ducks float together on the pond.", 3],
    ["Ducks swim in water.", "Three ducks make little ripples in blue water.", 3],
  ], "Where are the ducks swimming?", ["In water", "In a tree", "On the moon"], 0,
  "The ducks float in the pond's water. Pretend to paddle your hands!"),
  book("k-kite", "k", "A Kite for Kit", "Story", "Read repeated sentences and count.", "kite", [
    ["Kit has one kite. The kite is red.", "One red kite flies over a grassy hill.", 1],
    ["A pal has a kite, too. Up go two kites!", "Two red kites fly side by side.", 2],
    ["One more pal comes. Up go three kites!", "Three kites float above the green hill.", 3],
    ["The pals take turns. It is fun to fly together.", "Three red kites share the wide blue sky.", 3],
  ], "What do the pals do together?", ["Dig a pond", "Bake a cake", "Fly kites"], 2,
  "Kit and the pals fly kites and take turns. What could you take turns doing?"),
  book("k-garden", "k", "Count Our Garden", "Discover", "Match numbers to pictures and notice plant parts.", "garden", [
    ["I see one flower. It has a stem.", "One pink flower has a long green stem.", 1],
    ["I see two flowers. They have leaves.", "Two flowers have green leaves beside their stems.", 2],
    ["I see four flowers. Their petals are pink.", "Four pink flowers grow in a sunny garden.", 4],
    ["I count five flowers. Plants need water and light.", "Five flowers stand under the warm sun.", 5],
  ], "What do these plants need?", ["Shoes and socks", "Water and light", "Toys and hats"], 1,
  "Plants need water and light to grow. Count the five flowers in the last picture."),
  book("1-bridge", "1", "The Stepping-Stone Plan", "Story", "Follow a beginning, problem, and solution.", "bridge", [
    ["Mia saw a stream on her walk. One flat stone poked out of the water. She stopped at the bank.", "One stepping stone sits in a stream between two grassy banks.", 1],
    ["Two more stones made three in all. But the stones were wet. Mia did not step on them.", "Three wet stepping stones cross part of the blue stream.", 3],
    ["Mia asked her grown-up for a safe way across. They walked along the bank and found a wooden footbridge.", "Three stepping stones sit below a wooden bridge with a handrail.", 3],
    ["They used the bridge. Mia felt proud of her plan: stop, look, and ask for help.", "The wooden bridge stretches safely from bank to bank above the water.", 3],
  ], "How did Mia cross the stream?", ["She used a bridge", "She jumped on wet stones", "She swam alone"], 0,
  "Mia asked a grown-up and used the bridge. Stopping to ask for help was a good choice."),
  book("1-pond", "1", "A Pond Is a Home", "Discover", "Find facts and use picture clues.", "pond", [
    ["A pond is a small body of water. One duck floats on top. Its feet push against the water as it paddles.", "One duck floats on a pond near tall green reeds.", 1],
    ["Now two ducks swim past the reeds. Reeds are plants. Some small pond animals hide among their stems.", "Two ducks pass reeds at the edge of the pond.", 2],
    ["Three ducks leave small ripples. A ripple is a little wave. Watch how the water moves behind each duck.", "Three ducks make curved ripples in the blue water.", 3],
    ["A pond is home to many living things. We can watch from a safe path with a grown-up and leave wild animals alone.", "Three ducks paddle together, away from the grassy bank.", 3],
  ], "What is a ripple?", ["A kind of leaf", "A duck's foot", "A little wave"], 2,
  "The book explains that a ripple is a little wave. The curved lines in the water are picture clues."),
  book("2-robot", "2", "Roo's Mixed-Up Route", "Story", "Put events in order and explain a change.", "robot", [
    ["Roo was a pretend robot in a classroom game. A yellow tile marked the first stop. 'I need clear steps,' said Roo.", "One yellow route tile leads toward a smiling pretend robot.", 1],
    ["The class added another tile. Their plan said, 'Move, then move.' Roo followed both steps and reached the second tile.", "Two yellow tiles make a short route across the floor.", 2],
    ["The class wanted Roo to reach four tiles away, but the plan still had only two moves. Roo stopped early. Nobody was in trouble; they had found a clue.", "Four route tiles show a longer path than the first plan.", 4],
    ["They changed the plan to four moves and tried again. Roo reached the end! Testing helped the class fix the instructions.", "Four tiles form the tested route beside the happy robot.", 4],
  ], "Why did Roo stop too early?", ["Roo needed a snack", "The plan had too few moves", "The tiles were blue"], 1,
  "The plan had two moves, but the goal was four tiles away. The class tested and changed the plan."),
  book("2-sky", "2", "Stars After Sunset", "Discover", "Learn a main idea and compare day with night.", "sky", [
    ["After sunset, the sky grows darker. One bright star may become easy to see. Stars are still there in daytime, but sunlight makes most of them hard to see.", "One bright star shines in a dark blue sky.", 1],
    ["As the sky darkens, more stars may appear. This picture shows three. Real stars are huge, hot balls of glowing gas, very far from Earth.", "Three stars shine above a low green hill.", 3],
    ["We draw stars with points to make them easy to spot in pictures. A real star is shaped more like a ball, not a little pointed cutout.", "Five pointed star symbols represent distant stars.", 5],
    ["Watch the night sky with a grown-up from a safe place. Clouds and city lights can hide stars. Never look straight at the Sun.", "Five star symbols shine in a clear, dark sky.", 5],
  ], "Why are most stars hard to see in daytime?", ["Sunlight makes the sky bright", "They all leave Earth", "They become leaves"], 0,
  "Bright sunlight makes most stars hard to see. The stars do not disappear when daytime begins."),
  book("3-seeds", "3", "The Garden Question", "Story", "Use evidence and notice a fair-test problem.", "garden", [
    ["Noor's class planted a garden. When the first flower opened, Noor wondered whether extra water would make more flowers bloom. A question was the beginning of an investigation, not an answer.", "One flower blooms in the class garden under the sun.", 1],
    ["A week later, two flowers had opened. Noor had watered the bed more often, but the week had also been sunnier. 'Which change mattered?' asked her partner. Their observations could not tell them yet.", "Two flowers bloom together in the same sunny garden bed.", 2],
    ["Soon there were four flowers. Noor drew and counted them. She kept her notes, but crossed out the sentence 'Extra water caused every new flower.' The notes showed what happened, not proof of why.", "Four flowers illustrate the class's later garden observation.", 4],
    ["For their next investigation, the class planned equal pots, the same kind of seed, and the same light. They would compare carefully measured amounts of water with their teacher. Better questions led to a better plan.", "Four flowers stand in the garden where Noor began asking questions.", 4],
  ], "Why could Noor not tell which change caused the new blooms?", ["She forgot what a flower was", "There were no observations", "Both water and sunlight changed"], 2,
  "Water and sunlight both changed. Keeping other conditions similar can make a comparison more useful."),
  book("3-bridge", "3", "Bridges Share a Load", "Discover", "Use a simple model and explain supporting evidence.", "bridge", [
    ["A bridge carries a load: the weight of the bridge itself and what crosses it. Designers think about how that load reaches solid ground. This drawing shows a deck supported at the two banks.", "A wooden bridge rests on two grassy banks above one visible stone.", 1],
    ["Some real bridges also have supports underneath. Materials and shapes matter, too. A paper model is not a real bridge, but it can help us ask questions about how a span bends.", "A bridge deck spans blue water with three stones below.", 3],
    ["With a grown-up, place a sheet of paper across two stacks of books. Compare the flat sheet with a folded sheet across the same gap. Add identical small counters gently, one at a time. Never test a model by standing on it.", "Four stones under a drawn bridge are picture details, not measurements from a paper test.", 4],
    ["Record what happens instead of deciding the winner first. A folded shape may carry more counters in your setup. A model gives evidence about that model; real bridges need trained engineers and many more safety checks.", "The illustrated bridge crosses the stream between firm banks.", 4],
  ], "Which comparison makes the paper test more useful?", ["Use the same gap and counters", "Change every material at once", "Decide before testing"], 0,
  "Using the same gap and identical counters helps you compare the effect of changing the paper's shape."),
  book("4-kites", "4", "The Kite Club Compromise", "Story", "Infer a character's thinking and identify compromise.", "kite", [
    ["The kite club had one red kite and two very different ideas. Lena wanted a quiet afternoon of careful flying. Dev wanted to practice a group display. Each thought the other's plan would spoil the day.", "One red kite flies above an open grassy hill.", 1],
    ["A second kite arrived with a new member. Instead of voting immediately, the club listed what each person needed: room to practice, a turn with help, and time to enjoy the sky. The list made their shared goals easier to see.", "Two kites share a wide stretch of blue sky.", 2],
    ["With three kites ready, they agreed on a schedule. First came quiet practice in separate, safely spaced areas with adults. Later, anyone who wished could join a simple display. Joining the display was a choice, not a rule.", "Three red kites float apart above the hill.", 3],
    ["Lena stayed for the display after all. Dev also enjoyed the quiet practice more than expected. Their compromise did not give either person everything, but it gave everyone a meaningful place in the club.", "Three kites fill the sky while leaving space between their strings.", 3],
  ], "What made the club's plan a compromise?", ["Lena had to give up flying", "It included parts of both ideas", "Dev decided everything alone"], 1,
  "Quiet practice and an optional display respected both preferences. A compromise can include more than one person's needs."),
  book("4-moon", "4", "Moonlight Is Borrowed Light", "Discover", "Explain reflected light and the limits of diagrams.", "moon", [
    ["The Moon can look bright, but it does not make sunlight of its own. Sunlight reaches the Moon, and some of that light reflects toward Earth. We see the part of its lit surface that faces us.", "A stylized full Moon hangs above one distant star symbol.", 1],
    ["As the Moon travels around Earth, our view of its sunlit half changes. These changing views are called phases. The Moon itself is not shrinking or growing into a new shape each night.", "The same round Moon is shown beside three star symbols; this is not a phase diagram.", 3],
    ["Earth's shadow does not cause the ordinary monthly phases. Earth's shadow can fall on the Moon during a lunar eclipse, a different event. A good explanation separates events that may look similar.", "A bright round Moon and four stars appear in a simplified night illustration.", 4],
    ["With a grown-up, observe the Moon on several days and sketch what you actually see. Note the date and time. This book's pictures are decorative, not to scale, and do not predict tonight's phase. The Moon can sometimes be visible during daytime, too.", "The illustrated full Moon remains unchanged while five star symbols frame it.", 5],
  ], "Where does the light we see from the Moon come from?", ["The Moon burns like a star", "Streetlights on the Moon", "Sunlight reflected by its surface"], 2,
  "The Moon reflects sunlight. Ordinary phases depend on our changing view of its sunlit half."),
  book("5-robot", "5", "The Robot That Needed a Question", "Story", "Evaluate a prediction and distinguish evidence from certainty.", "robot", [
    ["At the science fair, Imani's pretend delivery robot faced a route of yellow tiles. Its display predicted, 'This route will be quickest.' Imani asked a question her team had nearly skipped: quickest compared with what?", "A smiling robot stands near one yellow route tile in a simplified model.", 1],
    ["The team had timed only one short route during practice. Now there were three tiles, a different starting point, and a crowded demonstration table. A confident sentence on a screen could not make the old example fit every new situation.", "Three yellow tiles show a route that differs from the first short example.", 3],
    ["Imani proposed a comparison. They cleared the table, used the same starting point, and timed each planned route several times. Sometimes a wheel slipped. Rather than hiding those runs, the team recorded them and explained the limitation.", "Five tiles stretch across the model floor beside the robot.", 5],
    ["Their sign finally read, 'In our trials, Route B usually took less time under these conditions.' It sounded less dramatic than 'always quickest,' but it was more useful. The team had learned to turn a prediction into a question that evidence could help answer.", "Five tiles and the robot represent a model, not proof of a real machine's performance.", 5],
  ], "Why was the team's final sign more trustworthy?", ["It stated the evidence and its limits", "It promised success everywhere", "It hid the slipped-wheel trials"], 0,
  "The final claim described their trials and conditions rather than pretending a limited test proved an 'always' rule."),
  book("5-pond", "5", "Reading a Pond's Clues", "Discover", "Separate observation, inference, and unanswered questions.", "pond", [
    ["An ecosystem includes living things and the nonliving surroundings they interact with. At a pond, water, light, soil, plants, and animals all matter. Watching a single duck can start a question, but it cannot reveal every relationship in the ecosystem.", "One duck floats near reeds in a simplified pond ecosystem.", 1],
    ["An observation describes what you notice or measure. 'I counted three ducks near the reeds at noon' is an observation. 'The ducks chose the reeds because they felt safer' is an inference: a possible explanation that needs more evidence.", "Three ducks float near tall reeds at the pond's edge.", 3],
    ["Suppose you count five ducks the next afternoon. You cannot conclude that the population grew by two. Ducks may arrive or leave, and some may have been hidden during the first count. Different times, weather, or viewing spots can change what you detect.", "Five visible ducks illustrate a count at one moment, not a total population estimate.", 5],
    ["Repeated counts from the same safe place and at similar times can make comparisons more informative. Keep questions separate from conclusions, and never disturb wildlife to improve a count. Thoughtful science includes noticing both evidence and what the evidence cannot yet tell us.", "Five ducks share the water while reeds shelter part of the pond from view.", 5],
  ], "Which sentence is an observation rather than an inference?", ["The ducks felt lonely", "I counted three ducks at noon", "The reeds must be their favorite place"], 1,
  "A count at a stated time describes something noticed. Feelings and preferences are possible explanations, not directly observed facts here."),
];
