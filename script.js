document.addEventListener('DOMContentLoaded', () => {
    // --- Keyboard Logic ---
    const keys = document.querySelectorAll('.key');
    const pressedKeys = new Set();
    const keyMap = {};

    keys.forEach(key => {
        const keyValue = key.getAttribute('data-key');
        keyMap[keyValue] = key;
    });

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent repeated triggers while holding
        const key = e.key.toLowerCase();
        if (keyMap[key] && !pressedKeys.has(key)) {
            pressedKeys.add(key);
            keyMap[key].classList.add('active');
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keyMap[key] && pressedKeys.has(key)) {
            pressedKeys.delete(key);
            keyMap[key].classList.remove('active');
        }
    });

    // --- Glow Color Logic ---
    const colorButtons = document.querySelectorAll('.color-button');
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.documentElement.style.setProperty('--glow-color', button.dataset.color);
        });
    });
});