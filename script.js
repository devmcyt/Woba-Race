const SCORE = 50;
let DICTIONARY_SET = new Set();
let activeBoardLetters = [];
let playerpoints = 0;
let aipoints = 0;
let Ailoss = false;
let playerFound = new Set();
let Aifound = new Set();
let aiTimeoutId = null;
let aiAvailableBoardWords = [];

const playerGrid = document.getElementById("player-grid");
const aiGrid = document.getElementById("ai-grid");
const wordInput = document.getElementById("word-input");
const playerWordsUl = document.getElementById("player-words");
const aiWordsUl = document.getElementById("ai-words");
const playerScoreSpan = document.getElementById("player-score");
const aiScoreSpan = document.getElementById("ai-score");
const playerCup = document.getElementById("player-cup");
const aiCup = document.getElementById("ai-cup");
const aiLiveInput = document.getElementById("ai-live-input");
const enterBtn = document.getElementById("enter-btn");
const cancelBtn = document.getElementById("cancel-btn");

function calcPoints(word) {
    const len = word.length;
    if (len === 2) return 5;
    if (len === 3) return 2;
    if (len === 4) return 3;
    if (len === 5) return 5;
    if (len >= 6) return 6;
    return 0;
}

class TrieNode {
    constructor() {
        this.children = {};
        this.isWord = false;
    }
}

let trieRoot = new TrieNode();

function insertTrie(word) {
    let node = trieRoot;
    for (let char of word) {
        if (!node.children[char]) {
            node.children[char] = new TrieNode();
        }
        node = node.children[char];
    }
    node.isWord = true;
}

async function loadDictionaryFile() {
    try {
        const response = await fetch('words.txt');
        const textData = await response.text();
        const wordArray = textData.split(/\r?\n/);
        trieRoot = new TrieNode();
        DICTIONARY_SET.clear();
        
        wordArray.forEach(line => {
            const word = line.trim().toLowerCase();
            if (word.length >= 2) {
                DICTIONARY_SET.add(word);
                insertTrie(word);
            }
        });
        console.log(`Dictionary loaded! ${DICTIONARY_SET.size} words ready.`);
    } catch (error) {
        console.error("Could not load the text file database:", error);
    }
}

function setupBoard() {
    playerGrid.innerHTML = "";
    aiGrid.innerHTML = "";
    activeBoardLetters = [];
    
    const vowels = "AEIOU";
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
    
    for (let i = 0; i < 25; i++) {
        const char = Math.random() < 0.35 
            ? vowels[Math.floor(Math.random() * vowels.length)]
            : consonants[Math.floor(Math.random() * consonants.length)];
        activeBoardLetters.push(char);
    }
    
    activeBoardLetters.forEach(char => {
        const pTile = document.createElement("div");
        pTile.classList.add("letter-tile");
        pTile.innerText = char;
        playerGrid.appendChild(pTile);
        
        const aTile = document.createElement("div");
        aTile.classList.add("letter-tile");
        aTile.innerText = char;
        aiGrid.appendChild(aTile);
    });

    findWordsForAI();
}

function verifyGridPath(word) {
    word = word.toUpperCase();
    for (let i = 0; i < 25; i++) {
        if (activeBoardLetters[i] === word[0]) {
            let visited = new Array(25).fill(false);
            if (dfs(i, word, 0, visited)) return true;
        }
    }
    return false;
}

function dfs(idx, word, wordIdx, visited) {
    if (wordIdx === word.length) return true;
    if (idx < 0 || idx >= 25 || visited[idx] || activeBoardLetters[idx] !== word[wordIdx]) return false;
    
    visited[idx] = true;
    let r = Math.floor(idx / 5), c = idx % 5;
    
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
                if (dfs(nr * 5 + nc, word, wordIdx + 1, visited)) return true;
            }
        }
    }
    visited[idx] = false;
    return false;
}

function findWordsForAI() {
    let foundWords = new Set();
    let visited = new Array(25).fill(false);

    for (let i = 0; i < 25; i++) {
        let char = activeBoardLetters[i].toLowerCase();
        if (trieRoot.children[char]) {
            dfsTrie(i, trieRoot.children[char], char, visited, foundWords);
        }
    }

    aiAvailableBoardWords = Array.from(foundWords);
}

