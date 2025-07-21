// Creating new file 
const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
});

// Track socket connection status
let socketConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let resultsLoadedCorrectly = false;
let resultsCheckInterval = null;

// Current selected timeframe (default: 30 seconds)
let currentTimeframe = 30;

// Make currentTimeframe globally accessible
window.currentTimeframe = currentTimeframe;

// Store button values and their display state for each timeframe separately
const timeframeButtonValues = {
    30: { values: Array(9).fill(null), isShowingResult: false },
    45: { values: Array(9).fill(null), isShowingResult: false },
    60: { values: Array(9).fill(null), isShowingResult: false },
    150: { values: Array(9).fill(null), isShowingResult: false }
};

// Betting closing times for each timeframe (in seconds)
const bettingCloseTimes = {
    30: 5,   // 5 seconds before end for 30-second timeframe
    45: 10,  // 10 seconds before end for 45-second timeframe
    60: 15,  // 15 seconds before end for 60-second (1 min) timeframe
    150: 30  // 30 seconds before end for 150-second (2:30 min) timeframe
};

// Track popup state for each timeframe
const popupState = {
    30: { isShowing: false, countdownValue: 0 },
    45: { isShowing: false, countdownValue: 0 },
    60: { isShowing: false, countdownValue: 0 },
    150: { isShowing: false, countdownValue: 0 }
};

document.addEventListener('DOMContentLoaded', function() {
    const timerPera = document.querySelector('.timerPera');
    const topBar = document.getElementById('topBar');
    const navbar = document.querySelector('.navBar');
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const body = document.body;
    
    // Initialize timeframe selection buttons
    initializeTimeframeButtons();
    
    // Reset buttons to numbers initially
    resetButtonsToNumbers();
    
    // Create the betting closed popup element
    createBettingClosedPopup();
    
    // Add refresh history button event listener
    const refreshHistoryBtn = document.getElementById('refresh-history');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', () => {
            // Show refresh animation
            refreshHistoryBtn.classList.add('rotating');
            
            // Fetch user history
            fetchUserHistory().finally(() => {
                // Remove animation after 1 second
                setTimeout(() => {
                    refreshHistoryBtn.classList.remove('rotating');
                }, 1000);
            });
        });
    }
    
    // Start polling for updates
    startPolling();
    
    // Setup socket reconnection
    setupSocketReconnection();
    
    // Start periodic results check
    startPeriodicResultsCheck();
    
    if (window.innerWidth <= 768) { // सिर्फ मोबाइल व्यू के लिए
        window.addEventListener('scroll', function() {
            const topBarRect = topBar.getBoundingClientRect();
            const navbarHeight = navbar.offsetHeight;
            
            // जब टाइमर नैवबार के पास पहुंचे
            if (topBarRect.top <= navbarHeight) {
                timerPera.classList.add('sticky');
            } else {
                timerPera.classList.remove('sticky');
            }
        });
        
        // मेनू टॉगल क्लिक पर क्लास जोड़ें
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                // body पर menu-open क्लास टॉगल करें
                body.classList.add('menu-open');
            });
            
            // मेनू बंद होने पर क्लास हटाएं
            const closeMenu = document.getElementById('close-menu');
            if (closeMenu) {
                closeMenu.addEventListener('click', function() {
                    body.classList.remove('menu-open');
                });
            }
        }
    }
    
    // Ensure results are loaded
    setTimeout(() => {
        ensureResultsLoaded();
    }, 1000);
});

// Setup socket reconnection logic
function setupSocketReconnection() {
    socket.io.on("reconnect_attempt", (attempt) => {
        reconnectAttempts = attempt;
        console.log(`🔄 Reconnect attempt ${attempt}/${maxReconnectAttempts}`);
        
        if (attempt > 1) {
            showReconnectingToast(`⚠️ सर्वर से पुनः कनेक्ट करने का प्रयास ${attempt}/${maxReconnectAttempts}`);
        }
    });
    
    socket.io.on("reconnect", () => {
        console.log("✅ Reconnected to server");
        reconnectAttempts = 0;
        showReconnectingToast("✅ सर्वर से पुनः कनेक्ट हो गया है");
        
        // Refresh data on reconnect
        const userId = getUserId();
        if (userId) {
            socket.emit("joinRoom", { userId });
        }
        
        // Select current timeframe
        socket.emit("selectTimeframe", { timeframe: currentTimeframe });
        
        // Refresh user data
        fetchUserBets();
        fetchUserHistory();
        
        // Ensure results are refreshed on reconnection
        fetchAndDisplayResults(1, currentTimeframe);
        
        // Check results after a short delay to ensure they load properly
        setTimeout(() => {
            checkAndReloadResultsIfNeeded();
        }, 3000);
    });
    
    socket.io.on("reconnect_failed", () => {
        console.log("❌ Reconnection failed");
        showReconnectingToast("❌ सर्वर से कनेक्शन स्थापित नहीं हो सका। कृपया पेज रिफ्रेश करें।");
    });
    
    // Add connection event to ensure we have results
    socket.on("connect", () => {
        console.log("✅ Connected to server");
        console.log("🔗 Socket ID:", socket.id);
        console.log("🌐 Server URL:", window.location.origin);
        socketConnected = true;
        
        // Join room with user ID
        const userId = getUserId();
        if (userId) {
            socket.emit("joinRoom", { userId });
            console.log("👤 Joined room for user:", userId);
        }
        
        // Select current timeframe
        socket.emit("selectTimeframe", { timeframe: currentTimeframe });
        console.log("⏰ Selected timeframe:", currentTimeframe);
        
        // Request current timeframe status
        socket.emit("requestTimeframeStatus");
        console.log("📊 Requested timeframe status");
        
        // Ensure results are loaded after connection
        setTimeout(() => {
            ensureResultsLoaded();
        }, 500);
        
        // Check results after a short delay to ensure they load properly
        setTimeout(() => {
            checkAndReloadResultsIfNeeded();
        }, 2000);
    });
    
    // Add disconnect event logging
    socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
        socketConnected = false;
    });
    
    // Add error event logging
    socket.on("connect_error", (error) => {
        console.error("🔴 Socket connection error:", error);
        showReconnectingToast("🔴 कनेक्शन एरर: " + error.message);
    });
}

// Helper function to get user ID
function getUserId() {
    // Try to get user ID from body attribute
    const bodyUserId = document.body.getAttribute("data-user-id");
    if (bodyUserId) {
        console.log("👤 User ID from body attribute:", bodyUserId);
        return bodyUserId;
    }
    
    // Try to get from localStorage
    const localUserId = localStorage.getItem("userId");
    if (localUserId) {
        console.log("👤 User ID from localStorage:", localUserId);
        return localUserId;
    }
    
    // Try to get from sessionStorage
    const sessionUserId = sessionStorage.getItem("userId");
    if (sessionUserId) {
        console.log("👤 User ID from sessionStorage:", sessionUserId);
        return sessionUserId;
    }
    
    console.log("❌ No user ID found, user is not logged in");
    return null;
}

// Show reconnecting toast
function showReconnectingToast(message) {
    const existingToast = document.querySelector('.reconnect-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'reconnect-toast';
    toast.innerHTML = `
        <div class="toast-icon">🔄</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show-toast');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show-toast');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 5000);
}

// Create the betting closed popup elements for each timeframe
function createBettingClosedPopup() {
    // Create popup elements for each timeframe if they don't exist
    const timeframes = [30, 45, 60, 150];
    
    timeframes.forEach(timeframe => {
        if (!document.getElementById(`betting-closed-popup-${timeframe}`)) {
            const popup = document.createElement('div');
            popup.id = `betting-closed-popup-${timeframe}`;
            popup.className = 'betting-closed-popup';
            popup.setAttribute('data-timeframe', timeframe);
            
            // Set timeframe-specific title
            let timeframeTitle = '';
            switch(timeframe) {
                case 30: timeframeTitle = '30 सेकंड'; break;
                case 45: timeframeTitle = '45 सेकंड'; break;
                case 60: timeframeTitle = '1 मिनट'; break;
                case 150: timeframeTitle = '2:30 मिनट'; break;
            }
            
            popup.innerHTML = `
                <div class="popup-content">
                    <div class="popup-header">
                        <h4>${timeframeTitle} - बेटिंग बंद</h4>
                    </div>
                    <div class="popup-body">
                        <p>इस राउंड में बेटिंग बंद हो गई है</p>
                        <div class="countdown-timer">
                            <span id="popup-countdown-${timeframe}">0</span> सेकंड
                        </div>
                        <p class="popup-info">नया राउंड शुरू होने तक प्रतीक्षा करें</p>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);
        }
    });
}

// Show betting closed popup with countdown
function showBettingClosedPopup(remainingSeconds, timeframe) {
    const tf = parseInt(timeframe);
    const popup = document.getElementById(`betting-closed-popup-${tf}`);
    const countdownElement = document.getElementById(`popup-countdown-${tf}`);
    
    if (popup && countdownElement) {
        // Set the countdown value
        countdownElement.textContent = remainingSeconds;
        popupState[tf].countdownValue = remainingSeconds;
        
        // Update popup state
        popupState[tf].isShowing = true;
        
        // Only show the popup if this is the current selected timeframe
        if (parseInt(currentTimeframe) === tf) {
            popup.classList.add('show');
        }
        
        // Clear any existing interval
        if (popupState[tf].countdownInterval) {
            clearInterval(popupState[tf].countdownInterval);
        }
        
        // Don't start a new interval if we're getting updates from the server
        // The server will send timerUpdate events that will update our countdown
        // This prevents multiple countdowns running simultaneously
        
        // But we'll still create a safety interval in case server updates stop
        popupState[tf].countdownInterval = setInterval(() => {
            if (popupState[tf].countdownValue > 1) {
                popupState[tf].countdownValue--;
                
                // Update the visible countdown if this popup is visible
                if (parseInt(currentTimeframe) === tf) {
                    countdownElement.textContent = popupState[tf].countdownValue;
                }
            } else {
                // When countdown reaches 0, hide the popup
                hideBettingClosedPopup(tf);
                clearInterval(popupState[tf].countdownInterval);
                popupState[tf].countdownInterval = null;
            }
        }, 1000);
    }
}

