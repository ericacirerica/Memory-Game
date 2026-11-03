// 1. Settings: the symbols on the cards, and how many pairs/columns each level has.
const SYMBOLS = ["🦊", "🐙", "🌵", "🍉", "🚀", "🎸", "🍄", "🪁", "🐝", "🧊", "🌙", "🍋"];
const LEVELS = {
  easy:   { pairs: 6,  cols: 4 },
  medium: { pairs: 8,  cols: 4 },
  hard:   { pairs: 10, cols: 5 }
};

// 2. Game state: everything that changes while you play.
let level = "medium";
let firstCard = null;   // the first card flipped in the current turn
let locked = false;     // true while a wrong pair is showing, so you can't flip more
let moves = 0;
let matches = 0;
let seconds = 0;
let timerId = null;

// 3. Grab the page elements we need to update.
const board = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const winDialog = document.getElementById("win");
const winText = document.getElementById("winText");

// 4. Helpers.
// Fisher-Yates shuffle: gives every ordering an equal chance (unlike sort(random)).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(s) {
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// Best score is saved in the browser. try/catch keeps the game working
// even if the browser blocks storage (e.g. some private modes).
function getBest() {
  try {
    const v = localStorage.getItem("memory-best-" + level);
    return v ? Number(v) : null;
  } catch (e) { return null; }
}
function saveBest(value) {
  try { localStorage.setItem("memory-best-" + level, String(value)); } catch (e) {}
}
function showBest() {
  const best = getBest();
  bestEl.textContent = best === null ? "-" : best;
}

function startTimer() {
  timerId = setInterval(() => {
    seconds++;
    timeEl.textContent = formatTime(seconds);
  }, 1000);
}
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// 5. Start (or restart) a game.
function newGame() {
  stopTimer();
  firstCard = null;
  locked = false;
  moves = 0;
  matches = 0;
  seconds = 0;
  movesEl.textContent = "0";
  timeEl.textContent = "0:00";
  showBest();

  const { pairs, cols } = LEVELS[level];
  // Pick random symbols, double them so each has a twin, then shuffle.
  const chosen = shuffle(SYMBOLS.slice()).slice(0, pairs);
  const deck = shuffle([...chosen, ...chosen]);

  board.style.setProperty("--cols", cols);
  board.innerHTML = "";
  deck.forEach((symbol) => {
    const card = document.createElement("button");
    card.className = "card";
    card.dataset.symbol = symbol;
    card.setAttribute("aria-label", "Hidden card");
    card.innerHTML =
      '<div class="inner"><div class="back"></div><div class="face">' + symbol + "</div></div>";
    board.appendChild(card);
  });
}

// 6. What happens when a card is clicked.
function handleCard(card) {
  // Ignore clicks while checking a pair, or on cards already showing.
  if (locked || card.classList.contains("flipped") || card.classList.contains("matched")) return;

  if (timerId === null) startTimer(); // clock starts on your first flip

  card.classList.add("flipped");
  card.setAttribute("aria-label", "Card " + card.dataset.symbol);

  // First card of a turn: remember it and wait for the second.
  if (firstCard === null) {
    firstCard = card;
    return;
  }

  // Second card: this counts as one move.
  moves++;
  movesEl.textContent = moves;

  if (firstCard.dataset.symbol === card.dataset.symbol) {
    // Match! Lock both cards face-up.
    [firstCard, card].forEach((c) => {
      c.classList.remove("flipped");
      c.classList.add("matched");
    });
    firstCard = null;
    matches++;
    if (matches === LEVELS[level].pairs) win();
  } else {
    // No match: show both briefly, then flip them back.
    locked = true;
    const a = firstCard;
    const b = card;
    setTimeout(() => {
      [a, b].forEach((c) => {
        c.classList.remove("flipped");
        c.setAttribute("aria-label", "Hidden card");
      });
      firstCard = null;
      locked = false;
    }, 800);
  }
}

// 7. Winning.
function win() {
  stopTimer();
  const best = getBest();
  let msg = "Done in " + moves + " moves and " + formatTime(seconds) + ".";
  if (best === null || moves < best) {
    saveBest(moves);
    showBest();
    msg += " That's a new best!";
  }
  winText.textContent = msg;
  // Short pause so the last pair is seen flipping before the dialog appears.
  setTimeout(() => winDialog.showModal(), 500);
}

// 8. Wire up the buttons.
board.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) handleCard(card);
});

document.querySelectorAll("[data-level]").forEach((btn) => {
  btn.addEventListener("click", () => {
    level = btn.dataset.level;
    document.querySelectorAll("[data-level]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn))
    );
    newGame();
  });
});

document.getElementById("restart").addEventListener("click", newGame);
document.getElementById("again").addEventListener("click", () => {
  winDialog.close();
  newGame();
});

newGame();