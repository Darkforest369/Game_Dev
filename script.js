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
    const scoreDisplay = document.querySelector('#score');
    const comboDisplay = document.querySelector('#combo');
    const noteKeys = ['a', 's', 'd', 'f', 'j', 'k', 'l'];
    const notes = [];
    const lanePositions = {};
    const glowTimers = new WeakMap();
    const noteSize = 40;
    const beatDuration = 60000 / 120;
    const fallDuration = 1800;
    let score = 0;
    let combo = 0;

    function updateLanePositions() {
        const areaRect = gameArea.getBoundingClientRect();
        noteKeys.forEach(key => {
            const keyElement = keyMap[key];
            const keyRect = keyElement.getBoundingClientRect();
            lanePositions[key] = keyRect.left + keyRect.width / 2 - areaRect.left - noteSize / 2;
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

    function removeNote(note, wasHit) {
        const noteIndex = notes.indexOf(note);
        if (noteIndex === -1) return;

        notes.splice(noteIndex, 1);
        if (wasHit) {
            note.element.classList.add('hit');
            setTimeout(() => note.element.remove(), 160);
        } else {
            note.element.remove();
        }
    }

    function handleKeyPress(key) {
        const now = performance.now();
        let closestNote = null;
        let closestDifference = Infinity;

        notes.forEach(note => {
            if (note.key !== key) return;
            const difference = Math.abs(now - note.targetAt);
            if (difference < closestDifference) {
                closestDifference = difference;
                closestNote = note;
            }
        });

        if (!closestNote || closestDifference > 150) {
            recordMiss();
            return;
        }

        removeNote(closestNote, true);
        triggerKeyGlow(key);

        if (closestDifference <= 50) {
            score += 100;
            combo += 1;
            showJudgment('PERFECT');
        } else if (closestDifference <= 100) {
            score += 50;
            combo += 1;
            showJudgment('GOOD');
        } else {
            recordMiss();
        }

        scoreDisplay.textContent = String(score);
        if (combo > 0) comboDisplay.textContent = `${combo} COMBO`;
    }

    function spawnNote() {
        const key = noteKeys[Math.floor(Math.random() * noteKeys.length)];
        const element = document.createElement('div');
        const now = performance.now();
        const note = {
            key,
            element,
            startAt: now,
            targetAt: now + fallDuration,
            glowing: false
        };

        element.className = 'note';
        element.textContent = key.toUpperCase();
        element.setAttribute('aria-hidden', 'true');
        gameArea.append(element);
        notes.push(note);
        updateLanePositions();
    }

    function animateNotes(now) {
        const targetY = judgmentLine.offsetTop + judgmentLine.offsetHeight / 2 - noteSize / 2;

        notes.slice().forEach(note => {
            const duration = note.targetAt - note.startAt;
            const progress = Math.min(1, (now - note.startAt) / duration);
            const top = -noteSize + (targetY + noteSize) * progress;
            note.element.style.left = `${lanePositions[note.key]}px`;
            note.element.style.top = `${top}px`;

            if (!note.glowing && now >= note.targetAt) {
                note.glowing = true;
                triggerKeyGlow(note.key);
            }

            if (now > note.targetAt + 150) {
                removeNote(note, false);
                recordMiss();
            }
        });

        requestAnimationFrame(animateNotes);
    }

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

    window.addEventListener('resize', updateLanePositions);
    updateLanePositions();
    requestAnimationFrame(animateNotes);
    setInterval(spawnNote, beatDuration);
});