// Hide betting closed popup for a specific timeframe
function hideBettingClosedPopup(timeframe) {
    const tf = timeframe ? parseInt(timeframe) : parseInt(currentTimeframe);
    const popup = document.getElementById(`betting-closed-popup-${tf}`);
    
    if (popup) {
        popup.classList.remove('show');
        popupState[tf].isShowing = false;
        popupState[tf].countdownValue = 0;
        
        if (popupState[tf].countdownInterval) {
            clearInterval(popupState[tf].countdownInterval);
            popupState[tf].countdownInterval = null;
        }
    }
}

// Update popup visibility based on timeframe selection
function updatePopupVisibility() {
    // Hide all popups first
    document.querySelectorAll('.betting-closed-popup').forEach(popup => {
        popup.classList.remove('show');
    });
    
    // Show popup for current timeframe if it should be showing
    const tf = parseInt(currentTimeframe);
    if (popupState[tf] && popupState[tf].isShowing) {
        const popup = document.getElementById(`betting-closed-popup-${tf}`);
        const countdownElement = document.getElementById(`popup-countdown-${tf}`);
        
        if (popup && countdownElement) {
            popup.classList.add('show');
            countdownElement.textContent = popupState[tf].countdownValue;
        }
    }
}

// Socket connection events
socket.on("connect", () => {
    console.log("✅ Connected to server");
    console.log("🔗 Socket ID:", socket.id);
    console.log("🌐 Server URL:", window.location.origin);
    socketConnected = true;
    
    // Join room with user ID
    const userId = getUserId();
    if (userId) {
        socket.emit("joinRoom", { userId });
        console.log("👤 Joined room for user:", userId);
    }
    
    // Select current timeframe
    socket.emit("selectTimeframe", { timeframe: currentTimeframe });
    console.log("⏰ Selected timeframe:", currentTimeframe);
    
    // Request current timeframe status
    socket.emit("requestTimeframeStatus");
    console.log("📊 Requested timeframe status");
    
    // Ensure results are loaded after connection
    setTimeout(() => {
        ensureResultsLoaded();
    }, 500);
    
    // Check results after a short delay to ensure they load properly
    setTimeout(() => {
        checkAndReloadResultsIfNeeded();
    }, 2000);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected from server");
    socketConnected = false;
    
    // Show disconnection toast
    showReconnectingToast("⚠️ सर्वर से कनेक्शन टूट गया है। पुनः कनेक्ट करने का प्रयास किया जा रहा है...");
});

// Balance update handler
socket.on("balanceUpdate", (data) => {
    // Use the updateUserBalance function for consistent balance updates
    if (data && data.updatedBalance !== undefined) {
        updateUserBalance(data.updatedBalance);
    } else {
        console.warn("⚠️ Received balanceUpdate event with invalid data:", data);
    }
});

// Pagination variables
let currentPage = 1;
let totalPages = 1;
const resultsPerPage = 10;

// Update showLoading function to include a timeout fallback
function showLoading() {
    // Disabled loading screen to prevent "Loading results..." text
    console.log("showLoading called but disabled to prevent loading screen");
    return;
    
    // Original code (disabled):
    /*
    const resultContainer = document.querySelector('.result-main-container');
    if (resultContainer) {
        resultContainer.innerHTML = '<div id="loader"></div>';
        
        // Mark results as not loaded correctly
        resultsLoadedCorrectly = false;
        
        // Set a fallback timeout - if results don't load within 5 seconds,
        // try to fetch them directly via HTTP instead of waiting for socket
        clearTimeout(window.loadingFallbackTimeout);
        window.loadingFallbackTimeout = setTimeout(() => {
            if (resultContainer.innerHTML.includes('loader')) {
                console.log("⚠️ Results loading timeout - using fallback HTTP fetch");
                fallbackFetchResults(currentPage, currentTimeframe);
            }
        }, 5000);
    }
    */
}

