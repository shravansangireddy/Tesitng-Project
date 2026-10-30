export const codingGrades = ["3", "4", "5"] as const;
export type CodingGrade = typeof codingGrades[number];
export function isCodingGrade(grade: string): grade is CodingGrade {
  return codingGrades.some((id) => id === grade);
}
export type Block =
  | { kind: "move" | "left" | "right" | "call" }
  | { kind: "repeat"; times: number; body: Block[] }
  | { kind: "if"; yes: Block[]; no: Block[] };
export type BlockKind = Block["kind"];
export interface Program { main: Block[]; helper: Block[] }
export interface CodingPuzzle {
  id: string;
  grade: CodingGrade;
  title: string;
  concept: string;
  learn: string;
  task: string;
  hint: string;
  explanation: string;
  board: string[];
  allowed: BlockKind[];
  required: BlockKind[];
  budget?: number;
  nestedRepeat?: boolean;
  starter?: Program;
  solution: Program;
}
const move: Block = { kind: "move" };
const left: Block = { kind: "left" };
const right: Block = { kind: "right" };
const call: Block = { kind: "call" };
const repeat = (times: number, body: Block[]): Block => ({ kind: "repeat", times, body });
const check: Block = { kind: "if", yes: [move], no: [right] };
const program = (main: Block[], helper: Block[] = []): Program => ({ main, helper });
const basics: BlockKind[] = ["move", "left", "right"];
const loops: BlockKind[] = [...basics, "repeat"];
const decisions: BlockKind[] = [...loops, "if"];
const all: BlockKind[] = [...decisions, "call"];

