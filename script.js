document.addEventListener('DOMContentLoaded', () => {
    const keys = document.querySelectorAll('.key');
    const pressedKeys = new Set();
    const colorPicker = document.getElementById('glow-color');

    // Create a map of data-key to DOM element for fast lookup
    const keyMap = {};
    keys.forEach(key => {
        const keyValue = key.getAttribute('data-key');
        keyMap[keyValue] = key;
    });

    // Handle physical key press down
    window.addEventListener('keydown', (e) => {
        // Ignore repeated keydown events when holding a key
        if (e.repeat) return;

        const key = e.key.toLowerCase();
        
        // If the key is part of our QWERTY layout and not already tracked
        if (keyMap[key] && !pressedKeys.has(key)) {
            pressedKeys.add(key);
            keyMap[key].classList.add('active');
        }
    });

    // Handle physical key release
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        if (keyMap[key] && pressedKeys.has(key)) {
            pressedKeys.delete(key);
            keyMap[key].classList.remove('active');
        }
    });

    // Handle custom glow color changes
    colorPicker.addEventListener('input', (e) => {
        // Update the global CSS variable dynamically
        document.documentElement.style.setProperty('--glow-color', e.target.value);
    });
});