// Add a fallback HTTP fetch function for results
async function fallbackFetchResults(page, timeframe) {
    try {
        console.log("Using fallback HTTP fetch for results");
        const url = `/user/getResultsHTTP?page=${page}&limit=${resultsPerPage}&timeframe=${timeframe}`;
        console.log(`Fetching from URL: ${url}`);
        
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("Fallback fetch response:", data);
            
            if (data.success) {
                // Update UI with results from HTTP request
                currentPage = data.currentPage;
                totalPages = data.totalPages;
                displayResults(data.results, data.totalPages, data.currentPage, timeframe);
                console.log("✅ Fallback results fetch successful");
            } else {
                console.error("❌ Fallback results fetch failed:", data.message);
                const resultContainer = document.querySelector('.result-main-container');
                if (resultContainer) {
                    resultContainer.innerHTML = `
                        <div class="results-heading">
                            <h4>All Results (${getTimeframeLabel(timeframe)})</h4>
                            <p>x</p>
                        </div>
                        <div style="text-align: center; padding: 20px;">
                            Failed to load results. <a href="#" onclick="fetchResultsWithoutLoading(1, ${timeframe}); return false;">Try again</a>
                        </div>
                    `;
                }
            }
        } else {
            console.error(`❌ Fallback results fetch HTTP error: ${response.status} - ${response.statusText}`);
            const resultContainer = document.querySelector('.result-main-container');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="results-heading">
                        <h4>All Results (${getTimeframeLabel(timeframe)})</h4>
                        <p>x</p>
                    </div>
                                            <div style="text-align: center; padding: 20px;">
                            Error loading results (${response.status}). <a href="#" onclick="fetchResultsWithoutLoading(1, ${timeframe}); return false;">Try again</a>
                        </div>
                `;
            }
        }
    } catch (error) {
        console.error("❌ Fallback results fetch error:", error);
        const resultContainer = document.querySelector('.result-main-container');
        if (resultContainer) {
            resultContainer.innerHTML = `
                <div class="results-heading">
                    <h4>All Results (${getTimeframeLabel(timeframe)})</h4>
                    <p>x</p>
                </div>
                                        <div style="text-align: center; padding: 20px;">
                            Network error loading results. <a href="#" onclick="fetchResultsWithoutLoading(1, ${timeframe}); return false;">Try again</a>
                        </div>
            `;
        }
    }
}

// Fetch results without showing loading screen
async function fetchResultsWithoutLoading(page, timeframe = currentTimeframe) {
    try {
        socket.emit("fetchResults", { 
            page, 
            limit: resultsPerPage,
            timeframe
        });
    } catch (error) {
        console.error("Error requesting results:", error);
    }
}

// Update fetchAndDisplayResults to NOT show loading
async function fetchAndDisplayResults(page, timeframe = currentTimeframe) {
    try {
        // Don't show loading screen anymore
        console.log("fetchAndDisplayResults called, using fetchResultsWithoutLoading instead");
        fetchResultsWithoutLoading(page, timeframe);
    } catch (error) {
        console.error("Error requesting results:", error);
    }
}

// Display results function
function displayResults(results, totalPagesCount, currentPageNum, timeframe = currentTimeframe) {
    const resultContainer = document.querySelector(".result-main-container");
    if (!resultContainer) return;

    let resultsHTML = `
        <div class="results-heading">
            <h4>All Results (${getTimeframeLabel(timeframe)})</h4>
            <p>x</p>
        </div>
    `;

    results.forEach(result => {
        resultsHTML += generateResultHTML(result);
    });

    // Add pagination controls
    resultsHTML += generatePaginationHTML(currentPageNum, totalPagesCount);

    resultContainer.innerHTML = resultsHTML;
    attachPaginationEvents();
    
    // Mark results as loaded correctly
    resultsLoadedCorrectly = true;
    console.log("Results loaded successfully for timeframe:", timeframe);
    
    // Removed automatic scroll to results
}

// Get timeframe label
function getTimeframeLabel(timeframe) {
    switch(parseInt(timeframe)) {
        case 30: return "30 सेकंड";
        case 45: return "45 सेकंड";
        case 60: return "1 मिनट";
        case 150: return "2:30 मिनट";
        default: return "30 सेकंड";
    }
}

// Generate result HTML
function generateResultHTML(result) {
    return `
        <div class="result-container">
            <div class="result-data-id">
                <p class="result-id">Game no. ${result.resultNumber}</p>
                <p class="result-id">GameID: ${result.gameId}</p>
            </div>
            <div class="result-data-values">
                <table class="result-trade-table">
                    <tr class="result-table-head">
                        ${[1,2,3,4,5,6,7,8,9].map(num => 
                            `<th class="result-table-heading">${num}</th>`
                        ).join('')}
                    </tr>
                    <tr class="result-table-data">
                        ${result.values.map(value => 
                            `<td class="result-values" data-value="${value}">${value}</td>`
                        ).join('')}
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// Generate pagination HTML
function generatePaginationHTML(currentPageNum, totalPagesCount) {
    return `
        <div class="pagination-controls">
        <div id="pegiBtn">
        <button id="firstPage" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>First</button>
        <button id="prevPage" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>Previous</button>
        <button id="nextPage" class="pagination-btn" ${currentPageNum === totalPagesCount ? 'disabled' : ''}>Next</button>
        <button id="lastPage" class="pagination-btn" ${currentPageNum === totalPagesCount ? 'disabled' : ''}>Last</button>
        </div>
            <div class="page-numbers">
                ${generatePageNumbers(currentPageNum, totalPagesCount)}
            </div>
        </div>
    `;
}

// Generate page numbers
function generatePageNumbers(currentPageNum, totalPagesCount) {
    let numbers = '';
    const range = 2;

    for (let i = Math.max(1, currentPageNum - range); i <= Math.min(totalPagesCount, currentPageNum + range); i++) {
        numbers += `
            <button class="page-number ${i === currentPageNum ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    if (currentPageNum - range > 1) {
        numbers = `
            <button class="page-number" data-page="1">1</button>
            <span class="page-dots">...</span>
        ` + numbers;
    }
    if (currentPageNum + range < totalPagesCount) {
        numbers += `
            <span class="page-dots">...</span>
            <button class="page-number" data-page="${totalPagesCount}">${totalPagesCount}</button>
        `;
    }

    return numbers;
}

// Attach pagination events
function attachPaginationEvents(timeframe = currentTimeframe) {
    document.getElementById('firstPage')?.addEventListener('click', () => {
        if (currentPage > 1) changePage(1, timeframe);
    });
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) changePage(currentPage - 1, timeframe);
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) changePage(currentPage + 1, timeframe);
    });
    document.getElementById('lastPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) changePage(totalPages, timeframe);
    });
    document.querySelectorAll('.page-number').forEach(button => {
        button.addEventListener('click', () => {
            const pageNum = parseInt(button.dataset.page);
            changePage(pageNum, timeframe);
        });
    });
}

// Change page function
function changePage(page, timeframe = currentTimeframe) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchResultsWithoutLoading(page, timeframe);
}

// Socket events for results
socket.on("resultsData", (data) => {
    currentPage = data.currentPage;
    totalPages = data.totalPages;
    const timeframe = data.timeframe || currentTimeframe;
    displayResults(data.results, data.totalPages, data.currentPage, timeframe);
});

socket.on("newResult", (data) => {
    const timeframe = data.timeframe || currentTimeframe;
    
    // Only update if this is for the current selected timeframe
    if (parseInt(timeframe) === parseInt(currentTimeframe)) {
        // Update total pages count
        totalPages = data.totalPages;
        
        // If user is on page 1, show latest results directly
        if (currentPage === 1) {
            currentPage = data.currentPage;
            displayResults(data.results, data.totalPages, data.currentPage, timeframe);
        } else {
            // If user is on other pages, refresh current page data without showing loading
            fetchResultsWithoutLoading(currentPage, timeframe);
        }
        
        // Show a brief notification that results were updated
        showResultsUpdatedNotification(timeframe);
    }
});

// Show notification that results were updated
function showResultsUpdatedNotification(timeframe = currentTimeframe) {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.className = 'results-updated-notification';
    notification.innerHTML = `
        <span>✅ Results updated for ${getTimeframeLabel(timeframe)}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(51, 204, 102, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Add CSS animations for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize timeframe selection buttons - modified to properly handle button values when switching timeframes
function initializeTimeframeButtons() {
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    const timeframeSelection = document.getElementById('timeframeSelection');
    
    // Set initial timeframe label
    updateTimeframeLabel(30);
    
    // Set default timeframe button as active
    const defaultTimeframeButton = document.querySelector('.timeframe-btn[data-timeframe="30"]');
    if (defaultTimeframeButton) {
        defaultTimeframeButton.classList.add('active');
    }
    
    timeframeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get selected timeframe
            const selectedTimeframe = parseInt(this.getAttribute('data-timeframe'));
            
            // Update timeframe label
            updateTimeframeLabel(selectedTimeframe);
            
            // Add transition effect to game area
            const gameBox = document.querySelector('.game-box');
            const resultContainer = document.querySelector('.result-main-container');
            
            if (gameBox) {
                gameBox.classList.add('timeframe-transition');
                setTimeout(() => {
                    gameBox.classList.remove('timeframe-transition');
                }, 500);
            }
            
            if (resultContainer) {
                resultContainer.classList.add('timeframe-transition');
                setTimeout(() => {
                    resultContainer.classList.remove('timeframe-transition');
                }, 500);
            }
            
            // Update current timeframe
            currentTimeframe = selectedTimeframe;
            
            // Update global window.currentTimeframe
            window.currentTimeframe = currentTimeframe;
            
            // Request current timer data to check if betting is closed
            socket.emit("requestTimerData", { timeframe: selectedTimeframe });
            
            // Update popup visibility based on the new timeframe
            updatePopupVisibility();
            
            // Check if the selected timeframe is currently showing a result
            const timeframeData = timeframeButtonValues[selectedTimeframe];
            
            if (timeframeData && timeframeData.isShowingResult) {
                // If this timeframe is showing a result, display the result values
                const buttons = document.querySelectorAll('.box');
                const storedValues = timeframeData.values;
                
                buttons.forEach((button, index) => {
                    if (storedValues[index] !== null) {
                        button.textContent = storedValues[index];
                        button.setAttribute('data-multiplier', storedValues[index]);
        } else {
                        button.textContent = index + 1;
                        button.removeAttribute('data-multiplier');
                    }
                });
            } else {
                // Otherwise, reset buttons to numbers 1-9
                resetButtonsToNumbers();
            }
            
            // Emit event to server
            socket.emit('selectTimeframe', { timeframe: selectedTimeframe });
            
            // Request current status for this timeframe
            socket.emit('requestTimeframeStatus');
            
            // Fetch results for the selected timeframe
            fetchAndDisplayResults(1, selectedTimeframe);
            
            // No need to clear trade panel since we show bets from all timeframes now
            // Instead, just refresh all bets
            fetchUserBets();
            
            // Clear trade panel
            clearTradePanel();
            
            // Clear result table
            clearResultTable();
            
            // Clear active bets table
            clearActiveBetsTable();
            
            console.log(`Timeframe changed to: ${selectedTimeframe} seconds`);
        });
    });
    
    // Default to 30 seconds timeframe
    socket.emit('selectTimeframe', { timeframe: 30 });
}

// Update timeframe label function
function updateTimeframeLabel(timeframe) {
    const timeframeSelection = document.getElementById('timeframeSelection');
    if (!timeframeSelection) return;
    
    let label = '';
    switch(parseInt(timeframe)) {
        case 30:
            label = 'वर्तमान: 30 सेकंड';
            break;
        case 45:
            label = 'वर्तमान: 45 सेकंड';
            break;
        case 60:
            label = 'वर्तमान: 1 मिनट';
            break;
        case 150:
            label = 'वर्तमान: 2:30 मिनट';
            break;
        default:
            label = 'वर्तमान: 30 सेकंड';
    }
    
    timeframeSelection.setAttribute('data-selected-timeframe', label);
}

// Timer update handler
socket.on("timerUpdate", (data) => {
    const timerMinEl = document.getElementById("timerMin");
    const timerSecEl = document.getElementById("timerSec");
    
    if (!timerMinEl || !timerSecEl) {
        console.error("❌ Timer elements not found");
        return;
    }
    
    let time;
    let timeframe;
    if (typeof data === 'object' && data.timeframe !== undefined) {
        // Only update timer if this is for the current selected timeframe
        if (parseInt(data.timeframe) !== parseInt(currentTimeframe)) {
            return;
        }
        time = data.time;
        timeframe = data.timeframe;
    } else {
        // Backward compatibility for old format
        time = data;
        timeframe = currentTimeframe;
    }
    
    const tf = parseInt(timeframe);

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    
    // Update timer display
    timerMinEl.textContent = minutes < 10 ? "0" + minutes : minutes;
    timerSecEl.textContent = seconds < 10 ? "0" + seconds : seconds;

    // Get betting closes at time based on timeframe
    const bettingClosesAt = getBettingClosesAt(timeframe);
    
    // Check if betting is closed for this timeframe
    if (time <= bettingClosesAt && time > 0) {
        if (!popupState[tf].isShowing) {
            // Show popup with remaining time until end of round
            showBettingClosedPopup(time, timeframe);
        } else {
            // Update the countdown in the existing popup
            popupState[tf].countdownValue = time;
            const countdownElement = document.getElementById(`popup-countdown-${tf}`);
            if (countdownElement && parseInt(currentTimeframe) === tf) {
                countdownElement.textContent = time;
            }
        }
    }
    
    // Enable/disable buttons
    const buttons = document.querySelectorAll(".box, #low, #high, #submit");
    buttons.forEach(btn => {
        btn.disabled = time <= bettingClosesAt;
    });

    // Clear selection if time is less than betting close time
    if (time <= bettingClosesAt) {
        // Clear selectedNumbers array if defined
        if (typeof selectedNumbers !== 'undefined') {
            selectedNumbers = [];
        }

        // Clear textBox1 if defined
        if (typeof textBox1 !== 'undefined') {
            textBox1.innerText = "";
        }

        // Remove selected class from buttons
        const numberButtons = document.querySelectorAll(".box.selected");
        numberButtons.forEach(button => {
            button.classList.remove("selected");
        });

        // Call updateControls function if it exists
        if (typeof updateControls === 'function') {
            updateControls();
        }
    }
});

// Get betting closes at time based on timeframe
function getBettingClosesAt(timeframe) {
    switch(parseInt(timeframe)) {
        case 30: return 5;  // 5 seconds remaining
        case 45: return 10; // 10 seconds remaining
        case 60: return 15; // 15 seconds remaining
        case 150: return 30; // 30 seconds remaining
        default: return 5;
    }
}

// Button flip handler
socket.on("flipButtons", ({ gameId, resultNumber, buttonValues, timeframe }) => {
    console.log(`Flipping buttons with new values for timeframe ${timeframe}:`, buttonValues);

    // Store the button values for this specific timeframe
    if (buttonValues && buttonValues.length === 9) {
        timeframeButtonValues[timeframe].values = [...buttonValues];
        timeframeButtonValues[timeframe].isShowingResult = true;
        
        // Set a timeout to mark this timeframe as not showing result after 5 seconds
        setTimeout(() => {
            timeframeButtonValues[timeframe].isShowingResult = false;
            
            // Only reset UI if we're still on this timeframe
            if (parseInt(timeframe) === parseInt(currentTimeframe)) {
                resetButtonsToNumbers();
            }
        }, 5000);
    }

    // Only update UI if this is for the current selected timeframe
    if (parseInt(timeframe) === parseInt(currentTimeframe)) {
    const buttons = document.querySelectorAll('.box');

    buttons.forEach((button, index) => {
            // Only update if value is available
        if (buttonValues[index]) {
                // Step 1: Start flip animation
            button.classList.add('flipping');

                // Step 2: Update value during animation
            setTimeout(() => {
                const multiplier = buttonValues[index];
                    // Update text and attribute
                button.textContent = multiplier;
                button.setAttribute('data-multiplier', multiplier);
            }, 300);

                // Step 3: Remove animation class
            setTimeout(() => {
                button.classList.remove('flipping');
            }, 600);
        }
    });
        
        // First check if user is logged in by checking for user ID
        const userId = getUserId();
        if (!userId) {
            console.log("User not logged in, not showing win/loss popup");
            return;
        }
        
        // Check if the user has placed any bets for this game before showing the loading popup
        // We'll use the updated checkUserHasBetsForGame function that checks for the current timeframe
        const hasBetsForCurrentGame = checkUserHasBetsForGame(gameId);
        
        if (hasBetsForCurrentGame) {
            // Show loading animation immediately while waiting for result
            console.log(`User has bets for game ${gameId} in timeframe ${timeframe}, showing loading popup`);
            showWinLossLoadingPopup();
            
            // Create or update the popup with a flag to disable auto-close
            let popup = document.getElementById('win-loss-popup');
            if (popup) {
                popup.setAttribute('data-disable-auto-close', 'true');
                popup.setAttribute('data-game-id', gameId);
                popup.setAttribute('data-timeframe', timeframe); // Store timeframe in popup
            }
            
            // Request bet results for this game immediately
            socket.emit("requestBetResults", { gameId, timeframe, userId });
            console.log(`Requested bet results for game ${gameId}, timeframe ${timeframe}`);
            
            // Set a timeout to retry if result doesn't come back within 1 second (reduced from 2 seconds)
            setTimeout(() => {
                const popup = document.getElementById('win-loss-popup');
                if (popup && !popup.classList.contains('result-received')) {
                    console.log("Result not received after 1 second, requesting again");
                    socket.emit("requestBetResults", { gameId, timeframe, userId });
                }
            }, 1000);
        } else {
            console.log("User has no bets for this game, not showing loading popup");
        }
    }
});

// Helper function to check if the user has placed bets for the current game
function checkUserHasBetsForGame(gameId) {
    // Check the active bets table for any rows with this game ID
    const tbody = document.querySelector("#active-bets-tbody");
    if (!tbody) return false;
    
    const rows = tbody.querySelectorAll("tr");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");
        
        // Skip if this is a "no data" row
        if (cells.length <= 1) continue;
        
        // Check if the second cell (index 1) contains the game ID
        if (cells[1] && cells[1].textContent.includes(gameId)) {
            // Found a matching game ID
            console.log(`Found bet for game ${gameId} in the active bets table`);
            return true;
        }
    }
    
    // If no matching row was found in the active bets table,
    // check if there are any temporary bet rows with this game ID
    const tempRows = document.querySelectorAll(".temporary-bet");
    for (let i = 0; i < tempRows.length; i++) {
        const tempRow = tempRows[i];
        const tempGameId = tempRow.getAttribute("data-game-id");
        const tempTimeframe = tempRow.getAttribute("data-timeframe");
        
        // Check if this temporary row is for the current game and timeframe
        if ((tempGameId === gameId || tempGameId === "pending") && 
            (tempTimeframe === currentTimeframe.toString() || !tempTimeframe)) {
            console.log(`Found temporary bet for game ${gameId} in timeframe ${tempTimeframe}`);
            return true;
        }
    }
    
    console.log(`No bets found for game ${gameId} in the current timeframe ${currentTimeframe}`);
    return false;
}

