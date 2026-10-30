export const aiLessons = [
  {
    id: "patterns", title: "Be a pattern detective", word: "Pattern",
    meaning: "A pattern is something that repeats or a connection we notice.",
    story: "Circle, square, circle, square... What might come next? You used the repeating part to make a guess. Computers can look for patterns too. Not every pattern repeats in a neat line: it might connect a shape to a group.",
    tryIt: "Clap, tap, clap, tap. Say what comes next. Then invent a different repeating pattern for a friend.",
    question: "Circle, square, circle, square, __. What fits this repeating pattern?",
    options: ["Circle", "Triangle", "There is no way to make a guess"], answer: "Circle",
    explanation: "The rule repeats circle then square, so circle comes next. A guess based on a pattern is called a prediction.",
    extend: ["Draw the repeating part and explain your guess.", "Can two different rules fit the first few items? Give an example.", "Explain why a short pattern is evidence, not proof of what must happen next."],
  },
  {
    id: "examples", title: "Examples are teaching clues", word: "Data",
    meaning: "Data is information, such as numbers, pictures, or examples.",
    story: "Imagine teaching a computer to sort pretend shape cards. Each card is an example. A feature is a detail, like its shape or color. A label is the group name we give it, like Sun group or Moon group. These are made-up sorting groups, not facts about the world.",
    tryIt: "Find a circle and a square on paper. Point to a feature. Give each a pretend group label. Do not use people's names, photos, or private information.",
    question: "On a card that says 'blue circle: Sun group', which part is the label?",
    options: ["Blue", "Circle", "Sun group"], answer: "Sun group",
    explanation: "Blue and circle describe features. Sun group is the answer label a teacher attached to this example.",
    extend: ["Name two features of a paper shape.", "Explain the difference between a feature and a label.", "What could happen if many example labels were incorrect?"],
  },
  {
    id: "training", title: "Teach with examples", word: "Training",
    meaning: "Training means using examples to adjust a model so it can make predictions.",
    story: "Some programs follow rules a person writes, like 'turn right'. In machine learning, a kind of AI, a training process finds patterns in examples instead. People still design the process and choose the data. In our tiny lab, training counts how often a feature gets each label.",
    tryIt: "Open the shape lab below. Choose Shape and press Train model. Notice which group has more circle examples. The computer counts; it does not understand shapes like you do.",
    question: "What happens during training in our tiny lab?",
    options: ["The computer grows a human brain", "The model counts labeled examples", "The computer knows every answer forever"],
    answer: "The model counts labeled examples",
    explanation: "Our training method counts examples for each feature. Real machine-learning systems can learn much more complex patterns, but they can still be wrong.",
    extend: ["Show which group has more circle examples.", "How could adding another labeled example change the counts?", "Compare a hand-written rule with a pattern learned from labeled examples."],
  },
  {
    id: "model", title: "What is an AI model?", word: "Model",
    meaning: "A machine-learning model is like a computer's pattern guide. Training builds or adjusts it using examples so it can make predictions.",
    story: "Think of a model as a little pattern guide, not a person. In this lab the guide is a table of learned counts. Other models can be much larger, with many numbers. An app is the whole tool you use; a model can be one part inside it. A model does not have feelings or know things the way people do.",
    tryIt: "Read the model table after training. Explain its circle row to a grown-up: 'It saw this many examples for each group.'",
    question: "Which description best fits our trained model?",
    options: ["A person living inside the screen", "The whole internet", "A guide of patterns learned from examples"],
    answer: "A guide of patterns learned from examples",
    explanation: "The table is our tiny model. Training made it from examples; using it to guess a group is prediction. It is not a thinking friend or a guarantee of truth.",
    extend: ["Tell a friend what a model is in your own words.", "Explain how a model and an app are different.", "Why is a confident-sounding answer not proof that a model understands or is correct?"],
  },
  {
    id: "testing", title: "A prediction is a guess", word: "Testing",
    meaning: "Testing means checking predictions against answers we know, ideally using examples not used for training.",
    story: "Our pretend sorting rule puts circles in Sun group and other shapes in Moon group. The computer is not secretly given that rule: it only sees the training examples. If it looks only at color, a blue square may get the wrong group. New or tied evidence makes our lab say 'Not sure' instead of pretending.",
    tryIt: "Train with Color, then Check two new cards. Next train with Shape and check again. A new triangle still has no shape examples. One successful test would not prove the model is always right.",
    question: "A model gets one new card wrong. What should we do?",
    options: ["Check its examples and test more cards", "Trust it because computers never make mistakes", "Hide the mistake"],
    answer: "Check its examples and test more cards",
    explanation: "Mistakes help us discover missing examples or an unhelpful feature. Keep test examples separate from training when measuring how well a model handles new cases.",
    extend: ["Point to a prediction that needs a human check.", "Why can color be an unhelpful clue for our shape rule?", "Why should test cards be kept out of training when checking new-case performance?"],
  },
  {
    id: "responsible", title: "Be a kind, careful AI explorer", word: "Responsible AI",
    meaning: "Use AI carefully: protect privacy, check mistakes, and think about who might be left out or harmed.",
    story: "Examples that leave out important groups can make a model less useful for those groups. More examples alone do not guarantee fairness. Sorting pretend cards is not the same as judging people. Never use our toy model to decide who is smart, kind, or allowed to join a team. Keep names, passwords, photos, and private stories out of AI tools. Ask a trusted adult before using an outside AI service.",
    tryIt: "With a grown-up, name one answer that needs checking and one kind of private information you should not share. Our lab uses only pretend shape cards.",
    question: "An AI tool asks for your password to help with homework. What is the safe choice?",
    options: ["Share it if the tool sounds friendly", "Do not share it; ask a trusted adult", "Send a friend's password instead"],
    answer: "Do not share it; ask a trusted adult",
    explanation: "Keep private information private. AI output can be mistaken or unfair. Use trusted sources and adult guidance, especially for decisions about people, health, or safety.",
    extend: ["Name one safe and one private kind of example.", "Who might be left out of a training set, and why does that matter?", "Explain why good test scores alone do not prove a system is fair or safe."],
  },
] as const;
export const aiLessonIds: readonly string[] = aiLessons.map((lesson) => lesson.id);
export type Shape = "circle" | "square" | "triangle";
export type Color = "red" | "blue";
export type Group = "Sun" | "Moon";
export type Feature = "shape" | "color";
export interface ShapeCard { shape: Shape; color: Color }
export interface Example extends ShapeCard { label: Group }
export interface TinyModel { feature: Feature; counts: Record<string, { Sun: number; Moon: number }> }
export const initialExamples: readonly Example[] = [
  { color: "red", shape: "circle", label: "Sun" },
  { color: "blue", shape: "circle", label: "Sun" },
  { color: "red", shape: "square", label: "Moon" },
];
export const testCards: readonly (ShapeCard & { expected: Group })[] = [
  { color: "blue", shape: "square", expected: "Moon" },
  { color: "red", shape: "triangle", expected: "Moon" },
];
export function trainModel(examples: readonly Example[], feature: Feature): TinyModel {
  const counts: TinyModel["counts"] = {};
  for (const example of examples) {
    const key = example[feature];
    if (!counts[key]) counts[key] = { Sun: 0, Moon: 0 };
    counts[key][example.label]++;
  }
  return { feature, counts };
}
export function predict(model: TinyModel, card: ShapeCard): { label: Group | null; reason: string } {
  const key = card[model.feature];
  const counts = model.counts[key];
  if (!counts) return { label: null, reason: `No ${key} examples were seen during training.` };
  if (counts.Sun === counts.Moon)
    return { label: null, reason: `${key}: ${counts.Sun} Sun and ${counts.Moon} Moon examples. A tie!` };
  return {
    label: counts.Sun > counts.Moon ? "Sun" : "Moon",
    reason: `${key}: ${counts.Sun} Sun and ${counts.Moon} Moon examples. The larger count wins; this is not a probability or a guarantee.`,
  };
}
