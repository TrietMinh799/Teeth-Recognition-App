// ── Detection ─────────────────────────────────────
async function runDetection() {
    const imageInput = document.getElementById('image');
    if (!imageInput.files[0]) {
        imageInput.click();
        return;
    }

    const confidence = document.getElementById('confidence').value;
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    document.getElementById('btnLabel').textContent = 'Processing…';

    // Switch to results and show loader
    switchSection('results');
    document.getElementById('emptyResults').style.display = 'none';
    document.getElementById('resultsLayout').style.display = 'none';
    document.getElementById('scanLoading').style.display = 'flex';

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);
    formData.append('confidence', confidence);

    try {
        const [classesRes, detectionRes] = await Promise.all([
            fetch('./data.json'),
            fetch('/object-detection/', { method: 'POST', body: formData })
        ]);

        const classes = await classesRes.json();
        const data = await detectionRes.json();

        // Populate image
        document.getElementById('output-image').src = data.image_url;
        document.getElementById('download-link').href = data.image_url;

        // Populate conditions – each condition is now clickable to search on DuckDuckGo
        const list = document.getElementById('conditionsList');
        list.innerHTML = '';
        const unique = [...new Set(data.classes.map(c => Math.round(c)))];
        unique.forEach((cls, i) => {
            const li = document.createElement('li');
            const conditionName = classes[cls] || `Class ${cls}`;
            li.textContent = conditionName;
            // Make the condition clickable
            li.style.cursor = 'pointer';
            li.id = `id${cls}`;
            li.title = `Click to learn more about "${conditionName}" on DuckDuckGo`;
            li.onclick = (e) => {
                e.stopPropagation();
                window.open(`https://duckduckgo.com/?q=${encodeURIComponent("What is dental " + conditionName.toLowerCase())}?`, '_blank');
            };
            li.style.animationDelay = `${i * 60}ms`;
            list.appendChild(li);
        });

        document.getElementById('detectionCount').textContent = unique.length;
        document.getElementById('usedConf').textContent = parseFloat(confidence).toFixed(2);

        // Show results
        document.getElementById('scanLoading').style.display = 'none';
        document.getElementById('resultsLayout').style.display = 'grid';

    } catch (err) {
        console.error('Detection failed:', err);
        document.getElementById('scanLoading').style.display = 'none';
        document.getElementById('emptyResults').style.display = 'flex';
        document.getElementById('emptyResults').querySelector('p').textContent =
            'Detection failed. Please try again.';
    } finally {
        btn.disabled = false;
        document.getElementById('btnLabel').textContent = 'Run Detection';
    }
}