// Create a new function to show win/loss loading popup
function showWinLossLoadingPopup() {
    // First check if user is logged in
    const userId = getUserId();
    if (!userId) {
        console.log("User not logged in, not showing win/loss loading popup");
        return;
    }
    
    // Check if popup already exists
    let popup = document.getElementById('win-loss-popup');
    if (!popup) {
        // Create popup if it doesn't exist
        popup = document.createElement('div');
        popup.id = 'win-loss-popup';
        popup.className = 'win-loss-popup';
        document.body.appendChild(popup);
    }
    
    // Remove result-received class if it exists
    popup.classList.remove('result-received');
    
    // Set disable-auto-close attribute to keep popup visible until new round
    popup.setAttribute('data-disable-auto-close', 'true');
    
    // Show loading state
    popup.innerHTML = `
        <div class="win-loss-popup-content">
            <div class="win-loss-popup-header">
                <h3>परिणाम की गणना हो रही है...</h3>
            </div>
            <div class="win-loss-popup-body">
                <div class="win-loss-loading">
                    <div class="win-loss-spinner"></div>
                </div>
                <p>कृपया प्रतीक्षा करें...</p>
            </div>
        </div>
    `;
    
    // Force layout recalculation to ensure smooth animation
    popup.offsetHeight;
    
    // Show popup with animation immediately
    popup.classList.add('show');
}

