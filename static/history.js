// ═══════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════

let allHistory = [];

async function loadHistory() {
    try {
        const response = await fetch('/history/');
        allHistory = await response.json();
        displayHistory(allHistory);
    } catch (err) {
        console.error('Failed to load history:', err);
        document.getElementById('emptyHistory').style.display = 'flex';
        document.getElementById('historyContainer').style.display = 'none';
    }
}

function displayHistory(history) {
    const container = document.getElementById('historyContainer');
    const emptyState = document.getElementById('emptyHistory');
    const grid = document.getElementById('historyGrid');

    if (!history || history.length === 0) {
        emptyState.style.display = 'flex';
        container.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    container.style.display = 'flex';
    grid.innerHTML = '';

    history.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
      <div class="history-thumbnail">
        <img src="${entry.image_url}" alt="Scan: ${entry.timestamp}" />
      </div>
      <div class="history-info">
        <div class="history-time">
          🕐 ${formatDate(entry.timestamp)}
        </div>
        <div class="history-detections">
          ${entry.detected_class_names.slice(0, 3).map(name =>
            `<div class="detection-badge">${name}</div>`
        ).join('')}
          ${entry.detected_class_names.length > 3 ? `<div class="detection-badge">+${entry.detected_class_names.length - 3}</div>` : ''}
        </div>
      </div>
      <div class="history-actions">
        <button class="history-view-btn" onclick="viewHistoryEntry('${entry.id}')">View</button>
        <button class="history-delete-btn" onclick="deleteHistoryEntry('${entry.id}')">Delete</button>
      </div>
    `;
        grid.appendChild(item);
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    let dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dateOnly === todayStr) dateLabel = 'Today';
    else if (dateOnly === yesterdayStr) dateLabel = 'Yesterday';

    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateLabel} at ${time}`;
}

function filterHistory() {
    const fromDate = document.getElementById('dateFilterFrom').value;
    const toDate = document.getElementById('dateFilterTo').value;

    const filtered = allHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp).toDateString();
        let isIncluded = true;

        if (fromDate) {
            const from = new Date(fromDate).toDateString();
            isIncluded = isIncluded && entryDate >= from;
        }

        if (toDate) {
            const to = new Date(toDate).toDateString();
            isIncluded = isIncluded && entryDate <= to;
        }

        return isIncluded;
    });

    displayHistory(filtered);
}

function resetDateFilters() {
    document.getElementById('dateFilterFrom').value = '';
    document.getElementById('dateFilterTo').value = '';
    displayHistory(allHistory);
}

async function deleteHistoryEntry(entryId) {
    if (!confirm('Are you sure you want to delete this scan from history?')) {
        return;
    }

    try {
        const response = await fetch('/delete-history/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: entryId })
        });

        if (response.ok) {
            allHistory = allHistory.filter(entry => entry.id !== entryId);
            displayHistory(allHistory);
        } else {
            alert('Failed to delete history entry');
        }
    } catch (err) {
        console.error('Failed to delete history entry:', err);
        alert('Error deleting entry');
    }
}

function viewHistoryEntry(entryId) {
    const entry = allHistory.find(e => e.id === entryId);
    if (entry) {
        // Show image in a larger view or redirect to results
        window.open(entry.image_url, '_blank');
    }
}

function clearAllHistory() {
    if (!confirm('Are you sure you want to delete ALL scans from history? This cannot be undone.')) {
        return;
    }

    allHistory.forEach(entry => {
        fetch('/delete-history/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: entry.id })
        });
    });

    allHistory = [];
    displayHistory([]);
}