function dfsTrie(idx, node, currentWord, visited, foundWords) {
    visited[idx] = true;

    if (node.isWord) {
        foundWords.add(currentWord.toUpperCase());
    }

    let r = Math.floor(idx / 5), c = idx % 5;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
                let nextIdx = nr * 5 + nc;
                if (!visited[nextIdx]) {
                    let nextChar = activeBoardLetters[nextIdx].toLowerCase();
                    if (node.children[nextChar]) {
                        dfsTrie(nextIdx, node.children[nextChar], currentWord + nextChar, visited, foundWords);
                    }
                }
            }
        }
    }

    visited[idx] = false;
}

function renderPearls(container, count) {
    for(let i = 0; i < count; i++) {
        const pearl = document.createElement("div");
        pearl.classList.add("boba-pearl");
        container.appendChild(pearl);
    }
}

function submitPlayerWord() {
    const input = wordInput.value.trim().toUpperCase();
    wordInput.value = "";

    if (input.length < 2) return;
    if (playerFound.has(input)) return;

    if (aiAvailableBoardWords.includes(input)) {
        playerFound.add(input);
        
        const pts = calcPoints(input); 
        playerpoints += pts;
        playerScoreSpan.innerText = playerpoints;
        renderPearls(playerCup, pts);
        
        const li = document.createElement("li");
        li.innerHTML = `<span>${input}</span><span>+${pts}</span>`;
        playerWordsUl.appendChild(li);
        
        playerWordsUl.scrollTop = playerWordsUl.scrollHeight;
        
        checkMatchState();
    }
}

enterBtn.addEventListener("click", submitPlayerWord);
wordInput.addEventListener("keydown", (e) => { if(e.key === "Enter") submitPlayerWord(); });
cancelBtn.addEventListener("click", () => { wordInput.value = ""; });

function generateAiWordSuggestion() {
    let unspent = aiAvailableBoardWords.filter(w => !Aifound.has(w));
    if (unspent.length === 0) return null;

    const lengths = Ailoss ? [3, 4] : [3, 4, 5];
    const targetLength = lengths[Math.floor(Math.random() * lengths.length)];

    let filtered = unspent.filter(w => w.length === targetLength);
    
    if (filtered.length === 0) {
        for (let l of lengths) {
            filtered = unspent.filter(w => w.length === l);
            if (filtered.length > 0) break;
        }
    }

    return filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : unspent[Math.floor(Math.random() * unspent.length)];
}

function triggerAICycle() {
    if (playerpoints >= SCORE || aipoints >= SCORE) return;
    
    const targetWord = generateAiWordSuggestion();
    
    if (!targetWord) {
        aiTimeoutId = setTimeout(triggerAICycle, 4000);
        return;
    }
    
    let currentString = "";
    let charIndex = 0;
    let typingSpeed = Ailoss ? 450 : 200;
    
    let streamTimer = setInterval(() => {
        currentString += targetWord[charIndex];
        aiLiveInput.innerText = currentString;
        charIndex++;
        
        if (charIndex >= targetWord.length) {
            clearInterval(streamTimer);
            
            aiTimeoutId = setTimeout(() => {
                aiLiveInput.innerText = "...";
                
                Aifound.add(targetWord);
                const pts = calcPoints(targetWord);
                aipoints += pts;
                aiScoreSpan.innerText = aipoints;
                renderPearls(aiCup, pts);
                
                const li = document.createElement("li");
                li.innerHTML = `<span>${targetWord}</span><span>+${pts}</span>`;
                aiWordsUl.appendChild(li);
                
                checkMatchState();
                
                let nextActionDelay = Ailoss ? 8000 : 3000;
                aiTimeoutId = setTimeout(triggerAICycle, nextActionDelay);
                
            }, 600);
        }
    }, typingSpeed);
}

async function init() {
    if (aiTimeoutId) clearTimeout(aiTimeoutId);
    Ailoss = Math.random() < 0.70;
    await loadDictionaryFile();
    setupBoard();
    aiTimeoutId = setTimeout(triggerAICycle, 2000);
}

function checkMatchState() {
    if (playerpoints >= SCORE) {
        clearTimeout(aiTimeoutId);
        alert("Victory! You filled your Boba cup first!");
        location.reload();
    } else if (aipoints >= SCORE) {
        clearTimeout(aiTimeoutId);
        alert("Defeat! The Clumsy Bot filled its cup first.");
        location.reload();
    }
}

window.onload = init;