// Create a new function to show win/loss result popup
function showWinLossResultPopup(result) {
    console.log("Showing win/loss result popup with data:", result);
    
    // First check if user is logged in
    const userId = getUserId();
    if (!userId) {
        console.log("User not logged in, not showing win/loss result popup");
        return;
    }
    
    // Check if popup already exists and remove it
    let popup = document.getElementById('win-loss-popup');
    if (popup) {
        // Clear any existing timeout
        if (popup._autoCloseTimeout) {
            clearTimeout(popup._autoCloseTimeout);
            popup._autoCloseTimeout = null;
        }
        // Remove existing popup
        popup.remove();
    }
    
    // Create new popup
    popup = document.createElement('div');
    popup.id = 'win-loss-popup';
    popup.className = 'win-loss-popup';
    document.body.appendChild(popup);
    
    // Mark popup as having received result
    popup.classList.add('result-received');
    
    // Store the current game ID to track when a new round starts
    if (result && result.gameId) {
        popup.setAttribute('data-game-id', result.gameId);
    }
    
    // Store the timeframe in the popup
    if (result && result.timeframe) {
        popup.setAttribute('data-timeframe', result.timeframe);
    } else {
        // Default to current timeframe if not provided
        popup.setAttribute('data-timeframe', currentTimeframe);
    }
    
    // Ensure we have valid data
    if (!result || typeof result !== 'object') {
        console.error("Invalid result data for popup");
        result = { finalResult: 0, updatedBalance: 0, totalWin: 0, totalLoss: 0 };
    }
    
    // Get win and loss amounts with validation
    const winAmount = parseFloat(result.totalWin || 0);
    const lossAmount = parseFloat(result.totalLoss || 0);
    
    // Validate amounts
    if (isNaN(winAmount) || winAmount < 0) {
        console.error("Invalid win amount:", result.totalWin);
        result.totalWin = 0;
    }
    
    if (isNaN(lossAmount) || lossAmount < 0) {
        console.error("Invalid loss amount:", result.totalLoss);
        result.totalLoss = 0;
    }
    
    // Calculate net result
    const netResult = winAmount - lossAmount;
    
    // Validate net result
    if (isNaN(netResult)) {
        console.error("Invalid net result calculation");
        return;
    }
    
    // Determine result type
    let resultClass = '';
    let resultIcon = '';
    let resultText = '';
    let detailText = '';
    
    if (winAmount > 0 && lossAmount === 0) {
        // Pure win
        resultClass = 'win';
        resultIcon = '✅';
        resultText = `आपने जीता: +${winAmount.toFixed(2)} ₹`;
    } 
    else if (lossAmount > 0 && winAmount === 0) {
        // Pure loss
        resultClass = 'loss';
        resultIcon = '❌';
        resultText = `आपने खोया: -${lossAmount.toFixed(2)} ₹`;
    }
    else if (winAmount > 0 && lossAmount > 0) {
        // Both win and loss
        if (netResult > 0) {
            resultClass = 'win';
            resultIcon = '✅';
            resultText = `कुल जीत: +${netResult.toFixed(2)} ₹`;
            detailText = `(जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
        } else if (netResult < 0) {
            resultClass = 'loss';
            resultIcon = '❌';
            resultText = `कुल हार: -${Math.abs(netResult).toFixed(2)} ₹`;
            detailText = `(जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
        } else {
            resultClass = 'draw';
            resultIcon = '🔄';
            resultText = `बराबरी: 0.00 ₹`;
            detailText = `(जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
        }
    }
    else {
        // No win or loss
        resultClass = 'draw';
        resultIcon = '🔄';
        resultText = `कोई जीत/हार नहीं: 0.00 ₹`;
    }
    
    // Get balance with fallback and validation
    const balance = parseFloat(result.updatedBalance || result.newBalance || 0);
    
    // Validate balance
    if (isNaN(balance) || balance < 0) {
        console.error("Invalid balance:", result.updatedBalance || result.newBalance);
        balance = 0;
    }
    
    const formattedBalance = balance.toFixed(2);
    
    // Update popup content
    popup.innerHTML = `
        <div class="win-loss-popup-content ${resultClass}">
            <div class="win-loss-popup-header ${resultClass}">
                <h3>परिणाम</h3>
                <button class="win-loss-close-btn">&times;</button>
            </div>
            <div class="win-loss-popup-body">
                <div class="win-loss-result ${resultClass}">
                    <div class="win-loss-icon">${resultIcon}</div>
                    <div class="win-loss-amount">${resultText}</div>
                    ${detailText ? `<div class="win-loss-details">${detailText}</div>` : ''}
                </div>
                <div class="win-loss-balance">
                    <p>नया बैलेंस: ${formattedBalance} ₹</p>
                </div>
            </div>
        </div>
    `;
    
    // Show popup with animation immediately
    popup.classList.add('show');
    
    // Add event listener to close button
    const closeBtn = popup.querySelector('.win-loss-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('show');
            setTimeout(() => {
                if (popup && popup.parentNode) {
                    popup.remove();
                }
            }, 300);
        });
    }
    
    // Auto-close after 5 seconds
    popup._autoCloseTimeout = setTimeout(() => {
        if (popup && popup.classList.contains('show')) {
            popup.classList.remove('show');
            setTimeout(() => {
                if (popup && popup.parentNode) {
                    popup.remove();
                }
            }, 300);
        }
    }, 5000); // Auto-close after 5 seconds
    
    // Add click outside to close functionality
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('show');
            setTimeout(() => {
                if (popup && popup.parentNode) {
                    popup.remove();
                }
            }, 300);
        }
    });
}

// Reset UI handler
socket.on("resetUI", ({ timeframe }) => {
    console.log(`🔄 Resetting UI for new round for timeframe ${timeframe}...`);
    
    // Mark this timeframe as not showing result
    if (timeframeButtonValues[timeframe]) {
        timeframeButtonValues[timeframe].isShowingResult = false;
    }
    
    // Reset popup state for this timeframe
    const tf = parseInt(timeframe);
    if (popupState[tf]) {
        hideBettingClosedPopup(tf);
    }

    // Only reset UI if this is for the current selected timeframe
    if (parseInt(timeframe) === parseInt(currentTimeframe)) {
        resetButtonsToNumbers();

        // Reset result and loading elements
        const finalResult = document.getElementById("final-result");
        if (finalResult) finalResult.style.display = "none";
        
        const loadingIcon = document.getElementById("loading-icon");
        if (loadingIcon) loadingIcon.style.display = "none";
        
        const winLoss = document.getElementById("win-loss");
        if (winLoss) winLoss.style.display = "block";
        
        const noBetMessage = document.getElementById("no-bet-message");
        if (noBetMessage) noBetMessage.style.display = "block";

        // Enable buttons
        document.querySelectorAll(".box, #low, #high, #submit").forEach(btn => {
            btn.disabled = false;
        });

        // Clear active trade table - we'll do this only when a new round starts
        clearTradePanel();
        
        // Now close any win/loss popups from previous round
        const popup = document.getElementById('win-loss-popup');
        if (popup) {
            // Check if this popup belongs to the current timeframe
            const popupGameId = popup.getAttribute('data-game-id') || '';
            const popupTimeframe = popup.getAttribute('data-timeframe') || '';
            
            // Only close popup if it belongs to this timeframe
            if (popupGameId.startsWith(`${timeframe}-`) || popupTimeframe === timeframe.toString()) {
                console.log(`Scheduling win/loss popup close for timeframe ${timeframe} as new round is starting`);
                // Don't close immediately, give user time to see results
                setTimeout(() => {
                    if (popup && popup.parentNode && popup.classList.contains('show')) {
                        console.log(`Closing win/loss popup for timeframe ${timeframe} after delay`);
                        popup.classList.remove('show');
                        setTimeout(() => {
                            if (popup && popup.parentNode) {
                                popup.remove();
                            }
                        }, 300);
                    }
                }, 3000); // Wait 3 seconds before closing popup
            } else {
                console.log(`Not closing popup for timeframe ${popupTimeframe} when reset came for timeframe ${timeframe}`);
            }
        }
    }
});

// Helper function to reset buttons to numbers 1-9
function resetButtonsToNumbers() {
    const buttons = document.querySelectorAll('.box');
        buttons.forEach((button, index) => {
        button.textContent = index + 1;
        button.removeAttribute('data-multiplier');
    });
}

// Bet results UI update handler
socket.on("updateBetResultsUI", (data) => {
    console.log("🎯 Received Updated Bet Results:", data);
    if (data && data.bets) {
        // Debug: Log the bets data to see if multipliers are present
        console.log("Bets data received:", JSON.stringify(data.bets, null, 2));
        
        // Find any temporary bet rows and mark them for replacement
        const tbody = document.querySelector("#active-bets-tbody");
        if (tbody) {
            const tempRows = tbody.querySelectorAll(".temporary-bet");
            
            // For each server bet, check if it matches a temporary row
            data.bets.forEach(serverBet => {
                let tempRowFound = false;
                
                // Debug: Log each bet to check if it has multipliers
                console.log(`Processing bet ${serverBet.gameId}:`, 
                    serverBet.result, 
                    "Multipliers:", serverBet.multipliers);
                
                // Look for matching temporary rows
                tempRows.forEach(tempRow => {
                    const tempGameId = tempRow.getAttribute("data-game-id");
                    
                    // If we find a match, replace the temporary row with server data
                    if (serverBet.gameId === tempGameId || tempGameId === "pending") {
                        // Add a fade transition
                        tempRow.style.transition = "all 0.3s ease";
                        
                        // Update row class based on bet result
                        if (serverBet.result === "Won") {
                            tempRow.className = "profit win-row"; // Remove temporary-bet class
                            tempRow.style.backgroundColor = "rgba(48, 187, 94, 0.24)";
                            tempRow.style.borderLeft = "3px solid #33CC66";
                        } else if (serverBet.result === "Lost") {
                            tempRow.className = "profit loss-row"; // Remove temporary-bet class
                            tempRow.style.backgroundColor = "rgba(216, 11, 0, 0.24)";
                            tempRow.style.borderLeft = "3px solid #FF3B30";
                        } else {
                            tempRow.className = "profit"; // Remove temporary-bet class
                            tempRow.style.backgroundColor = "";
                            tempRow.style.borderLeft = "";
                        }
                        
                        // Calculate win/loss display
                        let winLossDisplay = "";
                        let resultDisplay = serverBet.result || "Pending";
                        
                        // If multipliers are available, format them with styling
                        if (serverBet.multipliers && Array.isArray(serverBet.multipliers) && serverBet.multipliers.length > 0) {
                            console.log("Found multipliers:", serverBet.multipliers);
                            resultDisplay = serverBet.multipliers.map(m => {
                                return `<span class="multiplier-value multiplier-${m}">${m}</span>`;
                            }).join(" ");
                        } else if (serverBet.result && serverBet.result.includes("x") && serverBet.result.includes(",")) {
                            // Try to parse multipliers from result string (e.g. "2x, 4x, 2x")
                            console.log("Parsing multipliers from result string:", serverBet.result);
                            const multiplierValues = serverBet.result.split(",").map(m => m.trim());
                            resultDisplay = multiplierValues.map(m => {
                                return `<span class="multiplier-value multiplier-${m}">${m}</span>`;
                            }).join(" ");
                        } else {
                            console.log("No multipliers found for bet:", serverBet.gameId);
                            // If no multipliers but bet has result, show the result
                            if (serverBet.result && serverBet.result !== "Pending") {
                                resultDisplay = serverBet.result;
                            }
                        }
                        
                        if (serverBet.result === "Won") {
                            winLossDisplay = `+${serverBet.payout} ₹`;
                        } else if (serverBet.result === "Lost") {
                            winLossDisplay = `-${serverBet.betAmount} ₹`;
                        } else {
                            // For pending bets, show loading animation
                            winLossDisplay = `<div class="bet-loading-spinner"></div>`;
                        }
                        
                        // Update the content of the temporary row with server data
                        // Make sure this structure matches the updateTradePanel function
                        tempRow.innerHTML = `
                            <td class="result-data-table">${Array.from(tbody.children).indexOf(tempRow) + 1}</td>
                            <td class="result-data-table">${serverBet.gameId || "N/A"}</td>
                            <td class="result-data-table">${serverBet.betNumber ? serverBet.betNumber.join(", ") : "-"}</td>
                            <td class="result-data-table">${serverBet.betAmount} ₹</td>
                            <td class="result-data-table">${resultDisplay}</td>
                            <td class="result-data-table">${winLossDisplay}</td>
                        `;
                        
                        tempRowFound = true;
                    }
                });
                
                // If no matching temporary row, this is not a freshly placed bet
                // Let the normal updateTradePanel function handle these
            });
        }
        
        // Update trading panel with all bets
        updateTradePanel(data.bets);
        
        // Check bet status and show final result
        const pendingBets = data.bets.filter(bet => bet.result === "Pending");
        
        // ✅ Update pending bet count display
        if (window.updatePendingBetCount) {
            window.updatePendingBetCount(pendingBets.length);
        }
        
        if (pendingBets.length === 0 && data.bets.length > 0) {
            // All bets have results, update UI
            const winLossElement = document.getElementById("win-loss");
            const noBetMessage = document.getElementById("no-bet-message");
            const loadingIcon = document.getElementById("loading-icon");
            
            if (winLossElement) winLossElement.style.display = "none";
            if (noBetMessage) noBetMessage.style.display = "none";
            if (loadingIcon) loadingIcon.style.display = "none";
            
            // Update user history as well
            fetchUserHistory();
        } else if (data.bets.length === 0) {
            // No bets at all, make sure loading icon is hidden
            const loadingIcon = document.getElementById("loading-icon");
            if (loadingIcon) loadingIcon.style.display = "none";
            
            const winLossElement = document.getElementById("win-loss");
            if (winLossElement) winLossElement.style.display = "block";
            
            const noBetMessage = document.getElementById("no-bet-message");
            if (noBetMessage) noBetMessage.style.display = "block";
        }
    }
});

// Store original button values
let originalButtonValues = [];

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".number-pad .box");
    buttons.forEach((button, index) => {
        originalButtonValues[index] = button.textContent;
    });

    // Fetch user bets on page load and initialize pending bet count
    fetchUserBets();
    
    // Initialize pending bet count to 0 on page load
    setTimeout(() => {
        if (window.updatePendingBetCount) {
            window.updatePendingBetCount(0);
        }
    }, 1000);
});

    // Initialize socket events function
    function initializeSocketEvents() {
        console.log("🔄 Rebinding socket events...");

        // Handle bet errors
        socket.off("betError");
        socket.on("betError", (data) => {
            console.log("❌ Bet Error:", data);
            if (data.errorType === "betLimitReached") {
                if (window.showErrorToast) {
                    window.showErrorToast("⚠️ " + data.message);
                } else {
                    alert("⚠️ " + data.message);
                }
                // Update pending bet count to show limit reached
                if (window.updatePendingBetCount) {
                    window.updatePendingBetCount(2);
                }
            } else {
                if (window.showErrorToast) {
                    window.showErrorToast("❌ " + data.message);
                } else {
                    alert("❌ " + data.message);
                }
            }
        });

    // Better error handling with event handler rebinding
    socket.off("finalBetResult");
    socket.on("finalBetResult", (data) => {
        console.log("✅ Final Result Data Received:", data);

        // Basic data validation
        if (!data || typeof data !== 'object') {
            console.error("❌ Invalid data received for final result");
            return;
        }
        
        // Check if user is logged in
        const userId = getUserId();
        if (!userId) {
            console.log("User not logged in, not showing win/loss result");
            return;
        }
        
        // Mark that we've received a result to prevent duplicate requests
        const popup = document.getElementById('win-loss-popup');
        if (popup) {
            popup.classList.add('result-received');
            
            // Store the game ID in the popup for tracking
            if (data.gameId) {
                popup.setAttribute('data-game-id', data.gameId);
            }
            
            // Keep the disable-auto-close attribute to prevent auto-closing
            popup.setAttribute('data-disable-auto-close', 'true');
        }
        
        // Check if the user had any bets for this game
        // If totalWin and totalLoss are both 0, and there's no error, it means the user had no bets
        const hadNoBets = data.totalWin === 0 && data.totalLoss === 0 && !data.error;
        
        // If user had no bets, hide the loading popup without showing results
        if (hadNoBets && popup) {
            console.log("User had no bets for this game, hiding loading popup");
            popup.classList.remove('show');
            setTimeout(() => {
                if (popup && popup.parentNode) {
                    popup.remove();
                }
            }, 300);
            return;
        }

        // Remove loading icon
        const loadingIcon = document.getElementById("loading-icon");
        if (loadingIcon) loadingIcon.style.display = "none";
        
        // Select result element
        const finalResultElement = document.getElementById("final-result");
        if (finalResultElement) {
            try {
                // Get win and loss amounts from the data
                const winAmount = parseFloat(data.totalWin || 0);
                const lossAmount = parseFloat(data.totalLoss || 0);
                
                // Calculate net result (win - loss)
                const netResult = winAmount - lossAmount;
                
                if (isNaN(netResult)) {
                    console.error("❌ Invalid amounts received:", { win: data.totalWin, loss: data.totalLoss });
                finalResultElement.innerText = "रिजल्ट प्राप्त करने में त्रुटि";
                finalResultElement.style.display = "block";
                finalResultElement.style.color = "#FFA500"; // Orange
                } else {
            let resultText = "";
            
            // Check Win/Loss/Draw and update UI
                    if (winAmount > 0 && lossAmount === 0) {
                        // Pure win
                        resultText = `✅ आपने जीता: +${winAmount.toFixed(2)} ₹`;
                finalResultElement.style.color = "#33CC66"; // Green
                finalResultElement.classList.remove("loss-animation", "draw-animation");
                finalResultElement.classList.add("win-animation");
            } 
                    else if (lossAmount > 0 && winAmount === 0) {
                        // Pure loss
                        resultText = `❌ आपने खोया: -${lossAmount.toFixed(2)} ₹`;
                finalResultElement.style.color = "#FF3B30"; // Red
                finalResultElement.classList.remove("win-animation", "draw-animation");
                finalResultElement.classList.add("loss-animation");
            }
                    else if (winAmount > 0 && lossAmount > 0) {
                        // Both win and loss - show net result
                        if (netResult > 0) {
                            resultText = `✅ कुल जीत: +${netResult.toFixed(2)} ₹ (जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
                            finalResultElement.style.color = "#33CC66"; // Green
                            finalResultElement.classList.remove("loss-animation", "draw-animation");
                            finalResultElement.classList.add("win-animation");
                        } else if (netResult < 0) {
                            resultText = `❌ कुल हार: -${Math.abs(netResult).toFixed(2)} ₹ (जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
                            finalResultElement.style.color = "#FF3B30"; // Red
                            finalResultElement.classList.remove("win-animation", "draw-animation");
                            finalResultElement.classList.add("loss-animation");
                        } else {
                            resultText = `🔄 बराबरी: 0.00 ₹ (जीत: ${winAmount.toFixed(2)} ₹, हार: ${lossAmount.toFixed(2)} ₹)`;
                            finalResultElement.style.color = "#FFCC00"; // Yellow
                            finalResultElement.classList.remove("win-animation", "loss-animation");
                            finalResultElement.classList.add("draw-animation");
                        }
            }
            else {
                        // No win or loss (shouldn't happen but just in case)
                resultText = `🔄 कोई जीत/हार नहीं: 0.00 ₹`;
                finalResultElement.style.color = "#FFCC00"; // Yellow
                finalResultElement.classList.remove("win-animation", "loss-animation");
                finalResultElement.classList.add("draw-animation");
            }

            // Update result text and display
            finalResultElement.innerText = resultText;
            finalResultElement.style.display = "block";
            }
        } catch (error) {
            console.error("❌ Error processing bet result:", error);
            finalResultElement.innerText = "रिजल्ट प्रोसेस करने में त्रुटि";
            finalResultElement.style.display = "block";
            finalResultElement.style.color = "#FF3B30"; // Red
        }
        }
        
        // Update user balance with fallback to alternative fields
        const newBalance = data.updatedBalance || data.newBalance;
        if (newBalance !== undefined) {
            updateUserBalance(newBalance);
        }
        
        // Show result popup immediately with win/loss details
        console.log("Showing win/loss result popup immediately");
        showWinLossResultPopup(data);
        
        // Fetch history after result
        setTimeout(() => {
            fetchUserHistory();
        }, 500); // Reduced from 1000ms to 500ms for faster updates
        
        // Reset pending bet count after results are received
        setTimeout(() => {
            if (window.updatePendingBetCount) {
                // Fetch fresh bet data to get accurate pending count
                fetchUserBets();
            }
        }, 1000);
    });

    // New round started event
    socket.on("newRoundStarted", ({ timeframe }) => {
        console.log(`✅ New Round Started for timeframe ${timeframe}`);

        // Only update UI if this is for the current selected timeframe
        if (parseInt(timeframe) === parseInt(currentTimeframe)) {
            // Hide result
        const finalResult = document.getElementById("final-result");
        if (finalResult) finalResult.style.display = "none";
        
            // Reset buttons to numbers
            resetButtonsToNumbers();
            
            // Clear result table
            clearResultTable();
            
            // Reset pending bet count for new round
            setTimeout(() => {
                if (window.updatePendingBetCount) {
                    // Fetch fresh bet data to get accurate pending count
                    fetchUserBets();
                }
            }, 500);
            
            // Check if there are any pending bets for this timeframe
            // If no pending bets, hide the loading icon and show the default messages
            setTimeout(() => {
                const tbody = document.querySelector("#active-bets-tbody");
                if (tbody) {
                    const pendingBets = tbody.querySelectorAll("tr:not(.timeframe-header)");
                    const hasPendingBets = Array.from(pendingBets).some(row => {
                        const cells = row.querySelectorAll("td");
                        if (cells.length >= 6) {
                            const resultCell = cells[5]; // Result column
                            return resultCell && resultCell.textContent.includes("Pending");
                        }
                        return false;
                    });
                    
                    const loadingIcon = document.getElementById("loading-icon");
                    const winLoss = document.getElementById("win-loss");
                    const noBetMessage = document.getElementById("no-bet-message");
                    
                    if (!hasPendingBets) {
                        // No pending bets, hide loading icon and show default messages
                        if (loadingIcon) loadingIcon.style.display = "none";
                        if (winLoss) winLoss.style.display = "block";
                        if (noBetMessage) noBetMessage.style.display = "block";
                    } else {
                        // There are pending bets, show loading icon
                        if (loadingIcon) loadingIcon.style.display = "block";
                        if (winLoss) winLoss.style.display = "none";
                        if (noBetMessage) noBetMessage.style.display = "none";
                    }
                }
            }, 100); // Small delay to ensure the trade panel has been updated
        }
    });
}

// Observe DOM elements for socket event setup
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM Loaded: Now initializing events");

    const observer = new MutationObserver((mutations, obs) => {
        const loadingIcon = document.getElementById("loading-icon");
        const finalResult = document.getElementById("final-result");

        if (loadingIcon && finalResult) {
            console.log("✅ Elements found, initializing socket events");
            obs.disconnect();
            initializeSocketEvents();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

// Clear trade panel function
function clearTradePanel() {
    const tradePanel = document.querySelector(".trade-panel");
    if (tradePanel) {
        tradePanel.innerHTML = `
            <div class="panel-empty-message">
                <p>No active bets for this timeframe.</p>
            </div>
        `;
    }
}

// Clear result table function
function clearResultTable() {
    const resultContainer = document.querySelector(".result-main-container");
    if (resultContainer) {
        // Don't show loading text, just clear and fetch results
        resultContainer.innerHTML = '';
        
        // Mark results as not loaded correctly
        resultsLoadedCorrectly = false;
        console.log("Results table cleared, fetching fresh results");
        
        // Fetch results without showing loading
        fetchResultsWithoutLoading(1, currentTimeframe);
    }
}

// Fetch user bets for trade panel
async function fetchUserBets() {
    try {
        // Remove timeframe parameter to get all active bets
        const response = await fetch(`/user/userBets`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.bets) {
                updateTradePanel(data.bets);
                
                // Update pending bet count with fresh data
                if (window.updatePendingBetCount) {
                    const pendingBets = data.bets.filter(bet => bet.result === "Pending");
                    window.updatePendingBetCount(pendingBets.length);
                    console.log(`Updated pending bet count: ${pendingBets.length}/2`);
                }
            } else {
                // No bets found, reset count to 0
                if (window.updatePendingBetCount) {
                    window.updatePendingBetCount(0);
                    console.log("No bets found, reset pending count to 0");
                }
            }
        }
    } catch (error) {
        console.error("Error fetching user bets:", error);
    }
}

// Update trade panel with bet data
function updateTradePanel(bets) {
    console.log(`Updating trade panel with ${bets ? bets.length : 0} bets`);
    
    const table = document.querySelector(".result-table");
    if (!table) return;
    
    // Find tbody or create it if not exists
    let tbody = table.querySelector("#active-bets-tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        tbody.id = "active-bets-tbody";
        table.appendChild(tbody);
    }
    
    // Keep the table header
    const tableHeader = table.querySelector("tr#table-head");
    
    // Clear only the tbody content
    tbody.innerHTML = "";
    
    // If header is missing, make sure it's recreated before tbody
    if (!tableHeader) {
        // If header doesn't exist, create it
        const header = document.createElement("tr");
        header.id = "table-head";
        header.innerHTML = `
            <th class="trade-table-heading">No.</th>
            <th class="trade-table-heading">ID</th>
            <th class="trade-table-heading">Trade</th>
            <th class="trade-table-heading">Ammount</th>
            <th class="trade-table-heading">Timeframe</th>
            <th class="trade-table-heading">Result</th>
            <th class="trade-table-heading">Win/Loss</th>
        `;
        // Make sure header is added before tbody
        if (table.firstChild) {
            table.insertBefore(header, table.firstChild);
        } else {
            table.appendChild(header);
        }
    } else {
        // Update existing header to include timeframe column
        if (tableHeader.querySelectorAll('th').length === 6) {
            // Insert timeframe column if it doesn't exist
            const resultTh = tableHeader.querySelector('th:nth-child(5)');
            if (resultTh) {
                const timeframeTh = document.createElement('th');
                timeframeTh.className = "trade-table-heading";
                timeframeTh.textContent = "Timeframe";
                tableHeader.insertBefore(timeframeTh, resultTh);
            }
        }
    }
    
    // If no bets, show message and reset loading icon
    if (!bets || bets.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 20px;">No active trades</td>
        `;
        tbody.appendChild(noDataRow);
        
        // Reset loading icon and show default messages when no bets
        const loadingIcon = document.getElementById("loading-icon");
        const winLoss = document.getElementById("win-loss");
        const noBetMessage = document.getElementById("no-bet-message");
        
        if (loadingIcon) loadingIcon.style.display = "none";
        if (winLoss) winLoss.style.display = "block";
        if (noBetMessage) noBetMessage.style.display = "block";
        
        return;
    }

    // First, preserve any temporary rows
    const tempRows = Array.from(tbody.querySelectorAll(".temporary-bet"));
    
    // Group bets by timeframe for better organization
    const betsByTimeframe = {};
    bets.forEach(bet => {
        const timeframe = bet.timeframe || 30;
        if (!betsByTimeframe[timeframe]) {
            betsByTimeframe[timeframe] = [];
        }
        betsByTimeframe[timeframe].push(bet);
    });
    
    // Sort timeframes (30, 45, 60, 150)
    const sortedTimeframes = Object.keys(betsByTimeframe).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Track overall index for row numbering
    let overallIndex = 0;
    
    // Add bets for each timeframe
    sortedTimeframes.forEach(timeframe => {
        const timeframeBets = betsByTimeframe[timeframe];
        
        // Add timeframe header row
        const timeframeHeaderRow = document.createElement("tr");
        timeframeHeaderRow.className = "timeframe-header";
        timeframeHeaderRow.innerHTML = `
            <td colspan="7" style="text-align: left; padding: 10px; background-color:#1a1a1a; font-weight: bold;">
                ${getTimeframeLabel(parseInt(timeframe))}
            </td>
        `;
        tbody.appendChild(timeframeHeaderRow);
        
        // Add bets for this timeframe
        timeframeBets.forEach(bet => {
            // Skip if this bet already has a temporary row
            const tempRowWithGameId = tempRows.find(row => 
                row.getAttribute("data-game-id") === bet.gameId || 
                row.getAttribute("data-game-id") === "pending"
            );
            if (tempRowWithGameId) return;
            
            overallIndex++;
            const row = document.createElement("tr");
            
            // Determine row class based on bet result
            if (bet.result === "Won") {
                row.className = "profit win-row";
                row.style.backgroundColor = "rgba(51, 204, 102, 0.1)";
                row.style.borderLeft = "3px solid #33CC66";
            } else if (bet.result === "Lost") {
                row.className = "profit loss-row";
                row.style.backgroundColor = "rgba(255, 59, 48, 0.1)";
                row.style.borderLeft = "3px solid #FF3B30";
            } else {
                row.className = "profit";
            }
            
            // Calculate win/loss display
        let winLossDisplay = "";
            let resultDisplay = bet.result || "Pending";
            
            // If multipliers are available, format them with styling
            if (bet.multipliers && Array.isArray(bet.multipliers) && bet.multipliers.length > 0) {
                resultDisplay = bet.multipliers.map(m => {
                    return `<span class="multiplier-value multiplier-${m}">${m}</span>`;
                }).join(" ");
            } else if (bet.result && bet.result.includes("x") && bet.result.includes(",")) {
                // Try to parse multipliers from result string (e.g. "2x, 4x, 2x")
                const multiplierValues = bet.result.split(",").map(m => m.trim());
                resultDisplay = multiplierValues.map(m => {
                    return `<span class="multiplier-value multiplier-${m}">${m}</span>`;
                }).join(" ");
            }
            
            if (bet.result === "Won") {
                winLossDisplay = `+${bet.payout} ₹`;
            } else if (bet.result === "Lost") {
                winLossDisplay = `-${bet.betAmount} ₹`;
        } else {
                // For pending bets, show loading animation
                winLossDisplay = `<div class="bet-loading-spinner"></div>`;
            }
            
            // Get timeframe display
            const timeframeDisplay = getTimeframeLabel(parseInt(timeframe)).split(" ")[0];
            
            row.innerHTML = `
                <td class="result-data-table">${overallIndex}</td>
                <td class="result-data-table">${bet.gameId || "N/A"}</td>
                <td class="result-data-table">${bet.betNumber ? bet.betNumber.join(", ") : "-"}</td>
                <td class="result-data-table">${bet.betAmount} ₹</td>
                <td class="result-data-table">${timeframeDisplay}</td>
            <td class="result-data-table">${resultDisplay}</td>
            <td class="result-data-table">${winLossDisplay}</td>
            `;
        
            tbody.appendChild(row);
        });
    });
    
    // Add any temporary rows back at the top
    tempRows.forEach(tempRow => {
        const timeframeAttr = tempRow.getAttribute("data-timeframe");
        const timeframeDisplay = getTimeframeLabel(parseInt(timeframeAttr || currentTimeframe)).split(" ")[0];
        
        // Update the row to include timeframe column
        const cells = tempRow.querySelectorAll("td");
        if (cells.length === 6) {
            // Create new timeframe cell
            const timeframeCell = document.createElement("td");
            timeframeCell.className = "result-data-table";
            timeframeCell.textContent = timeframeDisplay;
            
            // Insert after the amount cell (4th cell)
            tempRow.insertBefore(timeframeCell, cells[4]);
        }
        
        tbody.insertBefore(tempRow, tbody.firstChild);
    });
    
    // Check if there are any pending bets and update loading icon accordingly
    const allRows = tbody.querySelectorAll("tr:not(.timeframe-header)");
    const hasPendingBets = Array.from(allRows).some(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 6) {
            const resultCell = cells[5]; // Result column
            return resultCell && (resultCell.textContent.includes("Pending") || resultCell.querySelector(".bet-loading-spinner"));
        }
        return false;
    });
    
    const loadingIcon = document.getElementById("loading-icon");
    const winLoss = document.getElementById("win-loss");
    const noBetMessage = document.getElementById("no-bet-message");
    
    if (hasPendingBets) {
        // There are pending bets, show loading icon
        if (loadingIcon) loadingIcon.style.display = "block";
        if (winLoss) winLoss.style.display = "none";
        if (noBetMessage) noBetMessage.style.display = "none";
    } else {
        // No pending bets, hide loading icon and show default messages
        if (loadingIcon) loadingIcon.style.display = "none";
        if (winLoss) winLoss.style.display = "block";
        if (noBetMessage) noBetMessage.style.display = "block";
    }
}

// Function to add a temporary bet row 
function addTemporaryBetRow(betData) {
    const table = document.querySelector(".result-table");
    if (!table) return;
    
    // Find tbody or create it if not exists
    let tbody = table.querySelector("#active-bets-tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        tbody.id = "active-bets-tbody";
        table.appendChild(tbody);
    }

    // Create a temporary row
    const tempRow = document.createElement("tr");
    tempRow.className = "profit temporary-bet";
    tempRow.setAttribute("data-game-id", betData.gameId || "pending");
    tempRow.setAttribute("data-timeframe", currentTimeframe); // Add timeframe as data attribute
    
    // Show the table header if it's hidden
    const tableHead = document.getElementById("table-head");
    if (tableHead) {
        tableHead.style.display = "table-row";
    }
    
    // Add a fade-in animation
    tempRow.style.animation = "fadeIn 0.3s ease-in-out";
    
    // Get timeframe display
    const timeframeDisplay = getTimeframeLabel(parseInt(currentTimeframe)).split(" ")[0];
    
    // Use the same structure as in updateTradePanel function
    tempRow.innerHTML = `
        <td class="result-data-table">${tbody.children.length + 1}</td>
        <td class="result-data-table">${betData.gameId || "Waiting..."}</td>
        <td class="result-data-table">${betData.betNumber.join(", ")}</td>
        <td class="result-data-table">${betData.betAmount} ₹</td>
        <td class="result-data-table">${timeframeDisplay}</td>
        <td class="result-data-table">Pending</td>
        <td class="result-data-table"><div class="bet-loading-spinner"></div></td>
    `;
    
    // Add to the beginning of the tbody
    if (tbody.firstChild) {
        tbody.insertBefore(tempRow, tbody.firstChild);
    } else {
        tbody.appendChild(tempRow);
    }
    
    // Show loading icon when a bet is placed
    const loadingIcon = document.getElementById("loading-icon");
    const winLoss = document.getElementById("win-loss");
    const noBetMessage = document.getElementById("no-bet-message");
    
    if (loadingIcon) loadingIcon.style.display = "block";
    if (winLoss) winLoss.style.display = "none";
    if (noBetMessage) noBetMessage.style.display = "none";
    
    // Add styles for temporary row
const style = document.createElement('style');
style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .temporary-bet {
            background-color: rgba(255, 204, 0, 0.1);
            border-left: 3px solid #FFCC00;
        }
        
        .bet-loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
}

// Expose these functions globally
window.BettingApp = window.BettingApp || {};
window.BettingApp.fetchUserBets = fetchUserBets;
window.BettingApp.updateTradePanel = updateTradePanel;
window.BettingApp.addTemporaryBetRow = addTemporaryBetRow;
window.BettingApp.fetchUserHistory = fetchUserHistory;

// Update user balance function
function updateUserBalance(newBalance) {
    try {
        // Update balance in navbar
        const navbarBalanceEl = document.getElementById("left-bal");
        if (navbarBalanceEl) {
            navbarBalanceEl.textContent = newBalance + " ₹";
        }
        
        // Update balance in profilelink section
        const profileBalanceEl = document.getElementById("left-balances");
        if (profileBalanceEl) {
            profileBalanceEl.textContent = newBalance + " ₹";
        }
        
        console.log("✅ Balance updated successfully in all places:", newBalance);
    } catch (error) {
        console.error("❌ Error updating balance:", error);
    }
}

// CSS has been moved to public/css/tradepanel.css
// No need to dynamically inject styles anymore

// Socket events for checking current result status
socket.on("timeframeStatus", (data) => {
    if (data && data.timeframes) {
        // Update showing result status for each timeframe
        Object.keys(data.timeframes).forEach(timeframe => {
            if (timeframeButtonValues[timeframe]) {
                timeframeButtonValues[timeframe].isShowingResult = data.timeframes[timeframe].isShowingResult;
                
                // If this timeframe is showing result and it's the current timeframe, update the UI
                if (parseInt(timeframe) === parseInt(currentTimeframe) && data.timeframes[timeframe].isShowingResult) {
                    if (data.timeframes[timeframe].values && data.timeframes[timeframe].values.length === 9) {
                        timeframeButtonValues[timeframe].values = [...data.timeframes[timeframe].values];
                        
                        // Update buttons with values
    const buttons = document.querySelectorAll('.box');
    buttons.forEach((button, index) => {
                            button.textContent = data.timeframes[timeframe].values[index];
                            button.setAttribute('data-multiplier', data.timeframes[timeframe].values[index]);
                        });
                    }
                }
            }
        });
    }
});

// New function to fetch user history
async function fetchUserHistory() {
    try {
        const response = await fetch("/user/getCurrentUser", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.history) {
                // Backend se ab latest-to-oldest order me data aa raha hai
                updateHistoryPanel(userData.history);
            }
        }
    } catch (error) {
        console.error("Error fetching user history:", error);
    }
}

