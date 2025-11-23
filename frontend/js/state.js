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
    
    // NOWE: Stan wyszukiwarki
    searchTerm: '',
    
    // NOWE: Deklarowane prędkości
    declaredSpeeds: {
        download: 0,
        upload: 0
    },

    // Pagination
    currentPage: 1,
    itemsPerPage: 10, 
    
    // Zmienna przechowująca surowy status backupu (np. 'success', 'error')
    // Pozwala na ponowne przetłumaczenie statusu przy zmianie języka bez odświeżania
    backupRawStatus: null, 

    pollingInterval: null,
    toastTimer: null
};