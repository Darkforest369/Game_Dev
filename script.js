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

    // --- Color Wheel Logic ---
    const canvas = document.getElementById('colorWheel');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const colorPreview = document.getElementById('colorPreview');
    
    const radius = canvas.width / 2;
    const cx = radius;
    const cy = radius;

    // Draw the hue wheel
    for (let angle = 0; angle < 360; angle++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, (angle - 0.5) * Math.PI / 180, (angle + 0.5) * Math.PI / 180);
        ctx.closePath();
        ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
        ctx.fill();
    }

    // Add saturation/value gradient (white center to transparent edge)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    let isDragging = false;

    function pickColor(e) {
        // Get mouse coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

        // Ensure click is inside the circular wheel
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) return;

        // Extract color data
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        
        // Convert to HEX
        const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

        // Update CSS variable and preview
        document.documentElement.style.setProperty('--glow-color', hex);
        colorPreview.style.backgroundColor = hex;
    }

    // Mouse interactions for the color wheel
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        pickColor(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) pickColor(e);
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
});