// Global variables for trade history pagination
let tradeHistoryCurrentPage = 1;
let tradeHistoryTotalPages = 1;
let tradeHistoryData = [];
const tradeHistoryPerPage = 10;

// New function to update history panel with pagination
function updateHistoryPanel(history) {
    // Store the full history data
    tradeHistoryData = history || [];
    tradeHistoryTotalPages = Math.ceil(tradeHistoryData.length / tradeHistoryPerPage);
    
    // Ensure current page is valid
    if (tradeHistoryCurrentPage > tradeHistoryTotalPages) {
        tradeHistoryCurrentPage = 1;
    }
    
    // Get data for current page
    const startIndex = (tradeHistoryCurrentPage - 1) * tradeHistoryPerPage;
    const endIndex = startIndex + tradeHistoryPerPage;
    const currentPageData = tradeHistoryData.slice(startIndex, endIndex);
    
    const historyTable = document.querySelector(".result-table2");
    if (!historyTable) return;
    
    // Keep the table header
    const tableHeader = historyTable.querySelector("tr#table-head2");
    
    // Clear the table but keep the header
    historyTable.innerHTML = "";
    if (tableHeader) {
        historyTable.appendChild(tableHeader);
    } else {
        // If header doesn't exist, create it
        const header = document.createElement("tr");
        header.id = "table-head2";
        header.innerHTML = `
            <th class="trade-table-heading">No.</th>
            <th class="trade-table-heading">ID</th>
            <th class="trade-table-heading">Trade</th>
            <th class="trade-table-heading">Ammount</th>
            <th class="trade-table-heading">Result</th>
            <th class="trade-table-heading">Win/Loss</th>
        `;
        historyTable.appendChild(header);
    }
    
    // Check if there's no betting history
    if (tradeHistoryData.length === 0) {
        // Show "no betting history" message
        const noHistoryRow = document.createElement("tr");
        noHistoryRow.className = "no-history-row";
        noHistoryRow.innerHTML = `
            <td colspan="6" class="no-history-message">
                <div class="no-history-content">
                    <i class="fas fa-info-circle"></i>
                    <p>आपकी कोई बेटिंग हिस्ट्री नहीं है</p>
                    <small>जब आप पहली बार बेट लगाएंगे, तो यहाँ आपकी बेटिंग हिस्ट्री दिखाई देगी</small>
                </div>
            </td>
        `;
        historyTable.appendChild(noHistoryRow);
    } else {
        // Add new rows from current page data
        currentPageData.forEach((item, index) => {
            const row = document.createElement("tr");
            row.className = `profit ${item.winAmount > 0 ? "win-row" : (item.lossAmount > 0 ? "loss-row" : "")}`;
            
            const winLossValue = item.winAmount > 0 ? `+${item.winAmount} ₹` : (item.lossAmount > 0 ? `-${item.lossAmount} ₹` : "-");
            
            // Format multipliers for display
            let resultDisplay = item.result;
            
            // If multipliers array exists, use that for display
            if (item.multipliers && Array.isArray(item.multipliers) && item.multipliers.length > 0) {
                console.log("Found multipliers in history item:", item.multipliers);
                resultDisplay = item.multipliers.map(m => {
                    return `<span class="multiplier-value multiplier-${m}">${m}</span>`;
                }).join(" ");
            }
            
            // Calculate the actual row number (considering pagination)
            const actualRowNumber = startIndex + index + 1;
            
            row.innerHTML = `
                <td class="result-data-table">${actualRowNumber}</td>
                <td class="result-data-table">${item.gameId || "N/A"}</td>
                <td class="result-data-table">${item.betNumber ? item.betNumber.join(", ") : "-"}</td>
                <td class="result-data-table">${item.betAmount} ₹</td>
                <td class="result-data-table">${resultDisplay}</td>
                <td class="result-data-table">${winLossValue}</td>
            `;
            
            historyTable.appendChild(row);
        });
    }
    
    // Update pagination controls
    updateTradeHistoryPagination();
}

