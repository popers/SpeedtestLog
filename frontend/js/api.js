// --- API Calls  ---

export async function fetchResults() {
    const response = await fetch('/api/results');
    if (response.status === 401) {
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
    // ZMIANA: Dodano 'no-store' aby uniknąć cachowania ustawień przez przeglądarkę
    const response = await fetch('/api/settings', { cache: 'no-store' });
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

export async function triggerTest(serverId, language) {
    const response = await fetch('/api/trigger-test', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: serverId, app_language: language })
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

export async function getAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        return await response.json();
    } catch (e) {
        console.error("Auth check failed", e);
        return { enabled: true };
    }
}

export async function loginUser(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
}

export async function logoutUser() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
}

export async function fetchNotificationSettings() {
    const response = await fetch('/api/notifications/settings');
    if (!response.ok) throw new Error('Failed to fetch notification settings');
    return await response.json();
}

export async function saveNotificationSettings(payload) {
    const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to save settings');
    return await response.json();
}

export async function testNotification(payload) {
    const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Test failed');
    return await response.json();
}

export async function fetchBackupSettings() {
    const response = await fetch('/api/backup/settings');
    if (!response.ok) throw new Error('Failed to fetch backup settings');
    return await response.json();
}

export async function saveBackupSettings(payload) {
    const response = await fetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to save settings');
    return await response.json();
}

export async function revokeGoogleAuth() {
    const response = await fetch('/api/backup/google/revoke', {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Revoke failed');
    return await response.json();
}

export async function getGoogleAuthUrl() {
    const response = await fetch('/api/backup/google/authorize');
    if (!response.ok) throw new Error('Auth failed');
    const data = await response.json();
    return data.auth_url;
}

export async function triggerGoogleBackup() {
    const response = await fetch('/api/backup/google/trigger', {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to trigger backup');
    return await response.json();
}