// Zarządzanie stanem globalnym aplikacji
export const state = {
    allResults: [],
    currentFilter: '24h',
    currentScheduleHours: 1,
    lastTestTimestamp: null,
    
    // NOWE: Przechowuje dokładny czas następnego testu pobrany z backendu
    nextExplicitRunTime: null,

    currentLang: 'pl',
    currentUnit: 'Mbps',
    previousFilter: '24h',
    previousUnit: 'Mbps',
    currentSort: { column: null, direction: 'none' },
    currentFilteredResults: [],
    currentSelectedServerId: 'null',
    
    // Stan wyszukiwarki
    searchTerm: '',
    
    // Deklarowane prędkości
    declaredSpeeds: {
        download: 0,
        upload: 0
    },

    // Pagination
    currentPage: 1,
    itemsPerPage: 10, 
    
    // Status backupu
    backupRawStatus: null, 

    pollingInterval: null,
    toastTimer: null
};