// Function to update trade history pagination controls
function updateTradeHistoryPagination() {
    const prevBtn = document.getElementById('prevHistoryPage');
    const nextBtn = document.getElementById('nextHistoryPage');
    const pageNumbers = document.getElementById('historyPageNumbers');
    const paginationContainer = document.querySelector('.trade-history-pagination');
    
    if (!prevBtn || !nextBtn || !pageNumbers || !paginationContainer) return;
    
    // Hide pagination if there are 10 or fewer rows (no need for pagination)
    if (tradeHistoryData.length <= 10) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    // Show pagination if there are more than 10 rows
    paginationContainer.style.display = 'flex';
    
    // Update button states
    prevBtn.disabled = tradeHistoryCurrentPage <= 1;
    nextBtn.disabled = tradeHistoryCurrentPage >= tradeHistoryTotalPages;
    
    // Clear existing page numbers - we don't need them anymore
    pageNumbers.innerHTML = '';
    
    // Hide the page numbers container since we only want prev/next buttons
    pageNumbers.style.display = 'none';
}

// Function to change trade history page
function changeTradeHistoryPage(page) {
    if (page < 1 || page > tradeHistoryTotalPages) return;
    
    tradeHistoryCurrentPage = page;
    updateHistoryPanel(tradeHistoryData);
}

