const fallbackWords = [
    'about', 'above', 'across', 'action', 'after', 'again', 'against', 'almost', 'along', 'already',
    'always', 'among', 'answer', 'around', 'because', 'before', 'begin', 'being', 'below', 'between',
    'better', 'bring', 'build', 'change', 'children', 'close', 'different', 'during', 'early', 'enough',
    'every', 'example', 'family', 'father', 'follow', 'found', 'friend', 'great', 'group', 'happen',
    'important', 'interest', 'keep', 'large', 'learn', 'leave', 'might', 'music', 'never', 'number',
    'often', 'people', 'place', 'point', 'problem', 'program', 'right', 'something', 'sound', 'start',
    'still', 'system', 'think', 'through', 'together', 'under', 'until', 'water', 'where', 'world'
];
let wordList = [];
const activeNotes = [];

function getRandomWord() {
    return wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
}

document.addEventListener('DOMContentLoaded', () => {
    const keys = document.querySelectorAll('.key');
    const pressedKeys = new Set();
    const keyMap = {};

    keys.forEach(key => {
        keyMap[key.dataset.key] = key;
    });

    const gameArea = document.querySelector('#game-area');
    const judgmentLine = document.querySelector('.judgment-line');
    const feedback = document.querySelector('.judgment-feedback');
    const previousWordDisplay = document.querySelector('#prev-word');
    const currentWordDisplay = document.querySelector('#current-word');
    const nextWordDisplay = document.querySelector('#next-word');
    const startButton = document.querySelector('#start-button');
    const scoreDisplay = document.querySelector('#score');
    const comboDisplay = document.querySelector('#combo');
    const glowTimers = new WeakMap();
    const noteSize = 40;
    const bpm = 100;
    const beatDuration = 60000 / bpm;
    const fallDuration = beatDuration * 3;
    const hitWindow = 150;
    let score = 0;
    let combo = 0;
    let prevWord = '';
    let currentWord = '';
    let nextWord = '';
    let currentLetterIndex = 0;
    let letterResults = [];
    let audioContext = null;
    let isRunning = false;
    let isStarting = false;
    let nextBeatAt = 0;

    function renderCurrentWord() {
        previousWordDisplay.textContent = prevWord;
        nextWordDisplay.textContent = nextWord;
        currentWordDisplay.replaceChildren();
        currentWordDisplay.setAttribute('aria-label', `Target word: ${currentWord}`);

        Array.from(currentWord).forEach((letter, index) => {
            const letterElement = document.createElement('span');
            letterElement.className = 'char';
            if (letterResults[index]) letterElement.classList.add(letterResults[index]);
            letterElement.textContent = letter;
            currentWordDisplay.append(letterElement);
        });
    }

    function initializeWordStream() {
        prevWord = '';
        currentWord = getRandomWord();
        nextWord = getRandomWord();
        currentLetterIndex = 0;
        letterResults = Array.from(currentWord, () => '');
        renderCurrentWord();
    }

    function shiftWordStream() {
        prevWord = currentWord;
        currentWord = nextWord;
        nextWord = getRandomWord();
        currentLetterIndex = 0;
        letterResults = Array.from(currentWord, () => '');
        renderCurrentWord();
    }

    function triggerKeyGlow(key) {
        const keyElement = keyMap[key];
        if (!keyElement) return;

        clearTimeout(glowTimers.get(keyElement));
        keyElement.classList.add('note-glow');
        glowTimers.set(keyElement, setTimeout(() => {
            keyElement.classList.remove('note-glow');
            glowTimers.delete(keyElement);
        }, 220));
    }

    function showJudgment(judgment) {
        feedback.textContent = judgment;
        feedback.className = 'judgment-feedback';
        void feedback.offsetWidth;
        feedback.classList.add('show');
    }

    function recordMiss() {
        combo = 0;
        comboDisplay.textContent = '0 COMBO';
        showJudgment('MISS');
    }

    function resolveNote(note, result) {
        const noteIndex = activeNotes.indexOf(note);
        if (noteIndex === -1) return;

        activeNotes.splice(noteIndex, 1);
        letterResults[note.letterIndex] = result;
        if (result === 'correct') {
            note.element.classList.add('hit');
            setTimeout(() => note.element.remove(), 160);
        } else {
            note.element.remove();
        }

        currentLetterIndex += 1;
        if (currentLetterIndex >= currentWord.length) {
            shiftWordStream();
        } else {
            renderCurrentWord();
        }
    }

    function handleKeyPress(key) {
        const now = performance.now();
        const currentNote = activeNotes[0];
        if (!currentNote || currentNote.key !== key) return;

        const difference = Math.abs(now - currentNote.targetAt);
        if (difference > hitWindow) return;

        resolveNote(currentNote, 'correct');
        triggerKeyGlow(key);

        score += 100;
        combo += 1;
        showJudgment('PERFECT');

        scoreDisplay.textContent = String(score);
        if (combo > 0) comboDisplay.textContent = `${combo} COMBO`;
    }

    function spawnNote(beatAt) {
        if (activeNotes.length || currentLetterIndex >= currentWord.length) return;

        const letterIndex = currentLetterIndex;
        const key = currentWord[letterIndex].toLowerCase();
        const element = document.createElement('div');
        const note = {
            key,
            letterIndex,
            element,
            startAt: beatAt,
            targetAt: beatAt + fallDuration,
            glowing: false
        };

        element.className = 'note';
        element.textContent = key.toUpperCase();
        element.setAttribute('aria-hidden', 'true');
        gameArea.append(element);
        activeNotes.push(note);
        element.style.left = `${(gameArea.clientWidth - noteSize) / 2}px`;
    }

    function gameLoop(now) {
        if (!isRunning) return;

        if (now >= nextBeatAt) {
            playTick();
            pulseBeat();
            spawnNote(now);
            nextBeatAt = now + beatDuration;
        }

        const targetY = judgmentLine.offsetTop + judgmentLine.offsetHeight / 2 - noteSize / 2;

        activeNotes.slice().forEach(note => {
            const duration = note.targetAt - note.startAt;
            const progress = Math.min(1, (now - note.startAt) / duration);
            const top = -noteSize + (targetY + noteSize) * progress;
            note.element.style.left = `${(gameArea.clientWidth - noteSize) / 2}px`;
            note.element.style.top = `${top}px`;

            if (!note.glowing && now >= note.targetAt) {
                note.glowing = true;
                triggerKeyGlow(note.key);
            }

            if (now > note.targetAt + hitWindow) {
                resolveNote(note, 'missed');
                recordMiss();
            }
        });

        requestAnimationFrame(gameLoop);
    }

    function playTick() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        oscillator.connect(envelope);
        envelope.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
    }

    function pulseBeat() {
        judgmentLine.classList.remove('pulse');
        void judgmentLine.offsetWidth;
        judgmentLine.classList.add('pulse');
        setTimeout(() => judgmentLine.classList.remove('pulse'), 180);
    }

    startButton.addEventListener('click', async () => {
        if (isRunning || isStarting || !wordList.length) return;
        isStarting = true;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) throw new Error('Web Audio API is unavailable');
            audioContext = new AudioContextClass();
            await audioContext.resume();
        } catch {
            isStarting = false;
            showJudgment('AUDIO UNAVAILABLE');
            return;
        }

        isStarting = false;
        isRunning = true;
        startButton.hidden = true;
        nextBeatAt = performance.now() + 100;
        requestAnimationFrame(gameLoop);
    });

    window.addEventListener('keydown', event => {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        if (!keyMap[key] || pressedKeys.has(key)) return;

        pressedKeys.add(key);
        keyMap[key].classList.add('active');
        handleKeyPress(key);
    });

    window.addEventListener('keyup', event => {
        const key = event.key.toLowerCase();
        if (!keyMap[key] || !pressedKeys.has(key)) return;

        pressedKeys.delete(key);
        keyMap[key].classList.remove('active');
    });

    document.querySelectorAll('.color-button').forEach(button => {
        button.addEventListener('click', () => {
            document.documentElement.style.setProperty('--glow-color', button.dataset.color);
        });
    });

    fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt')
        .then(response => {
            if (!response.ok) throw new Error('Dictionary request failed');
            return response.text();
        })
        .then(dictionary => {
            const fetchedWords = dictionary.split('\n')
                .map(word => word.trim())
                .filter(word => /^[a-z]{3,}$/i.test(word));
            if (!fetchedWords.length) throw new Error('Dictionary response contained no usable words');
            wordList = fetchedWords;
        })
        .catch(error => {
            console.warn('Dictionary could not be loaded; using fallback words.', error);
            wordList = fallbackWords;
        })
        .finally(() => {
            initializeWordStream();
            startButton.disabled = false;
        });
});