// Each board uses # walls, . paths, a directional starting robot, and one G goal.
export const codingPuzzles: CodingPuzzle[] = codingGrades.flatMap((grade): CodingPuzzle[] => {
  const steps = Number(grade);
  const straight = [`>${".".repeat(steps - 1)}G`];
  const corner = grade === "3" ? [">.#", "#.G"]
    : grade === "4" ? [">..#", "##.#", "##.G"]
      : [">...#", "###.#", "###.#", "###.G"];
  const across = Number(grade) - 2;
  const down = Number(grade) - 2;
  const zigzag: Block[] = [repeat(across, [move]), right, repeat(down, [move]), left, move];
  return [
    {
      id: `${grade}-sequence`, grade, title: grade === "3" ? "Robot's first delivery" : grade === "4" ? "Plan a longer delivery" : "Algorithm designer",
      concept: "Sequencing", learn: "An algorithm is a clear plan. A sequence follows instructions in order. Move takes one square in the direction the robot faces.",
      task: `Deliver the robot to the goal in ${steps} moves. Build the plan before you run it.`,
      hint: "The robot starts facing right. Add one Move for each square between the robot and G.",
      explanation: `Your ${steps} Move instructions ran in order. Computers follow the plan exactly, not what we meant to say.`,
      board: straight, allowed: basics, required: [], solution: program(Array.from({ length: steps }, () => move)),
    },
    {
      id: `${grade}-turns`, grade, title: grade === "3" ? "Turn the corner" : grade === "4" ? "Delivery detour" : "Map the route",
      concept: "Directions", learn: "Turn left and Turn right change which way the robot faces. Turning does not move it. Directions belong to the robot, not to the screen.",
      task: "Follow the path around the walls. Turn, then move. Finish on G.",
      hint: `Move right along the path ${across} square${across === 1 ? "" : "s"}, turn right to face down, move ${down}, then turn left and move once.`,
      explanation: "You separated turning from moving and used the robot's direction to plan a route.",
      board: corner, allowed: basics, required: [],
      solution: program([...Array.from({ length: across }, () => move), right, ...Array.from({ length: down }, () => move), left, move]),
    },
    {
      id: `${grade}-debug`, grade, title: grade === "3" ? "Find the bug" : grade === "4" ? "Repair the delivery" : "Trace, predict, repair",
      concept: "Debugging", learn: "A bug is a mistake in a program. Debugging means checking what happened, changing the plan, and trying again. A mistake is useful information!",
      task: "The starter program turns toward a wall. Run it, read the trace, and repair it to reach G.",
      hint: "Remove the first Turn right. Then add enough Move instructions to reach G. Each run starts from the original robot.",
      explanation: "You used evidence from the trace to fix the instructions. Debugging is part of every programmer's work.",
      board: straight, allowed: basics, required: [],
      starter: program([right, move]), solution: program(Array.from({ length: steps }, () => move)),
    },
    {
      id: `${grade}-repeat`, grade, title: grade === "3" ? "A handy repeat" : grade === "4" ? "Two repeat routes" : "Loops inside loops",
      concept: grade === "5" ? "Nested loops" : "Loops",
      learn: grade === "5"
        ? "A nested loop is a repeat inside another repeat. Repeat 2 with Repeat 2 containing Move makes 2 times 2 = 4 moves."
        : "A loop repeats a group of instructions. Put Move inside a Repeat block instead of writing the same move many times.",
      task: grade === "3" ? "Use Repeat to travel four squares with at most 2 blocks."
        : grade === "4" ? "Use loops for the long sides of this path. Use at most 7 blocks."
          : "Use a repeat inside a repeat to travel four squares. Use at most 3 blocks.",
      hint: grade === "3" ? "Add Repeat, choose 4, then add Move inside it."
        : grade === "4" ? "Repeat Move twice, turn right, repeat Move twice, turn left, and move once."
          : "Repeat 2 contains another Repeat 2. Put one Move inside the inner repeat.",
      explanation: grade === "5" ? "The outer loop ran the inner loop twice. Two groups of two moves made four."
        : "Loops made repeated instructions easier to see and change. Each block inside a loop runs on every repetition.",
      board: grade === "4" ? corner : [">...G"], allowed: loops, required: ["repeat"],
      budget: grade === "3" ? 2 : grade === "4" ? 7 : 3,
      nestedRepeat: grade === "5",
      solution: program(grade === "3" ? [repeat(4, [move])] : grade === "4" ? zigzag : [repeat(2, [repeat(2, [move])])]),
    },
    {
      id: `${grade}-condition`, grade, title: grade === "3" ? "Check before you step" : grade === "4" ? "A robot that decides" : "Decisions in a loop",
      concept: "Conditions", learn: "A condition asks a yes-or-no question. If the square ahead is clear, run the Then blocks. Otherwise, run the Else blocks. A wall or the edge is not clear.",
      task: grade === "3" ? "Use If path ahead is clear to reach the goal."
        : "Use Repeat and If path ahead is clear to follow the right-turning path. Turn right when the path is blocked.",
      hint: grade === "3" ? "Put Move in Then. Repeat that check 3 times."
        : `Repeat ${grade === "4" ? 5 : 7} times. Inside, add If with Move in Then and Turn right in Else. A turn takes one repetition too.`,
      explanation: "The condition was checked when it ran, using the robot's current position and direction. Only one branch ran each time.",
      board: grade === "3" ? [">..G"] : grade === "4" ? [">..", "##.", "##G"] : [">...", "###.", "###.", "###G"],
      allowed: decisions, required: grade === "3" ? ["if"] : ["repeat", "if"],
      solution: program([repeat(grade === "3" ? 3 : grade === "4" ? 5 : 7, [check])]),
    },
    {
      id: `${grade}-function`, grade, title: grade === "3" ? "Teach a helper" : grade === "4" ? "Reusable delivery helper" : "Combine your superpowers",
      concept: "Functions", learn: "A function is a named group of instructions. Our function is named Helper. Defining it does not run it: Call Helper runs those blocks, then returns to the next instruction. Calls cannot go inside Helper here.",
      task: grade === "3" ? "Teach Helper to move twice. Call it twice to travel four squares."
        : grade === "4" ? "Teach Helper a short route. Call it twice to travel the staircase using at most 6 blocks."
          : "Combine a loop, a condition, and Helper to follow the path. Use at most 6 blocks.",
      hint: grade === "3" ? "Put two Moves inside Helper, then add two Call Helper blocks to your program."
        : grade === "4" ? "Helper: Move, Turn right, Move, Turn left. Main program: Call Helper twice."
          : "Helper: If clear, Move; Else, Turn right. Main program: Repeat 7 with Call Helper inside.",
      explanation: "You defined Helper once and called it from the main program. Functions let you reuse an idea without copying its instructions.",
      board: grade === "3" ? [">...G"] : grade === "4" ? [">.#", "#..", "##G"] : [">...", "###.", "###.", "###G"],
      allowed: all, required: grade === "5" ? ["repeat", "if", "call"] : ["call"],
      budget: grade === "3" ? 4 : 6,
      solution: grade === "3" ? program([call, call], [move, move])
        : grade === "4" ? program([call, call], [move, right, move, left])
          : program([repeat(7, [call])], [check]),
    },
  ];
});
export const codingPuzzleIds = codingPuzzles.map((puzzle) => puzzle.id);
export const blockLabels: Record<BlockKind, string> = {
  move: "Move", left: "Turn left", right: "Turn right", repeat: "Repeat",
  if: "If path ahead is clear", call: "Call Helper",
};
export interface Robot { x: number; y: number; direction: number }
export interface TraceStep extends Robot { message: string; kind?: BlockKind }
export interface Execution {
  trace: TraceStep[];
  success: boolean;
  message: string;
  blocks: number;
}
export function startingRobot(puzzle: CodingPuzzle): Robot {
  for (let y = 0; y < puzzle.board.length; y++) {
    for (let x = 0; x < puzzle.board[y].length; x++) {
      const direction = "^>v<".indexOf(puzzle.board[y][x]);
      if (direction !== -1) return { x, y, direction };
    }
  }
  throw new Error(`Coding puzzle ${puzzle.id} has no starting robot.`);
}
const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export function blockCount(blocks: Block[]): number {
  return blocks.reduce((total, block) => total + 1 +
    (block.kind === "repeat" ? blockCount(block.body) :
      block.kind === "if" ? blockCount(block.yes) + blockCount(block.no) : 0), 0);
}
export function runProgram(puzzle: CodingPuzzle, program: Program): Execution {
  let robot = startingRobot(puzzle);
  const trace: TraceStep[] = [{ ...robot, message: "Start. Read your plan, then follow each instruction." }];
  const used = new Set<BlockKind>();
  const blocks = blockCount(program.main) + blockCount(program.helper);
  const result = (success: boolean, message: string): Execution => ({ trace, success, message, blocks });
  if (!program.main.length) return result(false, "Add an instruction to your main program first.");
  if (blocks > 40) return result(false, "Use at most 40 blocks. Try a loop or a smaller plan.");
  const validate = (items: Block[], depth: number, helper: boolean): string | undefined => {
    if (depth > 3) return "Use at most three levels of nested groups.";
    for (const block of items) {
      if (!puzzle.allowed.includes(block.kind)) return "That block is not available in this lesson.";
      if (block.kind === "call" && helper) return "Helper cannot call itself. Put calls in the main program.";
      if (block.kind === "repeat") {
        if (!Number.isInteger(block.times) || block.times < 2 || block.times > 8)
          return "Repeat must be a whole number from 2 to 8.";
        if (!block.body.length) return "Add instructions inside every Repeat.";
        const error = validate(block.body, depth + 1, helper);
        if (error) return error;
      }
      if (block.kind === "if") {
        if (!block.yes.length) return "Add an instruction to the Then branch.";
        const error = validate(block.yes, depth + 1, helper) ?? validate(block.no, depth + 1, helper);
        if (error) return error;
      }
    }
    return undefined;
  };
  const invalid = validate(program.main, 0, false) ?? validate(program.helper, 0, true);
  if (invalid) return result(false, invalid);
  let failure = "";
  let operations = 0;
  let ranNestedRepeat = false;
  const clear = () => {
    const [dx, dy] = offsets[robot.direction];
    const cell = puzzle.board[robot.y + dy]?.[robot.x + dx];
    return cell !== undefined && cell !== "#";
  };
  const execute = (items: Block[], repeatDepth = 0): void => {
    for (const block of items) {
      if (failure) return;
      if (++operations > 200) { failure = "Stopped at 200 instructions. Shorten the loop plan and try again."; return; }
      used.add(block.kind);
      let message = blockLabels[block.kind];
      if (block.kind === "move") {
        if (!clear()) {
          failure = "Bump! A wall or the edge is ahead. Check the last position and try changing your plan.";
        } else {
          const [dx, dy] = offsets[robot.direction];
          robot = { ...robot, x: robot.x + dx, y: robot.y + dy };
        }
      } else if (block.kind === "left" || block.kind === "right") {
        robot = { ...robot, direction: (robot.direction + (block.kind === "right" ? 1 : 3)) % 4 };
      } else if (block.kind === "repeat") {
        if (repeatDepth > 0) ranNestedRepeat = true;
        message = `Repeat the inside blocks ${block.times} times.`;
      } else if (block.kind === "if") {
        message = `Path ahead is ${clear() ? "clear: run Then" : "blocked: run Else"}.`;
      } else if (!program.helper.length) failure = "Helper is empty. Teach Helper some instructions first.";
      trace.push({ ...robot, kind: block.kind, message: failure || message });
      if (failure) return;
      if (block.kind === "repeat") {
        for (let i = 0; i < block.times && !failure; i++) execute(block.body, repeatDepth + 1);
      } else if (block.kind === "if") execute(clear() ? block.yes : block.no, repeatDepth);
      else if (block.kind === "call") execute(program.helper, repeatDepth);
    }
  };
  execute(program.main);
  if (failure) return result(false, failure);
  if (puzzle.board[robot.y][robot.x] !== "G") return result(false, "Your plan finished, but not on G yet. Use the trace to plan your next change.");
  if (puzzle.required.some((kind) => !used.has(kind)))
    return result(false, `You reached G! Now practice this lesson using ${puzzle.required.map((kind) => blockLabels[kind]).join(" and ")}.`);
  if (puzzle.nestedRepeat && !ranNestedRepeat)
    return result(false, "You reached G! Now practice nesting: put one Repeat inside another Repeat.");
  if (puzzle.budget && blocks > puzzle.budget)
    return result(false, `You reached G! Now simplify to at most ${puzzle.budget} blocks (including Helper). You used ${blocks}.`);
  return result(true, `Delivery complete! ${puzzle.explanation}`);
}