// Add event listeners for trade history pagination
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for trade history pagination buttons
    const prevHistoryBtn = document.getElementById('prevHistoryPage');
    const nextHistoryBtn = document.getElementById('nextHistoryPage');
    
    if (prevHistoryBtn) {
        prevHistoryBtn.addEventListener('click', () => {
            if (tradeHistoryCurrentPage > 1) {
                changeTradeHistoryPage(tradeHistoryCurrentPage - 1);
            }
        });
    }
    
    if (nextHistoryBtn) {
        nextHistoryBtn.addEventListener('click', () => {
            if (tradeHistoryCurrentPage < tradeHistoryTotalPages) {
                changeTradeHistoryPage(tradeHistoryCurrentPage + 1);
            }
        });
    }
});

// Listen for history update events
socket.on("historyUpdate", (data) => {
    console.log("📜 Received History Update:", data);
    if (data && data.history) {
        updateHistoryPanel(data.history);
    }
});

// Start polling for updates
async function startPolling() {
    try {
        // Join socket room with user ID
        const userId = getUserId();
        if (userId) {
            socket.emit("joinRoom", { userId });
            
            // Initial fetch of user bets and history
            fetchUserBets();
            fetchUserHistory();
            
            // Fetch initial results - only do this once at the beginning
            // This avoids repeatedly showing loading and overwriting results
            if (!window.initialResultsFetched) {
                fetchResultsWithoutLoading(1, currentTimeframe);
                window.initialResultsFetched = true;
            }
            
            // Set up socket events
            initializeSocketEvents();
        }
        
        // Set up polling interval - only for bets and history, NOT results
        setInterval(async () => {
            try {
                if (!socketConnected) {
                    console.log("Socket not connected, skipping polling");
                    return;
                }
                
                // Fetch active bets
                fetchUserBets();
                
                // Fetch user history periodically
                fetchUserHistory();
                
                // DO NOT fetch results here - let socket events handle that
                
            } catch (error) {
                console.error("Error in polling:", error);
            }
        }, 10000); // Poll every 10 seconds
    } catch (error) {
        console.error("Error starting polling:", error);
    }
}

// Add this function to handle bet placement with timeframe
function placeBet(userId, betNumber, betAmount) {
    if (!userId || !betNumber || !betAmount) {
        console.error("Missing required parameters for bet placement");
        return;
    }
    
    // Include the currently selected timeframe when placing bet
    socket.emit("placeBet", {
        userId,
        betNumber,
        betAmount,
        timeframe: currentTimeframe // Send the currently selected timeframe
    });
}

// Function to clear active bets table
function clearActiveBetsTable() {
    const tbody = document.querySelector("#active-bets-tbody");
    if (tbody) {
        tbody.innerHTML = "";
        
        // Add a "no active trades" message
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 20px;">No active trades for this timeframe</td>
        `;
        tbody.appendChild(noDataRow);
    }
}

// Function to periodically check if results are loaded correctly
function startPeriodicResultsCheck() {
    // Clear any existing interval
    if (resultsCheckInterval) {
        clearInterval(resultsCheckInterval);
    }
    
    // Do an immediate check
    checkAndReloadResultsIfNeeded();
    
    // Set a new interval to check results every 10 seconds
    resultsCheckInterval = setInterval(checkAndReloadResultsIfNeeded, 10000); // Check every 10 seconds
}

// Function to check and reload results if needed
function checkAndReloadResultsIfNeeded() {
    const resultContainer = document.querySelector('.result-main-container');
    
    if (resultContainer) {
        // Check if results container is empty, has loading message, or has error message
        const hasResults = resultContainer.querySelector('.result-container');
        const hasLoading = resultContainer.textContent.includes('Loading') || 
                          resultContainer.innerHTML.includes('loader');
        const hasError = resultContainer.textContent.includes('Error') || 
                        resultContainer.textContent.includes('Failed');
        
        // If there are no results and we're not loading, try to fetch results
        if ((!hasResults && !hasLoading) || hasError) {
            console.log("Results check: Results not loaded correctly, attempting to reload");
            resultsLoadedCorrectly = false;
            
            // Try to fetch results without showing loading screen
            fetchResultsWithoutLoading(1, currentTimeframe);
        } else if (hasResults) {
            // Results are loaded correctly
            resultsLoadedCorrectly = true;
        }
    }
}

// Ensure results are loaded when page loads
function ensureResultsLoaded() {
    const resultContainer = document.querySelector('.result-main-container');
    if (resultContainer) {
        // Check if results are already loaded
        const hasResults = resultContainer.querySelector('.result-container');
        const isLoading = resultContainer.innerHTML.includes('loader') || 
                         resultContainer.textContent.includes('Loading');
        
        if (!hasResults || isLoading) {
            console.log("Results not loaded properly, fetching now...");
            fetchResultsWithoutLoading(1, currentTimeframe);
        }
    }
}

function changeTimeframe(newTimeframe) {
    if (newTimeframe === currentTimeframe) return;
    
    console.log(`Changing timeframe from ${currentTimeframe} to ${newTimeframe}`);
    
    // Update current timeframe
    currentTimeframe = newTimeframe;
    
    // Reset page to 1 for new timeframe
    currentPage = 1;
    
    // Update UI
    updateTimeframeLabel(newTimeframe);
    
    // Emit timeframe change to server
    socket.emit("selectTimeframe", { timeframe: newTimeframe });
    
    // Reset pending bet count for new timeframe
    if (window.updatePendingBetCount) {
        window.updatePendingBetCount(0);
    }
    
    // Fetch results for new timeframe
    fetchResultsWithoutLoading(1, newTimeframe);
    
    // Ensure results are loaded for new timeframe
    setTimeout(() => {
        ensureResultsLoaded();
    }, 1000);
}
