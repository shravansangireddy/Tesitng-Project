import type { GradeId } from "./content-schema";

// Motivation Books is an original mini-library for Learn & Play Champion.
// Each book is a short, warm story about a feeling or a choice — patience,
// kindness, honesty, courage — written for this app, followed by five
// questions: some check what happened in the story, and some ask the reader
// what they would do. Finishing a book pays +10 points per correct answer,
// the same rate as a regular adventure or a won Word Battle.

export interface MotivationQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface MotivationBook {
  id: string;
  grade: GradeId;
  title: string;
  emoji: string;
  theme: string;
  pages: string[];
  questions: MotivationQuestion[];
}

export const POINTS_PER_CORRECT = 10;
export const QUESTIONS_PER_BOOK = 5;

export const motivationBooks: MotivationBook[] = [
  {
    id: "prek-seed",
    grade: "prek",
    title: "Nia and the Tiny Seed",
    emoji: "🌱",
    theme: "Patience",
    pages: [
      "Nia has a tiny seed. She puts it in the dirt.",
      "Nia gives it water. She waits. And waits.",
      "One day — pop! A tiny green sprout pops up!",
      "Nia smiles. Good things take time to grow.",
    ],
    questions: [
      {
        prompt: "What did Nia put in the dirt?",
        options: ["A tiny seed", "A cup", "A rock"],
        answer: 0,
        explanation: "Yes! Nia planted a tiny seed in the dirt.",
      },
      {
        prompt: "What did Nia give her seed?",
        options: ["Candy", "Water", "A hat"],
        answer: 1,
        explanation: "That's right — water helps seeds grow big and strong.",
      },
      {
        prompt: "What did Nia do while the seed was growing?",
        options: ["She dug it up every day", "She sat on it", "She waited with a happy heart"],
        answer: 2,
        explanation: "Waiting can be hard. Nia waited, and her seed grew.",
      },
      {
        prompt: "How did Nia feel when the sprout popped up?",
        options: ["Mad", "Happy and proud", "Sleepy"],
        answer: 1,
        explanation: "Growing took time, and that made Nia feel proud.",
      },
      {
        prompt: "Your turn: a friend is on the swing and you want a turn. What can you do?",
        options: ["Take the swing away", "Walk away mad", "Wait a little and ask with kind words"],
        answer: 2,
        explanation: "Waiting and asking kindly helps everyone feel good.",
      },
    ],
  },
  {
    id: "prek-blocks",
    grade: "prek",
    title: "Benny Shares the Blocks",
    emoji: "🧱",
    theme: "Sharing & kindness",
    pages: [
      "Benny has lots of blocks. Red, blue, and yellow!",
      "Ana has no blocks. She sits and watches.",
      "Benny smiles. “Here, Ana! Let's build together.”",
      "They build a tall, tall tower. Building together is fun!",
    ],
    questions: [
      {
        prompt: "Who has lots of blocks?",
        options: ["Ana", "Benny", "A cat"],
        answer: 1,
        explanation: "Benny! He has red, blue, and yellow blocks.",
      },
      {
        prompt: "What does Benny say to Ana?",
        options: ["“Go away.”", "“These are all mine.”", "“Let's build together.”"],
        answer: 2,
        explanation: "Benny's kind words made Ana's day brighter.",
      },
      {
        prompt: "What do Benny and Ana build together?",
        options: ["A tall tower", "A cake", "A boat"],
        answer: 0,
        explanation: "A tall, tall tower — built by two friends together.",
      },
      {
        prompt: "How does sharing make Benny feel?",
        options: ["Sleepy", "Hungry", "Happy"],
        answer: 2,
        explanation: "Sharing can make our hearts feel big and happy.",
      },
      {
        prompt: "Your turn: a friend has no crayons. What can you do?",
        options: ["Hide your crayons", "Share some of your crayons", "Color all alone"],
        answer: 1,
        explanation: "Sharing your crayons is a kind and friendly thing to do.",
      },
    ],
  },
  {
    id: "k-tower",
    grade: "k",
    title: "Milo and the Wobbly Tower",
    emoji: "🌈",
    theme: "Big feelings & calming down",
    pages: [
      "Milo is building a tall tower. Higher and higher it goes.",
      "Crash! The tower falls down. Milo feels mad. His face feels hot, and his hands make fists.",
      "Milo stops. He pretends to smell a flower. Then he blows out a candle, slow and soft. Smell… blow. His body feels calm again.",
      "Milo builds once more. This time the tower is wide at the bottom and strong. “I did it!” says Milo.",
    ],
    questions: [
      {
        prompt: "What happens to Milo's tower?",
        options: ["It falls down", "It flies away", "It turns blue"],
        answer: 0,
        explanation: "Crash! The tall tower fell down.",
      },
      {
        prompt: "How does Milo feel when the tower falls?",
        options: ["Silly", "Mad", "Sleepy"],
        answer: 1,
        explanation: "Milo felt mad, and that's okay — feelings come and go.",
      },
      {
        prompt: "What does Milo do to feel calm?",
        options: ["He yells at the blocks", "He runs away", "He smells a flower and blows out a candle"],
        answer: 2,
        explanation: "Slow pretend breaths helped Milo's body feel calm.",
      },
      {
        prompt: "What does Milo do after he feels calm?",
        options: ["He builds again", "He gives up", "He hides the blocks"],
        answer: 0,
        explanation: "Calm first, then try again — that's the Milo way!",
      },
      {
        prompt: "Your turn: you feel mad about something. What can help you feel calm?",
        options: ["Stomp and shout at a friend", "Take slow, deep breaths", "Push the blocks over"],
        answer: 1,
        explanation: "Slow breaths are a superpower for big feelings.",
      },
    ],
  },
  {
    id: "k-thanks",
    grade: "k",
    title: "Sana's Thank-You Garden",
    emoji: "🌻",
    theme: "Gratitude",
    pages: [
      "Sana loves her garden. Every day, helpers help the flowers grow.",
      "The sun gives warm light. “Thank you, Sun,” says Sana.",
      "The rain gives cool water. “Thank you, Rain,” says Sana. Grandma helps her pull the weeds. “Thank you, Grandma!”",
      "Sana picks one flower for every helper. Saying thank you makes hearts grow, too.",
    ],
    questions: [
      {
        prompt: "Who helps Sana's garden grow?",
        options: ["Nobody", "The sun, the rain, and Grandma", "Only Sana"],
        answer: 1,
        explanation: "Many helpers! The sun, the rain, and Grandma all help.",
      },
      {
        prompt: "What does Sana say to her helpers?",
        options: ["“More, please!”", "“Go away.”", "“Thank you.”"],
        answer: 2,
        explanation: "Two small words — thank you — can make a heart feel big.",
      },
      {
        prompt: "What does Sana give her helpers at the end?",
        options: ["A flower", "A rock", "Nothing"],
        answer: 0,
        explanation: "Sana picks a flower for every helper.",
      },
      {
        prompt: "How do helpers feel when we thank them?",
        options: ["Mad", "Happy and glad", "Confused"],
        answer: 1,
        explanation: "Being thanked helps helpers know their kindness mattered.",
      },
      {
        prompt: "Your turn: a grown-up makes your snack. What can you say?",
        options: ["Nothing at all", "“This is yucky.”", "“Thank you for my snack.”"],
        answer: 2,
        explanation: "Thanking the people who care for us is a lovely habit.",
      },
    ],
  },
  {
    id: "g1-cup",
    grade: "1",
    title: "Tara and the Cracked Cup",
    emoji: "🦉",
    theme: "Honesty",
    pages: [
      "Tara is helping set the table. She picks up a cup — her grandma's favorite blue cup.",
      "Oops! The cup slips from her hands. Crack! A tiny chip breaks off the rim. Tara's tummy feels tight.",
      "Tara takes a slow breath. She picks up the cup, walks to Grandma, and says, “Grandma, I chipped your cup. I'm sorry. It slipped.”",
      "Grandma gives Tara a warm hug. “Thank you for telling me the truth,” she says. “Cups can chip. Honest hearts are what matter most.”",
      "Tara helps wash the dishes after dinner. Her tummy feels light and easy again.",
    ],
    questions: [
      {
        prompt: "What happens to Grandma's blue cup?",
        options: ["It turns red", "It gets a tiny chip", "It disappears", "Tara paints it"],
        answer: 1,
        explanation: "The cup slipped and a tiny chip broke off the rim.",
      },
      {
        prompt: "How does Tara feel right after the accident?",
        options: ["Proud", "Hungry", "Nervous — her tummy feels tight", "Angry at Grandma"],
        answer: 2,
        explanation: "Tara felt nervous. Telling the truth can feel scary at first.",
      },
      {
        prompt: "What does Tara decide to do?",
        options: ["Hide the cup", "Tell Grandma the truth", "Blame the cat", "Throw the cup away"],
        answer: 1,
        explanation: "Tara was brave and honest, even with a tight tummy.",
      },
      {
        prompt: "What does Grandma say matters most?",
        options: ["Perfect cups", "Fast cleaning", "New dishes", "Honest hearts"],
        answer: 3,
        explanation: "“Cups can chip. Honest hearts are what matter most.”",
      },
      {
        prompt: "Your turn: you spill juice at snack time. What is the honest thing to do?",
        options: ["Say the dog did it", "Hide your cup", "Tell a grown-up and help clean up", "Say nothing and walk away"],
        answer: 2,
        explanation: "Telling the truth and helping fix it makes things right.",
      },
    ],
  },
  {
    id: "g1-star",
    grade: "1",
    title: "Leo's Wobbly Star",
    emoji: "🚀",
    theme: "Keep trying",
    pages: [
      "Leo wants to draw a star for the class art wall. He picks his brightest crayon and starts.",
      "His first star is wobbly. His second star is lopsided. “Stars are hard,” Leo sighs.",
      "His teacher smiles. “Every artist practices,” she says. “Try small steps.” Leo draws one line at a time, slow and steady.",
      "On his fifth try, Leo draws a bright, shiny star. It is not perfect — and Leo loves it anyway.",
      "Leo hangs his star on the wall. “Trying again helped me grow,” he says.",
    ],
    questions: [
      {
        prompt: "What does Leo want to draw?",
        options: ["A rocket", "A fish", "A star", "A house"],
        answer: 2,
        explanation: "Leo wants to draw a star for the class art wall.",
      },
      {
        prompt: "What is Leo's first star like?",
        options: ["Perfect", "Wobbly", "Invisible", "Giant"],
        answer: 1,
        explanation: "Wobbly! First tries are often wobbly — for everyone.",
      },
      {
        prompt: "What helps Leo get better at drawing stars?",
        options: ["A magic pencil", "Giving up", "Copying a friend", "Practicing in small steps"],
        answer: 3,
        explanation: "One line at a time, slow and steady — practice works.",
      },
      {
        prompt: "On which try does Leo draw the star he loves?",
        options: ["The first try", "The second try", "The fifth try", "The twentieth try"],
        answer: 2,
        explanation: "His fifth try! Keeping going made all the difference.",
      },
      {
        prompt: "Your turn: a puzzle piece just won't fit. What can you say to yourself?",
        options: ["“I quit forever.”", "“I'll try a new way.”", "“This is too hard for me.”", "“Puzzles are no fun.”"],
        answer: 1,
        explanation: "“I'll try a new way” is a thought that helps you grow.",
      },
    ],
  },
  {
    id: "g2-newkid",
    grade: "2",
    title: "Room for One More",
    emoji: "🍎",
    theme: "Empathy & including others",
    pages: [
      "On Monday, a new student joins Omar's class. Her name is Hana, and she doesn't know anyone yet.",
      "At lunch, Hana sits alone at the end of a long table. She opens her lunchbox slowly and looks down at the floor.",
      "Omar remembers his own first day. His stomach had felt fluttery, and a kind classmate had waved him over to sit with her.",
      "“Hi, I'm Omar,” he says. “There's room at our table. Want to sit with us?” Hana's smile is small but real.",
      "By Friday, Hana is teaching the whole table a clapping game from her old school. New friends can bring new joys.",
    ],
    questions: [
      {
        prompt: "Where does Hana sit at lunch on Monday?",
        options: ["With Omar", "Alone at the end of the table", "In the library", "Next to the teacher"],
        answer: 1,
        explanation: "Hana sat all alone at the end of a long table.",
      },
      {
        prompt: "Why does Omar understand how Hana feels?",
        options: ["He is the teacher", "He can read minds", "He sits alone every day", "He remembers his own fluttery first day"],
        answer: 3,
        explanation: "Omar remembered feeling fluttery on his first day, too.",
      },
      {
        prompt: "What does Omar say to Hana?",
        options: ["“That seat is saved.”", "“There's room at our table. Want to sit with us?”", "“Why are you so quiet?”", "Nothing at all"],
        answer: 1,
        explanation: "Omar's invitation was small, kind, and brave.",
      },
      {
        prompt: "What happens by Friday?",
        options: ["Hana eats alone again", "Omar changes tables", "Hana teaches everyone a clapping game", "The lunch table breaks"],
        answer: 2,
        explanation: "Hana became part of the group — and shared something new.",
      },
      {
        prompt: "Your turn: someone new joins your class. What is a kind thing to do?",
        options: ["Say hi and invite them to join in", "Wait for them to talk first", "Tell them every rule at once", "Ignore them until Friday"],
        answer: 0,
        explanation: "A friendly hello can change someone's whole day.",
      },
    ],
  },
  {
    id: "g2-mistake",
    grade: "2",
    title: "Priya's Happy Mistake",
    emoji: "🎨",
    theme: "Learning from mistakes",
    pages: [
      "Priya is painting a picture of her family at the beach. She adds a big, round, yellow sun.",
      "Splash! Her brush drips blue paint right across the sun. “Oh no,” Priya whispers. “It's ruined.”",
      "Priya stares at the blue blob. Then she tilts her head. “It could be… a wave! A big ocean wave under the sun!”",
      "She paints white foam on top of the wave and a tiny red boat riding it. Her beach picture has never looked better.",
      "At sharing time, Priya tells the class, “My mistake became my favorite part. Mistakes can turn into new ideas.”",
    ],
    questions: [
      {
        prompt: "What is Priya painting?",
        options: ["A rocket launch", "Her family at the beach", "A snowman", "The alphabet"],
        answer: 1,
        explanation: "Priya is painting her family at the beach, with a big yellow sun.",
      },
      {
        prompt: "What goes wrong with Priya's painting?",
        options: ["Her paint runs out", "The bell rings", "Blue paint drips across the sun", "Her paper tears in half"],
        answer: 2,
        explanation: "Splash! Blue paint dripped right across her sun.",
      },
      {
        prompt: "What does Priya turn the blue blob into?",
        options: ["A blue hat", "An ocean wave", "A second sun", "A spot she covers and hides"],
        answer: 1,
        explanation: "A wave — with foam and a tiny boat riding it!",
      },
      {
        prompt: "What lesson does Priya share with the class?",
        options: ["Never paint again", "Only perfect art matters", "Mistakes can turn into new ideas", "Always hide your mistakes"],
        answer: 2,
        explanation: "Priya's mistake became her favorite part of the picture.",
      },
      {
        prompt: "Your turn: you write a word wrong in your notebook. What can you do?",
        options: ["Scribble over the whole page", "Cross it out gently, fix it, and keep going", "Tear the page out angrily", "Stop writing for the day"],
        answer: 1,
        explanation: "A gentle fix and a deep breath — then keep going.",
      },
    ],
  },
  {
    id: "g3-hill",
    grade: "3",
    title: "The Long Way Up Maple Hill",
    emoji: "⛰️",
    theme: "Courage & one step at a time",
    pages: [
      "Dev's hiking club is climbing Maple Hill on Saturday. From the bus window, the hill looks enormous — its top disappears into the clouds.",
      "Halfway up, Dev's legs burn and his backpack feels like it is full of rocks. “I can't do this,” he thinks, as other hikers pass him on the trail.",
      "Dev sits on a stump and takes three slow breaths. “I don't have to reach the top in one go,” he tells himself. “Just the next bend. Then the next one.”",
      "Step by step, bend by bend, Dev keeps going. When Maya, the youngest hiker, starts to slow down too, he cheers her on: “Next bend, Maya. We can do the next bend.”",
      "At the top, the whole valley spreads out below like a green quilt. Dev grins. “I almost quit,” he says. “I'm really glad I didn't.”",
    ],
    questions: [
      {
        prompt: "Why does Dev feel like quitting halfway up the hill?",
        options: ["He forgot his lunch", "It starts to rain", "His legs burn and the hill feels too big", "The trail is closed"],
        answer: 2,
        explanation: "Dev's legs burned and the top still looked impossibly far away.",
      },
      {
        prompt: "What does Dev tell himself to keep going?",
        options: ["“I must run all the way to the top.”", "“Just the next bend, then the next one.”", "“Someone will carry me.”", "“The top doesn't matter at all.”"],
        answer: 1,
        explanation: "One bend at a time made the enormous hill feel possible.",
      },
      {
        prompt: "How does Dev help Maya on the trail?",
        options: ["He carries her backpack the whole way", "He races her to the top", "He tells her to turn back", "He shares his next-bend idea and cheers her on"],
        answer: 3,
        explanation: "The idea that helped Dev helped Maya, too.",
      },
      {
        prompt: "What is the big idea of this story?",
        options: ["Big goals feel easier one small step at a time", "Never take breaks", "Only the fastest hikers reach the top", "Hills are easy for everyone"],
        answer: 0,
        explanation: "Small steps, taken one at a time, can climb a whole hill.",
      },
      {
        prompt: "Your turn: a homework problem feels huge. What could help most?",
        options: ["Wait until the last minute", "Break it into small steps and do one at a time", "Skip it and hope it goes away", "Copy a friend's work"],
        answer: 1,
        explanation: "Small steps work for homework just like they work for hills.",
      },
    ],
  },
  {
    id: "g3-pencil",
    grade: "3",
    title: "June and the Borrowed Pencil",
    emoji: "✏️",
    theme: "Honesty & responsibility",
    pages: [
      "June forgot her pencil case on the morning of the big science quiz. “Here,” said her friend Eli, “borrow my lucky green pencil. Just give it back when you're done.”",
      "June did well on her quiz. But at recess, the green pencil was gone. She checked her desk, her backpack, and the floor — nothing.",
      "June's heart thumped. She could say nothing and hope Eli forgot. Instead, she walked right up to him. “Eli, I lost your pencil. I'm really sorry. It was my job to take care of it.”",
      "Eli was quiet for a moment. “Thanks for telling me,” he said. June used her own allowance to buy him a new green pencil — and added a funny frog eraser.",
      "The next week, Eli lent June his ruler without a second thought. “You take care of things,” he said, “and you tell the truth.” Trust, June learned, grows from both.",
    ],
    questions: [
      {
        prompt: "Why does June borrow a pencil?",
        options: ["Her pencil broke", "She forgot her pencil case", "She wants Eli's lucky pencil for herself", "The teacher told her to"],
        answer: 1,
        explanation: "June forgot her pencil case on the morning of the science quiz.",
      },
      {
        prompt: "What happens to Eli's pencil?",
        options: ["June keeps it", "It breaks in half", "It gets lost at recess", "Eli takes it back early"],
        answer: 2,
        explanation: "Somehow at recess, the green pencil disappeared.",
      },
      {
        prompt: "What does June do about the lost pencil?",
        options: ["Tells Eli the truth and says she is sorry", "Says nothing and hopes Eli forgets", "Blames another classmate", "Buys herself a snack instead"],
        answer: 0,
        explanation: "June owned her mistake right away, even though it was hard.",
      },
      {
        prompt: "How does June make things right?",
        options: ["She finds a random pencil on the floor", "She only writes Eli a note", "She promises to be careful someday", "She replaces the pencil and adds a frog eraser"],
        answer: 3,
        explanation: "Replacing what she lost showed Eli her apology was real.",
      },
      {
        prompt: "Your turn: you lose something a friend lent you. What is the responsible thing to do?",
        options: ["Hide it and hope it turns up", "Say they never lent it to you", "Tell your friend, say sorry, and make it right", "Wait a whole year before saying anything"],
        answer: 2,
        explanation: "Honesty plus making it right — that's how trust grows.",
      },
    ],
  },
  {
    id: "g4-apology",
    grade: "4",
    title: "Marcus and the Apology Note",
    emoji: "💌",
    theme: "Saying sorry & listening",
    pages: [
      "Marcus and Theo had been best friends since kindergarten. They had a secret handshake, a favorite lunch table, and a standing rule: nobody builds the block tower alone.",
      "One rainy afternoon, Theo knocked over Marcus's block tower by accident during cleanup. Marcus's face went hot. “You ALWAYS ruin everything!” he shouted. The whole room went quiet.",
      "That night, Marcus couldn't stop thinking about Theo's face — surprised, then hurt. The words “always” and “everything” echoed in his head. They weren't even true. Theo was usually the most careful builder at the table.",
      "Marcus sat down and wrote a note: “I'm sorry I shouted. You didn't ruin everything — it was an accident, and you matter more to me than a tower. — Marcus.” His hand shook a little when he slipped it into Theo's desk the next morning.",
      "At lunch, Theo sat down beside him. “I got your note,” he said. “Thanks for saying it straight.” They rebuilt the tower together — and this time, Marcus listened when Theo suggested wider blocks at the bottom. It was their strongest tower yet.",
    ],
    questions: [
      {
        prompt: "Why does Marcus shout at Theo?",
        options: ["Theo breaks Marcus's pencil on purpose", "Theo refuses to share the blocks", "Theo knocks the tower over by accident and Marcus reacts in anger", "Theo laughs at Marcus's building"],
        answer: 2,
        explanation: "It was an accident — but Marcus's anger spoke before his thinking could.",
      },
      {
        prompt: "What does Marcus realize that night?",
        options: ["Theo is not really his friend", "His words “always” and “everything” weren't true, and they hurt Theo", "The tower would be easy to rebuild", "Rainy days bring bad luck"],
        answer: 1,
        explanation: "Marcus noticed his angry words weren't fair — or true.",
      },
      {
        prompt: "What does Marcus put in his note?",
        options: ["An excuse about being tired", "A list of new tower rules", "A joke to change the subject", "A real apology that takes responsibility"],
        answer: 3,
        explanation: "Marcus's apology was honest and specific — that's why it worked.",
      },
      {
        prompt: "What happens when the friends rebuild the tower?",
        options: ["Marcus builds alone this time", "Marcus listens to Theo's idea, and the tower is their strongest yet", "Theo refuses to play", "The tower falls down right away"],
        answer: 1,
        explanation: "Listening to Theo's idea made the tower — and the friendship — stronger.",
      },
      {
        prompt: "Your turn: you said something unkind to a friend while you were angry. What is a good next step?",
        options: ["Pretend it never happened", "Blame it on being tired and move on", "Say sorry honestly and listen to how they feel", "Wait for them to apologize first"],
        answer: 2,
        explanation: "A real apology plus real listening can repair almost any wobble.",
      },
    ],
  },
  {
    id: "g4-calm",
    grade: "4",
    title: "Amina's Deep-Sea Breath",
    emoji: "🌊",
    theme: "Calming down & believing in yourself",
    pages: [
      "Amina knew her science presentation by heart. She had practiced in the mirror, performed it for her cat, and twice for her little brother. But standing in front of the class, her heart hammered like a drum.",
      "“Too fast,” her thoughts raced. “What if I forget a line? What if everyone stares?” Her hands felt shaky, and her voice felt stuck somewhere in her throat.",
      "Then Amina remembered what Nurse Rosa had taught their class: breathe like a diver slipping under the sea. Slow breath in for four counts. Hold for four. Let it out for four, slow, like bubbles rising to the light.",
      "She took one diver's breath. Then another. Her heart slowed down. She looked at her note card, found her first line, and began. Her voice was small at first — then steady.",
      "Afterward, her teacher said, “You looked nervous, and you handled it. That's real courage.” Amina smiled. Feelings, she thought, are like weather. Breathing helps me wait for the sun.",
    ],
    questions: [
      {
        prompt: "Why is Amina so nervous?",
        options: ["She didn't practice at all", "She has to give a presentation in front of the class", "Her cat is missing", "She left her note card at home"],
        answer: 1,
        explanation: "Amina practiced a lot — and speaking in front of everyone still felt scary.",
      },
      {
        prompt: "What trick does Amina use to calm herself?",
        options: ["Counting backwards from one hundred", "Humming a song loudly", "Closing her eyes until class ends", "Diver's breaths — slow in, hold, slow out"],
        answer: 3,
        explanation: "Four counts in, four held, four out — like bubbles rising.",
      },
      {
        prompt: "Who taught Amina the breathing trick?",
        options: ["Her little brother", "Nurse Rosa", "Her science teacher", "Her cat"],
        answer: 1,
        explanation: "Nurse Rosa taught the whole class the diver's breath.",
      },
      {
        prompt: "What does Amina's teacher tell her afterward?",
        options: ["“You were too quiet.”", "“Next time, don't be nervous.”", "“You looked nervous, and you handled it. That's real courage.”", "“Presentations are easy for everyone.”"],
        answer: 2,
        explanation: "Courage isn't having no fear — it's handling the fear you have.",
      },
      {
        prompt: "Your turn: your heart pounds before a big test. What could you try?",
        options: ["Hold your breath until it stops", "Take slow breaths and read the first question calmly", "Rush through every question as fast as possible", "Spend the time imagining everything going wrong"],
        answer: 1,
        explanation: "Slow breaths plus a calm start — that's a plan you can count on.",
      },
    ],
  },
  {
    id: "g5-team",
    grade: "5",
    title: "The Promise Poster",
    emoji: "🤝",
    theme: "Listening & teamwork",
    pages: [
      "For the school fair, Sofia's team had to design a poster about saving water. Four students, four big ideas — and one very blank sheet of paper.",
      "Jayden wanted a giant waterfall. Priya wanted charts and facts. Tomás wanted a joke in every corner. Sofia wanted her photo of the river near school. Everyone talked at once, and nobody listened to anybody.",
      "Sofia took a breath. “New plan,” she said. “Each person gets two minutes to explain their idea. No interrupting. Then we figure out how the best parts fit together.”",
      "Listening changed everything. Jayden's waterfall became the background. Priya's facts went into bright boxes. Tomás's jokes turned into speech bubbles in the waterfall's spray, and Sofia's river photo anchored the bottom of the page.",
      "They split the jobs, wrote their names beside each one, and finished a whole day early. At the fair, their teacher studied the poster and said, “This sounds like all four of you.” Sofia grinned. “That's because it finally is.”",
    ],
    questions: [
      {
        prompt: "What is Sofia's team making for the school fair?",
        options: ["A science robot", "A poster about saving water", "A short play", "A model waterfall"],
        answer: 1,
        explanation: "A poster about saving water — with four very different ideas for it.",
      },
      {
        prompt: "What is the team's first problem?",
        options: ["They lose the poster paper", "They run out of markers", "Everyone talks at once and nobody listens", "The fair is cancelled"],
        answer: 2,
        explanation: "Four good ideas, zero listening — nothing could move forward.",
      },
      {
        prompt: "What is Sofia's plan?",
        options: ["She decides everything herself", "Each person explains their idea without interrupting, then they combine the best parts", "They copy another team's poster", "Everyone makes their own separate poster"],
        answer: 1,
        explanation: "Two uninterrupted minutes each — listening became the team's superpower.",
      },
      {
        prompt: "How does the team organize the actual work?",
        options: ["One person does everything", "They split the jobs and write names beside each one", "They save it all for the last minute", "The teacher does the hard parts"],
        answer: 1,
        explanation: "Clear jobs with names beside them — and they finished a day early.",
      },
      {
        prompt: "Your turn: your group can't agree on an idea. What would help most?",
        options: ["The loudest person wins", "Everyone shares, everyone listens, then you decide together", "Give up on the project", "Let one person do all the work"],
        answer: 1,
        explanation: "Sharing plus listening turns an argument into a plan.",
      },
    ],
  },
  {
    id: "g5-courage",
    grade: "5",
    title: "Kai and the Empty Chair",
    emoji: "🦁",
    theme: "Courage & kindness",
    pages: [
      "Kai noticed it on Tuesday: a boy named Ren eating lunch alone again, his tray parked beside the empty chair that nobody ever chose.",
      "At Kai's table, someone snickered, “There's the quiet kid.” A few people laughed. Kai laughed too — a small, uncomfortable laugh that tasted bad the moment it left his mouth.",
      "That evening, Kai kept seeing Ren's face. “I don't have to laugh along,” Kai thought. “And I don't have to make a big speech either. I can just… move.”",
      "On Wednesday, Kai carried his tray past his usual table and sat down across from Ren. “Hey. I'm Kai. Is this seat taken?” Ren blinked. “It is now,” he said, and smiled.",
      "It turned out Ren knew everything about deep-sea fish and kept a notebook of amazing comics he had drawn himself. By Friday, two more classmates had pulled up chairs. The empty chair wasn't empty anymore — and Kai's laugh, when it came, felt good and real.",
    ],
    questions: [
      {
        prompt: "What does Kai notice about Ren?",
        options: ["Ren is the funniest kid in class", "Ren eats lunch alone beside an empty chair", "Ren is brand new to the school", "Ren always finishes lunch first"],
        answer: 1,
        explanation: "Day after day, Ren ate alone by the chair nobody chose.",
      },
      {
        prompt: "How does Kai feel after laughing along with the snicker?",
        options: ["Proud of himself", "Nothing at all", "Angry at Ren", "Uncomfortable — the laugh “tasted bad”"],
        answer: 3,
        explanation: "Kai's feelings told him the laugh didn't match the person he wants to be.",
      },
      {
        prompt: "What brave choice does Kai make?",
        options: ["He makes a big speech in the cafeteria", "He simply sits with Ren and introduces himself", "He tells Ren to find another table", "He decides to ignore the whole thing"],
        answer: 1,
        explanation: "No speech, no spotlight — just a tray, a chair, and a hello.",
      },
      {
        prompt: "What does Kai discover about Ren?",
        options: ["Ren prefers to be alone forever", "Ren is in a different grade", "Ren knows deep-sea fish and draws amazing comics", "Ren doesn't like talking to anyone"],
        answer: 2,
        explanation: "Getting to know someone often reveals wonderful surprises.",
      },
      {
        prompt: "Your turn: you see someone being left out. What is a brave, kind choice?",
        options: ["Laugh along so you fit in", "Wait to see whether someone else helps first", "Only help if a teacher is watching", "Invite them in or sit with them — small actions count"],
        answer: 3,
        explanation: "Kindness doesn't need an audience. One chair can change a week.",
      },
    ],
  },
];

export function booksForGrade(grade: GradeId): MotivationBook[] {
  return motivationBooks.filter((book) => book.grade === grade);
}
export const motivationBookIds: string[] = motivationBooks.map((book) => book.id);
export function bookById(id: string): MotivationBook {
  const book = motivationBooks.find((entry) => entry.id === id);
  if (!book) throw new Error(`Unknown motivation book: ${id}`);
  return book;
}
// Finishing a book earns stars for the shelf: a perfect read earns three,
// a strong read two, and any finished read at least one — finishing a book
// and thinking about it is always worth celebrating.
export function starsForScore(correct: number): number {
  if (correct >= QUESTIONS_PER_BOOK) return 3;
  if (correct >= 3) return 2;
  if (correct >= 1) return 1;
  return 0;
}
