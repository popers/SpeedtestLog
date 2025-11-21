// Zarządzanie stanem globalnym aplikacji
export const state = {
    allResults: [],
    currentFilter: '24h',
    currentScheduleHours: 1,
    lastTestTimestamp: null,
    currentLang: 'pl',
    currentUnit: 'Mbps',
    previousFilter: '24h',
    previousUnit: 'Mbps',
    currentSort: { column: null, direction: 'none' },
    currentFilteredResults: [],
    currentSelectedServerId: 'null',
    // Pagination
    currentPage: 1,
    itemsPerPage: 10, // Domyślnie 10
    
    pollingInterval: null,
    toastTimer: null
};