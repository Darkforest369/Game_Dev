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
    const targetWordDisplay = document.querySelector('#target-word');
    const startButton = document.querySelector('#start-button');
    const scoreDisplay = document.querySelector('#score');
    const comboDisplay = document.querySelector('#combo');
    const words = ['ANOTHER', 'RHYTHM', 'MUSIC', 'GAME', 'KEYBOARD'];
    const notes = [];
    const glowTimers = new WeakMap();
    const noteSize = 40;
    const bpm = 100;
    const beatDuration = 60000 / bpm;
    const fallDuration = beatDuration * 3;
    const hitWindow = 150;
    let score = 0;
    let combo = 0;
    let wordIndex = 0;
    let nextLetterIndex = 0;
    let wordResults = Array.from(words[wordIndex], () => null);
    let audioContext = null;
    let isRunning = false;
    let nextBeatAt = 0;

    function renderWord() {
        const word = words[wordIndex];
        targetWordDisplay.replaceChildren();
        targetWordDisplay.setAttribute('aria-label', `Target word: ${word}`);

        Array.from(word).forEach((letter, index) => {
            const letterElement = document.createElement('span');
            letterElement.className = 'word-letter';
            if (wordResults[index]) letterElement.classList.add(wordResults[index]);
            letterElement.textContent = letter;
            targetWordDisplay.append(letterElement);
        });
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
        const noteIndex = notes.indexOf(note);
        if (noteIndex === -1) return;

        notes.splice(noteIndex, 1);
        wordResults[note.letterIndex] = result;
        renderWord();
        if (result === 'hit') {
            note.element.classList.add('hit');
            setTimeout(() => note.element.remove(), 160);
        } else {
            note.element.remove();
        }

        const word = words[wordIndex];
        if (nextLetterIndex === word.length && wordResults.every(Boolean)) {
            wordIndex = (wordIndex + 1) % words.length;
            nextLetterIndex = 0;
            wordResults = Array.from(words[wordIndex], () => null);
            renderWord();
        }
    }

    function handleKeyPress(key) {
        const now = performance.now();
        const currentNote = notes.reduce((lowestNote, note) => (
            !lowestNote || note.targetAt < lowestNote.targetAt ? note : lowestNote
        ), null);
        if (!currentNote || currentNote.key !== key) {
            if (currentNote) showJudgment('WRONG KEY');
            return;
        }

        const difference = Math.abs(now - currentNote.targetAt);
        if (difference > hitWindow) return;

        resolveNote(currentNote, 'hit');
        triggerKeyGlow(key);

        if (difference <= 50) {
            score += 100;
            combo += 1;
            showJudgment('PERFECT');
        } else {
            score += 50;
            combo += 1;
            showJudgment('GOOD');
        }

        scoreDisplay.textContent = String(score);
        if (combo > 0) comboDisplay.textContent = `${combo} COMBO`;
    }

    function spawnNote(beatAt) {
        const word = words[wordIndex];
        if (nextLetterIndex >= word.length) return;

        const letterIndex = nextLetterIndex;
        const key = word[letterIndex].toLowerCase();
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
        notes.push(note);
        element.style.left = `${(gameArea.clientWidth - noteSize) / 2}px`;
        nextLetterIndex += 1;
    }

    function animateNotes(now) {
        const targetY = judgmentLine.offsetTop + judgmentLine.offsetHeight / 2 - noteSize / 2;

        notes.slice().forEach(note => {
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

        requestAnimationFrame(animateNotes);
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

    function scheduleBeat() {
        if (!isRunning) return;

        const delay = Math.max(0, nextBeatAt - performance.now());
        setTimeout(() => {
            if (!isRunning) return;

            const beatAt = nextBeatAt;
            playTick();
            pulseBeat();
            spawnNote(beatAt);
            nextBeatAt += beatDuration;
            scheduleBeat();
        }, delay);
    }

    startButton.addEventListener('click', async () => {
        if (isRunning) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) throw new Error('Web Audio API is unavailable');
            audioContext = new AudioContextClass();
            await audioContext.resume();
        } catch {
            showJudgment('AUDIO UNAVAILABLE');
            return;
        }

        isRunning = true;
        startButton.hidden = true;
        nextBeatAt = performance.now() + 100;
        scheduleBeat();
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

    renderWord();
    requestAnimationFrame(animateNotes);
});
