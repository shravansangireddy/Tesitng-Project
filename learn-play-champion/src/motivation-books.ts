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
  // ——— Pack 2: self-management stories ———
  {
    id: "p2-prek-feelings",
    grade: "prek",
    title: "Zoe Says How She Feels",
    emoji: "😊",
    theme: "Naming big feelings",
    pages: [
      "Zoe wakes up happy. Her smile is big and wide.",
      "Her tower falls. Zoe feels sad. A tear rolls down.",
      "Her brother takes her toy. Zoe feels mad. Her cheeks feel hot.",
      "Zoe tells Dad, “I feel mad.” Dad gives her a hug. Saying feelings helps.",
    ],
    questions: [
      {
        prompt: "How does Zoe feel when she wakes up?",
        options: ["Sad", "Happy", "Sleepy"],
        answer: 1,
        explanation: "Zoe wakes up happy, with a big, wide smile.",
      },
      {
        prompt: "What happens to Zoe's tower?",
        options: ["It falls down", "It flies away", "It sings a song"],
        answer: 0,
        explanation: "Crash — Zoe's tower falls down.",
      },
      {
        prompt: "How does Zoe feel when her brother takes her toy?",
        options: ["Mad", "Proud", "Hungry"],
        answer: 0,
        explanation: "Zoe feels mad. Her cheeks feel hot.",
      },
      {
        prompt: "What does Zoe say to Dad?",
        options: ["“Go away.”", "Nothing at all", "“I feel mad.”"],
        answer: 2,
        explanation: "Zoe uses her words to say how she feels.",
      },
      {
        prompt: "Your turn: you feel sad about something. What can you do?",
        options: ["Tell a grown-up how you feel", "Hide and say nothing", "Yell at a friend"],
        answer: 0,
        explanation: "Telling a grown-up how you feel is a strong, helpful thing to do.",
      },
    ],
  },
  {
    id: "p2-prek-gentle",
    grade: "prek",
    title: "Ari's Gentle Hands",
    emoji: "👐",
    theme: "Gentle hands & kind words",
    pages: [
      "Ari loves the class bunny, Coco. Ari pets her softly, soft, soft.",
      "Ari wants the red truck. Jon has it. Ari waits and asks, “My turn next, please?”",
      "Jon smiles and shares the truck. Gentle hands and kind words feel good.",
      "Ari is proud. Gentle is strong.",
    ],
    questions: [
      {
        prompt: "What animal does Ari pet?",
        options: ["A bunny", "A dog", "A fish"],
        answer: 0,
        explanation: "Coco the class bunny!",
      },
      {
        prompt: "How does Ari pet Coco?",
        options: ["Fast and rough", "Softly and gently", "With one finger only"],
        answer: 1,
        explanation: "Soft, soft pets — gentle hands keep Coco happy.",
      },
      {
        prompt: "What does Ari say to Jon?",
        options: ["“Give it now!”", "“That's mine!”", "“My turn next, please?”"],
        answer: 2,
        explanation: "Kind words work almost like magic words.",
      },
      {
        prompt: "What does Jon do with the truck?",
        options: ["He hides it", "He shares it with Ari", "He throws it away"],
        answer: 1,
        explanation: "Jon shares — Ari's kind words helped him want to share.",
      },
      {
        prompt: "Your turn: a friend is using a toy you want. What helps most?",
        options: ["Grab it fast", "Shout for it", "Use kind words and wait for a turn"],
        answer: 2,
        explanation: "Kind words and patient waiting — that's the gentle way.",
      },
    ],
  },
  {
    id: "p2-k-listen",
    grade: "k",
    title: "Kenji's Listening Ears",
    emoji: "👂",
    theme: "Listening & focus",
    pages: [
      "It is circle time. Ms. Park is telling a story about a bear.",
      "Kenji hears a truck outside. He hears his shoe squeak. His ears want to wander!",
      "Kenji sits criss-cross. He looks at Ms. Park. He keeps his ears on the story.",
      "At the end, Kenji can tell the whole class what the bear did. Listening helps him learn!",
    ],
    questions: [
      {
        prompt: "What is Ms. Park doing at circle time?",
        options: ["Telling a story", "Taking a nap", "Cooking lunch"],
        answer: 0,
        explanation: "Ms. Park is telling a story about a bear.",
      },
      {
        prompt: "What tries to pull Kenji's ears away from the story?",
        options: ["A loud song", "A truck outside and a squeaky shoe", "His lunchbox"],
        answer: 1,
        explanation: "Truck sounds and squeaky shoes — distractions are everywhere!",
      },
      {
        prompt: "How does Kenji keep listening?",
        options: ["He covers his ears", "He talks to his friend", "He sits criss-cross and looks at Ms. Park"],
        answer: 2,
        explanation: "Still body, looking eyes, listening ears — that's Kenji's trick.",
      },
      {
        prompt: "What can Kenji do at the end of the story?",
        options: ["Tell the class what the bear did", "Nothing at all", "Run outside"],
        answer: 0,
        explanation: "Because Kenji listened, he remembers the whole story.",
      },
      {
        prompt: "Your turn: your teacher is talking. How can you show listening?",
        options: ["Play with a toy", "Look, sit still, and listen quietly", "Talk over the teacher"],
        answer: 1,
        explanation: "Looking and listening quietly helps you learn — and shows respect.",
      },
    ],
  },
  {
    id: "p2-k-help",
    grade: "k",
    title: "Fatima Raises Her Hand",
    emoji: "🙋",
    theme: "Asking for help",
    pages: [
      "Fatima is zipping her coat. Zip… stuck! The zipper will not go up.",
      "Fatima pulls and pulls. Her hands get tired. The coat stays stuck.",
      "Fatima raises her hand. “Mr. Lee, I need help, please.”",
      "Mr. Lee fixes the zipper. Zip — all the way up! “Asking was brave,” he says.",
      "Fatima smiles. Asking for help makes hard things easier.",
    ],
    questions: [
      {
        prompt: "What gets stuck on Fatima's coat?",
        options: ["The button", "The zipper", "The pocket"],
        answer: 1,
        explanation: "The zipper! It would not go up at all.",
      },
      {
        prompt: "What does Fatima do when pulling doesn't work?",
        options: ["Raises her hand and asks for help", "Leaves her coat open all day", "Pulls until the coat rips"],
        answer: 0,
        explanation: "Fatima asks for help — a brave and smart choice.",
      },
      {
        prompt: "Who helps Fatima?",
        options: ["The bus driver", "Nobody at all", "Mr. Lee"],
        answer: 2,
        explanation: "Mr. Lee fixes the zipper in no time.",
      },
      {
        prompt: "What does Mr. Lee tell Fatima?",
        options: ["“Asking was brave.”", "“Too late now.”", "“Never mind.”"],
        answer: 0,
        explanation: "Asking for help is brave — heroes do it all the time.",
      },
      {
        prompt: "Your turn: a puzzle feels too hard and you are stuck. What is a brave thing to do?",
        options: ["Hide the puzzle", "Say puzzles are no fun", "Ask a friend or grown-up for help"],
        answer: 2,
        explanation: "Stuck is not the end — asking for help is the way through.",
      },
    ],
  },
  {
    id: "p2-g1-ideas",
    grade: "1",
    title: "Two Games at Recess",
    emoji: "💡",
    theme: "Different ideas are okay",
    pages: [
      "The bell rings for recess. Wren grabs a ball. “Let's play kickball!” she calls.",
      "Diego shakes his head. “I want to dig in the sandbox and build a road.”",
      "Wren's face falls. “But kickball is the BEST game.” Diego shrugs. “Roads are best to me.”",
      "Wren takes a breath and thinks. “Your idea is different from mine. That's okay! You dig today. I'll kick.”",
      "Diego grins. “Tomorrow, I'll try kickball with you.” Different ideas can still be friends.",
    ],
    questions: [
      {
        prompt: "What game does Wren want to play?",
        options: ["Tag", "Kickball", "Hide and seek", "Jump rope"],
        answer: 1,
        explanation: "Wren grabs a ball and calls for kickball.",
      },
      {
        prompt: "What does Diego want to do?",
        options: ["Play kickball too", "Read a book", "Dig in the sandbox and build a road", "Go back inside"],
        answer: 2,
        explanation: "Diego wants to dig in the sandbox and build a road.",
      },
      {
        prompt: "How does Wren feel when Diego says no to kickball?",
        options: ["Disappointed — her face falls", "Excited", "Sleepy", "Not bothered at all"],
        answer: 0,
        explanation: "Wren's face falls. It's okay to feel disappointed.",
      },
      {
        prompt: "What does Wren decide about Diego's idea?",
        options: ["It is a bad idea", "He has to play her game", "She won't be his friend", "It is different from hers — and that's okay"],
        answer: 3,
        explanation: "Different ideas can both be good ones.",
      },
      {
        prompt: "Your turn: a friend wants to play a different game than you. What is a kind thing to do?",
        options: ["Say their idea is silly", "Take turns — their game today, yours tomorrow", "Refuse to play with them ever", "Tell everyone to skip their game"],
        answer: 1,
        explanation: "Taking turns lets both ideas get a chance to shine.",
      },
    ],
  },
  {
    id: "p2-g1-stop",
    grade: "1",
    title: "Noah and the Stop-and-Think",
    emoji: "🛑",
    theme: "Stop, think, then act",
    pages: [
      "Noah is fast. Fast to line up, fast to answer, fast to the water fountain.",
      "One day, Noah races to be first in line. Bump! He knocks into little Bea, and her crayons spill everywhere.",
      "Bea's lip wobbles. Noah's teacher kneels down. “Fast is fun, Noah. But first — stop. Think. Then go.”",
      "Noah helps Bea pick up every crayon. “Sorry, Bea. I didn't stop and think.”",
      "The next day, Noah feels the race feeling in his feet. He stops. He thinks. Then he walks — and Bea walks right beside him, smiling.",
    ],
    questions: [
      {
        prompt: "What is Noah like at the start of the story?",
        options: ["Slow and sleepy", "Fast at everything", "Quiet and shy", "Always last in line"],
        answer: 1,
        explanation: "Noah is fast — fast to line up, fast to answer, fast everywhere.",
      },
      {
        prompt: "What happens when Noah races to be first in line?",
        options: ["He wins a prize", "Nothing happens", "He bumps into Bea and her crayons spill", "Bea races past him"],
        answer: 2,
        explanation: "Bump! Bea's crayons spill everywhere.",
      },
      {
        prompt: "What does Noah's teacher teach him?",
        options: ["“Stop. Think. Then go.”", "“Run even faster.”", "“Always be first.”", "“Never line up.”"],
        answer: 0,
        explanation: "Stop, think, then go — three little steps that help a lot.",
      },
      {
        prompt: "How does Noah make things right with Bea?",
        options: ["He ignores her", "He runs away", "He blames the line", "He helps pick up every crayon and says sorry"],
        answer: 3,
        explanation: "Noah helps with every crayon and says a real sorry.",
      },
      {
        prompt: "Your turn: you feel super excited and want to rush ahead. What can you do first?",
        options: ["Push to the front", "Stop, think, then go", "Shout as loud as you can", "Grab what you want"],
        answer: 1,
        explanation: "Stopping to think first keeps everyone's day smoother — yours too.",
      },
    ],
  },
  {
    id: "p2-g2-teasing",
    grade: "2",
    title: "Grace and the Purple Glasses",
    emoji: "🕊️",
    theme: "Calm words for teasing",
    pages: [
      "Grace wears new glasses with purple frames. She picked them herself, and she loves them.",
      "At recess, Cole points and snickers. “Purple is a baby color,” he says, loud enough for others to hear.",
      "Grace's cheeks feel hot. Her hands want to ball into fists. She takes a slow breath, the way her grandma taught her.",
      "“I like my glasses,” Grace says in a calm, clear voice. Then she walks away to the swings, where her friends are waiting.",
      "Later, Grace tells her teacher what happened. “You used calm words and strong feet,” her teacher says. “That took real strength.”",
    ],
    questions: [
      {
        prompt: "What does Grace pick out herself?",
        options: ["A purple bike", "New glasses with purple frames", "A purple backpack", "Purple rain boots"],
        answer: 1,
        explanation: "Grace picked her purple-framed glasses herself — and loves them.",
      },
      {
        prompt: "What does Cole do at recess?",
        options: ["He compliments Grace's glasses", "He asks to try them on", "He teases Grace about her glasses", "He invites her to play"],
        answer: 2,
        explanation: "Cole teases Grace, saying purple is a baby color.",
      },
      {
        prompt: "What does Grace do before she answers Cole?",
        options: ["She runs to the office", "She takes a slow breath", "She shouts back at him", "She takes her glasses off"],
        answer: 1,
        explanation: "A slow breath first — then calm, clear words.",
      },
      {
        prompt: "What does Grace do after she speaks?",
        options: ["She walks away to her friends by the swings", "She chases Cole around the yard", "She hides in the bathroom", "She gives her glasses away"],
        answer: 0,
        explanation: "Grace walks away to her friends — that's using strong feet.",
      },
      {
        prompt: "Your turn: someone teases you. Which plan shows calm strength?",
        options: ["Tease them back even harder", "Yell and push", "Use calm words, walk away, and tell a grown-up if it keeps happening", "Laugh along and feel bad all day"],
        answer: 2,
        explanation: "Calm words, strong feet, and telling a grown-up — a strong plan.",
      },
    ],
  },
  {
    id: "p2-g2-morning",
    grade: "2",
    title: "Emeka's Morning Checklist",
    emoji: "🌅",
    theme: "Habits & independence",
    pages: [
      "Emeka used to have wild mornings. “Where's my shoe? Where's my folder?” Everyone rushed, and Dad's voice got louder every single day.",
      "One Sunday, Emeka and Dad drew a morning checklist together: Wake up. Get dressed. Eat breakfast. Brush teeth. Backpack by the door.",
      "On Monday, Emeka followed the list step by step. Check, check, check! He even had time to feed the fish.",
      "“You did that all by yourself,” Dad said, amazed. The checklist hung on the fridge where Emeka could see it every morning.",
      "By Friday, mornings felt calm and easy. “A good routine,” Emeka said, “is like a path. I just follow my steps.”",
    ],
    questions: [
      {
        prompt: "What were Emeka's mornings like before the checklist?",
        options: ["Calm and quiet", "Rushed and wild, with things always getting lost", "Slow and boring", "Full of singing"],
        answer: 1,
        explanation: "Wild mornings — lost shoes, lost folders, lots of rushing.",
      },
      {
        prompt: "What do Emeka and Dad make together?",
        options: ["A sandwich", "A song", "A morning checklist", "A treasure map"],
        answer: 2,
        explanation: "A morning checklist, drawn together on Sunday.",
      },
      {
        prompt: "Which of these is a step on Emeka's checklist?",
        options: ["Watch cartoons", "Brush teeth", "Play video games", "Call a friend"],
        answer: 1,
        explanation: "Brush teeth is right there on the list, between breakfast and backpack.",
      },
      {
        prompt: "Where does the checklist hang?",
        options: ["In Emeka's backpack", "Under the kitchen table", "On the fridge", "At school"],
        answer: 2,
        explanation: "On the fridge, where Emeka can see it every morning.",
      },
      {
        prompt: "Your turn: mornings feel rushed at your house. What could help?",
        options: ["Wake up even later", "Make a checklist and follow it step by step", "Skip breakfast every day", "Hope your shoes find themselves"],
        answer: 1,
        explanation: "A simple checklist turns a wild morning into a calm path.",
      },
    ],
  },
  {
    id: "p2-g3-tablet",
    grade: "3",
    title: "Lucia and the Tablet Timer",
    emoji: "📱",
    theme: "Screen-time balance",
    pages: [
      "Lucia loved her tablet. The building game, the drawing app, the funny cat videos — she could tap and scroll for hours without noticing the time at all.",
      "One Saturday, her cousin Mateo knocked on the door. “We're building a fort in the backyard!” Lucia didn't look up. “In a minute,” she said. She said it four more times.",
      "When Lucia finally stepped outside, the fort was finished, the lemonade was gone, and Mateo was riding his bike home. She had missed the whole afternoon — and her eyes felt tired and buzzy.",
      "That night, Lucia had an idea. She set a timer for thirty minutes of tablet time. “When it rings, I'm done — even if the game is exciting.” She put the timer where she could see it.",
      "The next weekend, the timer rang, and Lucia put the tablet down. She built the tallest tower in the fort, drank two lemonades, and taught Mateo her favorite card game. “The tablet waited for me,” she said. “The fort wouldn't.”",
    ],
    questions: [
      {
        prompt: "What happens while Lucia stays on her tablet?",
        options: ["Mateo builds the fort and saves it all for her", "Lucia misses the whole afternoon with her cousin", "The tablet's battery dies at noon", "It starts raining outside"],
        answer: 1,
        explanation: "The fort, the lemonade, the whole afternoon — gone before she looked up.",
      },
      {
        prompt: "How does Lucia feel when she finally goes outside?",
        options: ["Proud and rested", "She doesn't mind at all", "Left out, with tired, buzzy eyes", "Angry at Mateo for starting without her"],
        answer: 2,
        explanation: "Missing out felt heavy — and so did her tired, buzzy eyes.",
      },
      {
        prompt: "What idea does Lucia have that night?",
        options: ["To hide the tablet forever", "To set a timer and stop when it rings", "To play even longer next weekend", "To give her tablet to Mateo"],
        answer: 1,
        explanation: "A timer she can see — and a promise to stop when it rings.",
      },
      {
        prompt: "What does Lucia discover the next weekend?",
        options: ["Timers never work", "Mateo doesn't want to play anymore", "Putting the tablet down leaves time for forts, lemonade, and card games", "The fort fell down in the wind"],
        answer: 2,
        explanation: "The tablet waited patiently. The fort — and Mateo — were live, one-time fun.",
      },
      {
        prompt: "Your turn: screen time keeps swallowing your whole afternoon. What is a balanced plan?",
        options: ["Never touch a screen again", "Set a timer, stop when it rings, and choose another kind of fun", "Hide the screen so your family can't find it", "Play until someone makes you stop"],
        answer: 1,
        explanation: "A timer plus another kind of fun — balance you can actually keep.",
      },
    ],
  },
  {
    id: "p2-g3-forgive",
    grade: "3",
    title: "Hazel and the Broken Shell",
    emoji: "🐚",
    theme: "Forgiving & making up",
    pages: [
      "Hazel's favorite treasure was a smooth pink shell she had found at the beach with her best friend, Ivy. It sat on her desk in a place of honor.",
      "During art time, Ivy reached across Hazel's desk for the glue — and knocked the shell to the floor. Crack! It broke into three pieces. “Hazel, I'm so—” “Don't talk to me,” Hazel snapped.",
      "For two whole days, Hazel gave Ivy the silent treatment. But being angry all day was exhausting. At lunch, she watched Ivy sit alone, and her own sandwich tasted like cardboard.",
      "That evening, Hazel glued the shell back together. The cracks still showed, like tiny lightning bolts. “It's different now,” she thought. “But it's still mine. And Ivy is still my friend.”",
      "In the morning, Hazel walked up to Ivy. “I was really mad. And I forgive you. It was an accident.” Ivy's eyes filled up. “I'll be careful forever,” she promised. Their friendship, like the shell, had cracks — and it was still whole.",
    ],
    questions: [
      {
        prompt: "Why is the pink shell so special to Hazel?",
        options: ["It is worth a lot of money", "She found it at the beach with her best friend", "It was a prize from school", "Her teacher gave it to her"],
        answer: 1,
        explanation: "Hazel found the shell at the beach with Ivy, her best friend.",
      },
      {
        prompt: "How does the shell break?",
        options: ["Hazel throws it across the room", "It falls during an earthquake", "A classmate steps on it", "Ivy knocks it off the desk by accident reaching for glue"],
        answer: 3,
        explanation: "An accident — Ivy was reaching for the glue, not trying to break anything.",
      },
      {
        prompt: "What does Hazel do for two whole days?",
        options: ["She forgives Ivy right away", "She gives Ivy the silent treatment", "She shops for a new shell", "She tells the whole class what Ivy did"],
        answer: 1,
        explanation: "Two days of silence — and two days of feeling awful.",
      },
      {
        prompt: "How does holding on to anger feel for Hazel?",
        options: ["Fun and powerful", "It doesn't bother her at all", "Exhausting — even her sandwich tastes like cardboard", "Like a long vacation"],
        answer: 2,
        explanation: "Staying angry took all her energy. Forgiving set some of it free.",
      },
      {
        prompt: "Your turn: a friend breaks something of yours by accident and says sorry. What does forgiving look like?",
        options: ["Staying mad forever to teach them a lesson", "Telling your friend you forgive them and letting the friendship heal", "Breaking something of theirs back", "Forgiving only if they buy you two new ones"],
        answer: 1,
        explanation: "Forgiving doesn't erase the crack — it keeps the friendship whole anyway.",
      },
    ],
  },
  {
    id: "p2-g4-voice",
    grade: "4",
    title: "Deshawn's Hand Goes Up",
    emoji: "🎤",
    theme: "Confidence & a brave voice",
    pages: [
      "Deshawn had ideas. Good ones — the kind that arrived in his head fully built, like little machines. But in class, his ideas stayed locked behind his teeth while other students answered every question.",
      "During science, Ms. Chen asked why the moon changes shape. Deshawn knew. He had spent Saturday with a flashlight, an orange, and his uncle, testing it. His hand rose halfway… and sank back down. What if he said it wrong and everyone laughed?",
      "At recess, his friend Camila said, “You always know the science stuff. Why don't you ever say it?” Deshawn kicked a pebble. “My voice feels too small for the whole room.”",
      "That night, Deshawn practiced in front of his little sister's stuffed animals. He said his moon answer out loud three times. The third time, his voice sounded strong — like it belonged to him.",
      "The next day, Ms. Chen asked about the seasons. Deshawn's heart thumped, but his hand went all the way up. His answer wasn't perfect — he mixed up two words — and nobody laughed. Two classmates asked him questions afterward. A brave voice, he learned, doesn't have to be loud. It just has to speak.",
    ],
    questions: [
      {
        prompt: "Why don't Deshawn's ideas get shared in class?",
        options: ["He never has any ideas", "He is afraid of saying something wrong and being laughed at", "The teacher never lets anyone answer", "He only likes writing answers down"],
        answer: 1,
        explanation: "Deshawn's ideas were good — his fear of laughter kept them locked away.",
      },
      {
        prompt: "What has Deshawn explored at home with a flashlight and an orange?",
        options: ["How to bake bread", "Soccer rules", "Magic tricks", "Why the moon changes shape"],
        answer: 3,
        explanation: "A flashlight for the sun and an orange for the moon — real scientist work.",
      },
      {
        prompt: "What does Deshawn do to get ready to speak up?",
        options: ["He memorizes the whole textbook", "He asks Camila to answer for him", "He practices saying his answer out loud at home", "He decides to stay quiet all year"],
        answer: 2,
        explanation: "Practicing out loud made his voice feel like it belonged to him.",
      },
      {
        prompt: "What happens when Deshawn finally answers in class?",
        options: ["Everyone laughs at him", "He mixes up two words, nobody laughs, and classmates ask him questions", "His answer is perfect and the class applauds", "The teacher says he is wrong about everything"],
        answer: 1,
        explanation: "Imperfect — and completely fine. That's how brave voices grow.",
      },
      {
        prompt: "Your turn: you have an idea in class but feel nervous. What is a brave-voice plan?",
        options: ["Only answer if you are 100 percent sure", "Never share an idea, ever", "Whisper and hope the teacher hears you", "Practice your thought, raise your hand, and speak — imperfect is okay"],
        answer: 3,
        explanation: "A brave voice doesn't have to be loud or perfect. It just has to speak.",
      },
    ],
  },
  {
    id: "p2-g4-losing",
    grade: "4",
    title: "Ruth and the Finish Line",
    emoji: "🏁",
    theme: "Losing with grace",
    pages: [
      "Ruth had trained for the school fun-run all spring. She ran before breakfast, she ran after dinner, and her stopwatch showed her times dropping week after week. This year, she was going to win the blue ribbon.",
      "On race day, Ruth flew off the start line. She led for two whole laps. Then, on the last turn, her friend Willa surged past, strong and steady, and crossed the line two steps ahead.",
      "Ruth's chest burned — and not just from running. Second place. All that training, and someone had been faster. For one hot moment, she wanted to say the race was unfair, that her shoe had been loose, that it didn't count.",
      "But Ruth knew the truth: her shoe was fine, the race was fair, and Willa had simply run a beautiful race. Ruth walked over, still breathing hard. “You were amazing on that last turn,” she said. “Great race.”",
      "Willa's grin was enormous. “You pushed me the whole way. Same time next year?” Ruth laughed — a real laugh, even with the sting. Losing hurt, but it hadn't shrunk her one bit. She already knew what she would train next.",
    ],
    questions: [
      {
        prompt: "What has Ruth been training for all spring?",
        options: ["A spelling bee", "The school fun-run", "A chess tournament", "A dance recital"],
        answer: 1,
        explanation: "The fun-run — Ruth trained before breakfast and after dinner.",
      },
      {
        prompt: "What happens on the last turn of the race?",
        options: ["Ruth trips and falls", "The race is stopped for rain", "Willa surges past and wins by two steps", "Ruth wins easily"],
        answer: 2,
        explanation: "Willa's strong finish put her two steps ahead at the line.",
      },
      {
        prompt: "What is Ruth tempted to do right after losing?",
        options: ["Congratulate Willa immediately", "Make excuses — say the race was unfair and her shoe was loose", "Quit running forever", "Demand a rematch on the spot"],
        answer: 1,
        explanation: "Excuses were tempting — for exactly one hot moment.",
      },
      {
        prompt: "What does Ruth actually do?",
        options: ["She walks off without a word", "She blames her shoes", "She congratulates Willa honestly and means it", "She hides until everyone leaves"],
        answer: 2,
        explanation: "Ruth told herself the truth, then told Willa a genuine “great race.”",
      },
      {
        prompt: "Your turn: you lose a game you really wanted to win. What shows grace?",
        options: ["Saying “that didn't count” and storming off", "Congratulating the winner and letting the sting teach you something", "Refusing to play ever again", "Telling everyone the winner must have cheated"],
        answer: 1,
        explanation: "Losing hurts — and it doesn't shrink you. Grace turns a loss into fuel.",
      },
    ],
  },
  {
    id: "p2-g5-test",
    grade: "5",
    title: "Nadia's Night-Before Plan",
    emoji: "🌙",
    theme: "Calm before the test",
    pages: [
      "The state math test was on Friday, and by Wednesday, Nadia's stomach had started doing backflips. At dinner she pushed her pasta around her plate. Her thoughts kept sprinting ahead: What if I blank? What if it's all the hard kind of problems? What if I'm the only one who doesn't finish?",
      "Her older brother, Samir, slid into the chair beside her. “You look like I did last year,” he said. “Want to know what actually helped? It wasn't studying until midnight. It was having a plan.”",
      "So Nadia made one. Thursday: review her notes for thirty minutes, then stop. Pack her pencils and water bottle. Lay out comfortable clothes. In bed by nine, with a chapter of her favorite book — because a rested brain is a ready brain.",
      "On Friday morning, when the worries started up again, Nadia used the self-talk she had practiced: “I've prepared. I can do one problem at a time. A hard question isn't a wall — it's just a door I haven't opened yet.” She ate breakfast. She breathed slowly. She walked into school feeling steady.",
      "The test had hard questions — and Nadia handled them one at a time, skipping and returning, just like her plan. When she put her pencil down, her stomach was calm. The grade would be whatever it would be. She had done something bigger than the test: she had taken care of the person taking it.",
    ],
    questions: [
      {
        prompt: "Why is Nadia's stomach doing backflips?",
        options: ["She ate too much pasta", "She is worried about the state math test on Friday", "She is excited about a field trip", "Her brother keeps teasing her"],
        answer: 1,
        explanation: "Test worries — her thoughts kept sprinting to everything that could go wrong.",
      },
      {
        prompt: "What does Samir say actually helped him last year?",
        options: ["Studying until midnight", "Drinking lots of soda", "Having a plan instead of last-minute cramming", "Skipping breakfast to save time"],
        answer: 2,
        explanation: "Not midnight cramming — a plan. That's what steadied Samir.",
      },
      {
        prompt: "Which of these is part of Nadia's night-before plan?",
        options: ["Review all night long", "Review for thirty minutes, pack her things, and be in bed by nine", "Watch videos until she falls asleep", "Skip dinner so she can study"],
        answer: 1,
        explanation: "Thirty minutes of review, everything packed, and real sleep — a rested brain is a ready brain.",
      },
      {
        prompt: "What self-talk does Nadia practice for the test?",
        options: ["“This test decides everything about me.”", "“I must get every single question right.”", "“One problem at a time — a hard question is a door I haven't opened yet.”", "“Nobody else is nervous, so I shouldn't be.”"],
        answer: 2,
        explanation: "Calm, prepared self-talk turned hard questions into doors, not walls.",
      },
      {
        prompt: "Your turn: a big test is coming and your worries are loud. What is the strongest plan?",
        options: ["Stay up all night studying and skip breakfast", "Make a plan: study in small pieces, rest well, eat breakfast, and use calm self-talk", "Refuse to think about the test at all", "Just hope the test gets cancelled"],
        answer: 1,
        explanation: "Preparation plus rest plus kind self-talk — take care of the person taking the test.",
      },
    ],
  },
  {
    id: "p2-g5-choice",
    grade: "5",
    title: "Julian's Own Choice",
    emoji: "🧭",
    theme: "Peer pressure & my own choice",
    pages: [
      "The shortcut behind the gym was officially off-limits, which was exactly why Marco and his crew thought it was hilarious to dare each other to climb the fence and cut through it. On Thursday, the dare landed on Julian.",
      "“Come on,” Marco said, already halfway up the fence. “Everyone does it. Don't be a baby.” The words stung more than Julian expected. His hands were sweating. Part of him wanted to climb just to make the moment stop.",
      "But another part of him — the part that sounded like his own voice — asked a simple question: Do I actually want to do this? The answer was no. He didn't think the shortcut was fun. He thought it was a good way to get in trouble and a lousy way to spend a recess.",
      "Julian took a breath. “I'm good,” he said, as evenly as he could. “I'll take the long way. See you at the field.” Marco shrugged and climbed. Nobody laughed. The moment Julian had been dreading lasted about four seconds — and then it was just… over.",
      "At the field, Julian found two other classmates shooting hoops, and the game that followed was the best part of his day. That night, he thought about the fence. Doing what everyone else does is easy. Doing what you believe is right — even with sweaty hands — is how you become the kind of person you respect.",
    ],
    questions: [
      {
        prompt: "What dare lands on Julian?",
        options: ["To race around the track", "To climb the fence and take the off-limits shortcut", "To hide a classmate's backpack", "To skip lunch"],
        answer: 1,
        explanation: "The fence-climbing dare — Thursday was Julian's turn, according to Marco.",
      },
      {
        prompt: "How does Julian feel when Marco calls him a baby?",
        options: ["Relieved", "Proud of himself", "Stung, with sweaty hands — part of him wants to climb just to end the moment", "Completely bored"],
        answer: 2,
        explanation: "Peer pressure works because it stings. Julian felt all of it — and still decided for himself.",
      },
      {
        prompt: "What question helps Julian decide what to do?",
        options: ["“What will make Marco like me most?”", "“Do I actually want to do this?”", "“Can anyone see us right now?”", "“How fast can I climb?”"],
        answer: 1,
        explanation: "One honest question cut through all the noise: Do I actually want this?",
      },
      {
        prompt: "What happens right after Julian calmly says no?",
        options: ["Everyone laughs at him for the rest of the year", "Marco never speaks to him again", "Almost nothing — the moment passes in seconds and Julian enjoys his recess", "He gets in trouble anyway"],
        answer: 2,
        explanation: "The dreaded moment lasted about four seconds. Most no's turn out that way.",
      },
      {
        prompt: "Your turn: friends dare you to do something that feels wrong to you. What is the strongest choice?",
        options: ["Do it so they will stop asking", "Say you're sick every single time", "Check your own voice, say no calmly if it isn't right for you, and walk toward something better", "Do it and hope nobody finds out"],
        answer: 2,
        explanation: "Your choices make you who you are — even the sweaty-handed ones. Especially those.",
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
