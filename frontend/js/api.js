// --- API Calls ---

export async function fetchResults() {
    const response = await fetch('/api/results');
    if (response.status === 401) {
        // Jeśli sesja wygasła, ale jesteśmy na dashboardzie, odśwież (przekieruje na login)
        window.location.reload();
        return [];
    }
    return await response.json();
}

export async function fetchServers() {
    const response = await fetch('/api/servers');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

export async function fetchSettings() {
    const response = await fetch('/api/settings');
    return await response.json();
}

export async function updateSettings(payload) {
    const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Server error');
    return await response.json();
}

export async function triggerTest(serverId) {
    const response = await fetch('/api/trigger-test', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: serverId })
    });
    if (!response.ok) throw new Error('Trigger error');
    return response;
}

export async function deleteEntries(ids) {
    const response = await fetch('/api/results', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids })
    });
    if (!response.ok) throw new Error('Delete error');
    return await response.json();
}

export async function getLatestResult() {
    const response = await fetch('/api/results/latest');
    if (!response.ok) return null;
    return await response.json();
}

// --- NOWE: Sprawdzanie statusu autoryzacji ---
export async function getAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        return await response.json();
    } catch (e) {
        console.error("Auth check failed", e);
        return { enabled: true }; // Fallback to true for safety
    }
}

export async function logoutUser() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
}