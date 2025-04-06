const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    timeout: 20000
});

document.addEventListener('DOMContentLoaded', function() {
    const timerPera = document.querySelector('.timerPera');
    const topBar = document.getElementById('topBar');
    const navbar = document.querySelector('.navBar');
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const body = document.body;
    
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
});

socket.on("balanceUpdate", (data) => {
    console.log("📢 बैलेंस अपडेट हुआ:", data.updatedBalance);

    // ✅ NavBar और Profile Section दोनों में बैलेंस अपडेट करें
    document.querySelectorAll(".Left-balance").forEach(el => {
        el.innerHTML = `<strong>${data.updatedBalance} ₹</strong>`;
    });
});

// पेजिनेशन वेरिएबल्स
let currentPage = 1;
let totalPages = 1;
const resultsPerPage = 10;

// रिजल्ट्स फेच और डिस्प्ले करने का फंक्शन
async function fetchAndDisplayResults(page) {
    try {
        socket.emit("fetchResults", { page, limit: resultsPerPage });
    } catch (error) {
        console.error("Error requesting results:", error);
    }
}

// रिजल्ट्स डिस्प्ले करने का फंक्शन
function displayResults(results, totalPagesCount, currentPageNum) {
    const resultContainer = document.querySelector(".result-main-container");
    if (!resultContainer) return;

    let resultsHTML = `
        <div class="results-heading">
            <h4>All Results</h4>
            <p>x</p>
        </div>
    `;

    results.forEach(result => {
        resultsHTML += generateResultHTML(result);
    });

    // पेजिनेशन कंट्रोल्स जोड़ें
    resultsHTML += generatePaginationHTML(currentPageNum, totalPagesCount);

    resultContainer.innerHTML = resultsHTML;
    attachPaginationEvents();
}

// रिजल्ट HTML जनरेट करने का फंक्शन
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
                            `<td class="result-values">${value}</td>`
                        ).join('')}
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// पेजिनेशन HTML जनरेट करने का फंक्शन
function generatePaginationHTML(currentPageNum, totalPagesCount) {
    return `
        <div class="pagination-controls">
        <div id= "pegiBtn">
        <button id="prevPage" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>
                Previous
            </button>
            
            <button id="nextPage" class="pagination-btn" ${currentPageNum === totalPagesCount ? 'disabled' : ''}>
                Next
            </button>
        </div>
            
            <div class="page-numbers">
                ${generatePageNumbers(currentPageNum, totalPagesCount)}
            </div>
        </div>
    `;
}

// पेज नंबर्स जनरेट करने का फंक्शन
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

// पेजिनेशन इवेंट्स अटैच करने का फंक्शन
function attachPaginationEvents() {
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) changePage(currentPage - 1);
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) changePage(currentPage + 1);
    });

    document.querySelectorAll('.page-number').forEach(button => {
        button.addEventListener('click', () => {
            const pageNum = parseInt(button.dataset.page);
            changePage(pageNum);
        });
    });
}

// पेज चेंज करने का फंक्शन
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchAndDisplayResults(page);
}

// सॉकेट इवेंट्स
socket.on("resultsData", (data) => {
    currentPage = data.currentPage;
    totalPages = data.totalPages;
    displayResults(data.results, data.totalPages, data.currentPage);
});

socket.on("newResult", (data) => {
    if (currentPage === 1) {
        currentPage = data.currentPage;
        totalPages = data.totalPages;
        displayResults(data.results, data.totalPages, data.currentPage);
    } else {
        showNewResultNotification();
    }
});

// इनिशियलाइजेशन
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayResults(1);
});

// नया रिजल्ट नोटिफिकेशन
function showNewResultNotification() {
    const notification = document.createElement('div');
    notification.className = 'new-result-notification';
    notification.innerHTML = `
        <p>New result available!</p>
        <button onclick="goToLatestResults()">View Latest</button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// लेटेस्ट रिजल्ट्स पर जाने का फंक्शन
function goToLatestResults() {
    currentPage = 1;
    changePage(1);
}

socket.on("bettingHistoryUpdate", (data) => {
    console.log("📢 बेटिंग हिस्ट्री अपडेट हुई:", data);

    const historyTable = document.querySelector(".result-table2");
    historyTable.innerHTML = `
        <tr id="table-head2">
            <th class="trade-table-heading">No.</th>
            <th class="trade-table-heading">ID</th>
            <th class="trade-table-heading">Trade</th>
            <th class="trade-table-heading">Ammount</th>
            <th class="trade-table-heading">Result</th>
            <th class="trade-table-heading">Multiplier</th>
            <th class="trade-table-heading">Win/Loss</th>
        </tr>
    `;

    let totalBets = data.history.length; // ✅ Total Bets की संख्या निकालें

    data.history.forEach((bet, index) => {
        const newRow = document.createElement("tr");
        newRow.classList.add(bet.winAmount > 0 ? "profit" : "loss");

        newRow.innerHTML = `
            <td class="result-data-table">${totalBets - index}</td> <!-- ✅ Serial Number सही क्रम में -->
            <td class="result-data-table">${bet.gameId}</td>
            <td class="result-data-table">${bet.betNumber.join(", ")}</td>
            <td class="result-data-table">${bet.betAmount} ₹</td>
            <td class="result-data-table">${bet.result}</td>
            <td class="result-data-table">${bet.multiplier}</td>
            <td class="result-data-table">
                ${bet.winAmount > 0 ? 
                `<span style="color: green;">+${bet.winAmount} ₹</span>` : 
                `<span style="color: red;">-${bet.lossAmount} ₹</span>`}
            </td>
        `;

        historyTable.appendChild(newRow); 
    });

    console.log("✅ बेटिंग हिस्ट्री UI पर सही क्रम में अपडेट हो गई!");
});

socket.on("connect", async () => {
    console.log("✅ Connected to server:", socket.id);

    try {
        // कनेक्ट होने पर यूजर आईडी प्राप्त करने का प्रयास करें
        let response = await fetch("/user/getCurrentUser", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            console.error(`❌ फेच अनुरोध असफल: ${response.status} ${response.statusText}`);
            return;
        }

        let userData = await response.json();
        if (userData.success && userData.user && userData.user.id) {
            console.log(`🔗 Joining room for user: ${userData.user.id}`);
            socket.emit("joinRoom", { userId: userData.user.id });
        } else {
            // एक बार फिर प्रयास करें, कुछ सर्वर 'user.id' के बजाय 'userId' प्रदान करते हैं
            const userId = userData.userId || userData.user?.id || userData.user?._id;
            if (userId) {
                console.log(`🔗 Joining room for user (alternative method): ${userId}`);
                socket.emit("joinRoom", { userId });
            } else {
                console.error("❌ Unable to fetch user ID. Response:", userData);
            }
        }
    } catch (error) {
        console.error("❌ Error fetching user data:", error);
    }
});

socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);
});

// टाइमर एलिमेंट्स को एक बार सेलेक्ट करें
const timerMinEl = document.getElementById('timerMin');
const timerSecEl = document.getElementById('timerSec');

// टाइमर अपडेट का इवेंट हैंडलर
socket.on("timerUpdate", (time) => {
    if (!timerMinEl || !timerSecEl) {
        console.error("Timer elements not found!");
        return;
    }

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    
    // टाइमर डिस्प्ले अपडेट करें
    timerMinEl.textContent = minutes < 10 ? "0" + minutes : minutes;
    timerSecEl.textContent = seconds < 10 ? "0" + seconds : seconds;

    // बटन्स को डिसेबल/एनेबल करें
    const buttons = document.querySelectorAll(".box, #low, #high, #submit");
    buttons.forEach(btn => {
        btn.disabled = time <= 30;
    });

     // ⛔ अगर टाइम 30 सेकंड से कम है, तो सलेक्शन क्लियर कर दें
     if (time <= 30) {
        // selectedNumbers array clear करो (agar define kiya gaya ho)
        if (typeof selectedNumbers !== 'undefined') {
            selectedNumbers = [];
        }

        // टेक्स्टबॉक्स क्लियर करो (agar textBox1 define ho)
        if (typeof textBox1 !== 'undefined') {
            textBox1.innerText = "";
        }

        // बटन से selected class हटाओ
        const numberButtons = document.querySelectorAll(".box.selected");
        numberButtons.forEach(button => {
            button.classList.remove("selected");
        });

        // अगर koi updateControls() function hai toh use call करो
        if (typeof updateControls === 'function') {
            updateControls();
        }
    }
});

// सॉकेट कनेक्शन हैंडलिंग
socket.on("connect", () => {
    console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected from server");
});

// बैलेंस अपडेट हैंडलर
socket.on("balanceUpdate", (data) => {
    const balanceElements = document.querySelectorAll(".Left-balance");
    balanceElements.forEach(el => {
        el.innerHTML = `<strong>${data.updatedBalance} ₹</strong>`;
    });
});

// // बटन फ्लिप हैंडलर
// socket.on("flipButtons", (data) => {
//     const buttons = document.querySelectorAll('.box');
//     buttons.forEach((button, index) => {
//         if (data.buttonValues[index]) {
//             button.textContent = data.buttonValues[index];
//         }
//     });
// });

// socket.on("flipButtons", (data) => {
//     flipButtonsAndAssignValues(data.buttonValues);
// });
socket.on("flipButtons", ({ gameId, resultNumber, buttonValues }) => {
    console.log("Flipping buttons with new values:", buttonValues);

    const buttons = document.querySelectorAll('.box');

    buttons.forEach((button, index) => {
        // Agar value available hai tabhi update karo
        if (buttonValues[index]) {

            // Step 1: Flip animation start
            button.classList.add('flipping');

            // Step 2: Animation ke beech value update karo
            setTimeout(() => {
                const multiplier = buttonValues[index];

                // Text and attribute update
                button.textContent = multiplier;
                button.setAttribute('data-multiplier', multiplier);
            }, 300);

            // Step 3: Animation class hatao
            setTimeout(() => {
                button.classList.remove('flipping');
            }, 600);
        }
    });
});

socket.on("updateBetResultsUI", (data) => {
    console.log("🎯 Received Updated Bet Results:", data);
    if (data && data.bets) {
        updateTradePanel(data.bets);
    }
});

let originalButtonValues = [];

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".number-pad .box");
    buttons.forEach((button, index) => {
        originalButtonValues[index] = button.textContent;
    });
});

function flipButtonsAndAssignValues(values) {
    const buttons = document.querySelectorAll(".number-pad .box");

    buttons.forEach((button, index) => {
        if (values[index] !== undefined) {
            button.textContent = values[index];
        }
        button.classList.add("flipped");
    });

    setTimeout(() => {
        buttons.forEach((button, index) => {
            button.textContent = originalButtonValues[index];
            button.classList.remove("flipped");
        });
    }, 5000);
}

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

function initializeSocketEvents() {
    console.log("🔄 Rebinding socket events...");

    // बेहतर त्रुटि हैंडलिंग के साथ इवेंट हैंडलर को फिर से बाइंड करें
    socket.off("finalBetResult");
    socket.on("finalBetResult", (data) => {
        console.log("✅ Final Result Data Received:", data);

        // बेसिक डेटा वैलिडेशन
        if (!data || typeof data !== 'object') {
            console.error("❌ Invalid data received for final result");
            return;
        }

        // लोडिंग आइकन हटाएं
        const loadingIcon = document.getElementById("loading-icon");
        if (loadingIcon) loadingIcon.style.display = "none";
        
        // रिजल्ट एलिमेंट को सेलेक्ट करें
        const finalResultElement = document.getElementById("final-result");
        if (!finalResultElement) {
            console.error("❌ Final result element not found");
            return;
        }
        
        try {
            // वैल्यू माप करें (पहले आने वाली फील्ड पर फॉलबैक करें)
            const overallAmount = parseFloat(data.overall || data.finalResult || 0);
            
            if (isNaN(overallAmount)) {
                console.error("❌ Invalid overall amount received:", data.overall);
                finalResultElement.innerText = "रिजल्ट प्राप्त करने में त्रुटि";
                finalResultElement.style.display = "block";
                finalResultElement.style.color = "#FFA500"; // ऑरेंज
                return;
            }

            let resultText = "";
            
            // Win/Loss/Draw चेक करें और UI अपडेट करें
            if (overallAmount > 0) {
                resultText = `✅ आपने जीता: +${overallAmount.toFixed(2)} ₹`;
                finalResultElement.style.color = "#33CC66"; // ग्रीन कलर
                finalResultElement.classList.remove("loss-animation", "draw-animation");
                finalResultElement.classList.add("win-animation");
            } 
            else if (overallAmount < 0) {
                resultText = `❌ आपने खोया: ${overallAmount.toFixed(2)} ₹`;
                finalResultElement.style.color = "#FF3B30"; // रेड कलर
                finalResultElement.classList.remove("win-animation", "draw-animation");
                finalResultElement.classList.add("loss-animation");
            }
            else {
                // overall = 0 के लिए नया मैसेज
                resultText = `🔄 कोई जीत/हार नहीं: 0.00 ₹`;
                finalResultElement.style.color = "#FFCC00"; // येलो कलर
                finalResultElement.classList.remove("win-animation", "loss-animation");
                finalResultElement.classList.add("draw-animation");
            }

            // रिजल्ट टेक्स्ट और डिस्प्ले अपडेट करें
            finalResultElement.innerText = resultText;
            finalResultElement.style.display = "block";

            // वैकल्पिक फील्ड्स पर फॉलबैक के साथ यूजर बैलेंस अपडेट करें
            const newBalance = data.updatedBalance || data.newBalance;
            if (newBalance !== undefined) {
                updateUserBalance(newBalance);
            }

        } catch (error) {
            console.error("❌ Error processing bet result:", error);
            finalResultElement.innerText = "रिजल्ट प्रोसेस करने में त्रुटि";
            finalResultElement.style.display = "block";
            finalResultElement.style.color = "#FF3B30"; // रेड
        }
    });

    // बाकी के सॉकेट इवेंट्स...
    socket.on("newRoundStarted", () => {
        document.getElementById("no-bet-message").style.display = "block";
        document.getElementById("win-loss").style.display = "block";
        clearResultTable();
    });
    
    socket.on("resetUI", () => {
        console.log("🔄 Resetting UI for new round...");

        // रिजल्ट और लोडिंग एलिमेंट्स रीसेट करें
        const finalResult = document.getElementById("final-result");
        if (finalResult) finalResult.style.display = "none";
        
        const loadingIcon = document.getElementById("loading-icon");
        if (loadingIcon) loadingIcon.style.display = "none";
        
        const winLoss = document.getElementById("win-loss");
        if (winLoss) winLoss.style.display = "block";
        
        const noBetMessage = document.getElementById("no-bet-message");
        if (noBetMessage) noBetMessage.style.display = "block";

        // बटन्स को एनेबल करें
        document.querySelectorAll(".box, #low, #high, #submit").forEach(btn => {
            btn.disabled = false;
        });

        // एक्टिव ट्रेड टेबल को क्लियर करें
        clearTradePanel();
    });
}

// नया फंक्शन एड करें जो ट्रेड पैनल को पूरी तरह से क्लियर करेगा
function clearTradePanel() {
    const table = document.querySelector(".result-table");
    if (table) {
        table.innerHTML = `
            <tr id="table-head" style="display: none;">
                <th class="trade-table-heading">No.</th>
                <th class="trade-table-heading">ID</th>
                <th class="trade-table-heading">Trade</th>
                <th class="trade-table-heading">Amount</th>
                <th class="trade-table-heading">Result</th>
                <th class="trade-table-heading">Win/Loss</th>
            </tr>
        `;
    }

    // "Place bet" मैसेज दिखाएं
    const winLossElement = document.getElementById("win-loss");
    if (winLossElement) {
        winLossElement.textContent = "Place bet";
        winLossElement.style.display = "block";
    }

    // "No bet" मैसेज दिखाएं
    const noBetMessage = document.getElementById("no-bet-message");
    if (noBetMessage) {
        noBetMessage.style.display = "block";
        noBetMessage.textContent = "There is not currently any bet";
    }
}

// मौजूदा clearResultTable फंक्शन को अपडेट करें
function clearResultTable() {
    const table = document.querySelector(".result-table");
    if (table) {
        table.innerHTML = `
            <tr id="table-head">
                <th class="trade-table-heading">No.</th>
                <th class="trade-table-heading">ID</th>
                <th class="trade-table-heading">Trade</th>
                <th class="trade-table-heading">Amount</th>
                <th class="trade-table-heading">Result</th>
                <th class="trade-table-heading">Win/Loss</th>
            </tr>
        `;
    }
}

async function fetchUserBets() {
    try {
        let response = await fetch("/user/userBets", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        let data = await response.json();
        if (data.success) {
            updateTradePanel(data.bets);
        }
    } catch (error) {
        console.error("❌ Error fetching bets:", error);
    }
}

function updateTradePanel(bets) {
    const table = document.querySelector(".result-table");
    const tableHead = document.getElementById("table-head");

    if (!table || !tableHead) {
        console.error("❌ Error: Table or Table Head not found.");
        return;
    }

    if (bets.length > 0) {
        tableHead.style.display = "table-row";
    } else {
        tableHead.style.display = "none";
    }

    table.innerHTML = `
        <tr id="table-head" style="display: ${bets.length > 0 ? "table-row" : "none"};">
            <th class="trade-table-heading">No.</th>
            <th class="trade-table-heading">ID</th>
            <th class="trade-table-heading">Trade</th>
            <th class="trade-table-heading">Amount</th>
            <th class="trade-table-heading">Result</th>
            <th class="trade-table-heading">Win/Loss</th>
        </tr>
    `;

    bets.forEach((bet, index) => {
        const newRow = document.createElement("tr");
        newRow.classList.add(bet.status === "won" ? "profit" : "loss"); // रो का कलर सेट करें

        // रिजल्ट और विन/लॉस कॉलम के लिए कंडीशनल रेंडरिंग
        const resultDisplay = bet.result || `<div id="loader"></div><span>Waiting...</span>`;
        const winLossDisplay = bet.status ? 
            (bet.status === "won" ? 
                `<span style="color: green;">+${bet.payout} ₹</span>` : 
                `<span style="color: red;">-${bet.betAmount} ₹</span>`
            ) : 
            `<div id="loader"></div><span>Waiting...</span>`;

        newRow.innerHTML = `
            <td class="result-data-table">${index + 1}</td>
            <td class="result-data-table">${bet.gameId || "N/A"}</td>
            <td class="result-data-table">${bet.betNumber.join(", ")}</td>
            <td class="result-data-table">${bet.betAmount} ₹</td>
            <td class="result-data-table">${resultDisplay}</td>
            <td class="result-data-table">${winLossDisplay}</td>
        `;
        table.appendChild(newRow);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded: Fetching user bets...");
    fetchUserBets();
});

// यूजर बैलेंस अपडेट करने का फंक्शन
function updateUserBalance(newBalance) {
    const balanceElement = document.getElementById("Left-balance");
    if (balanceElement && !isNaN(newBalance)) {
        balanceElement.innerText = parseFloat(newBalance).toFixed(2);
    }
}

// एनिमेशन के लिए CSS एड करें
const style = document.createElement('style');
style.textContent = `
    .win-animation {
        animation: fadeInScale 0.5s ease-out;
    }

    .loss-animation {
        animation: shake 0.5s ease-in-out;
    }

    .draw-animation {
        animation: pulse 0.5s ease-in-out;
    }

    @keyframes fadeInScale {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

socket.on("flipButtons", async ({ gameId, resultNumber, buttonValues }) => {
    console.log("Flipping buttons with new values:", buttonValues);
    
    const buttons = document.querySelectorAll('.box');
    
    buttons.forEach((button, index) => {
        // फ्लिप एनिमेशन एड करें
        button.classList.add('flipping');
        
        // एनिमेशन के दौरान वैल्यू अपडेट करें
        setTimeout(() => {
            const multiplier = buttonValues[index];
            // सिर्फ मल्टीप्लायर वैल्यू दिखाएं, एक्स्ट्रा 'x' न जोड़ें
            button.textContent = multiplier;
            
            // डेटा एट्रिब्यूट के लिए मल्टीप्लायर वैल्यू का उपयोग करें
            button.setAttribute('data-multiplier', multiplier);
        }, 300);
        
        // एनिमेशन क्लास रिमूव करें
        setTimeout(() => {
            button.classList.remove('flipping');
        }, 600);
    });
});

// रीसेट UI पर बटन्स को ओरिजिनल स्टेट में वापस लाएं
socket.on("resetUI", () => {
    const buttons = document.querySelectorAll('.box');
    buttons.forEach((button, index) => {
        button.textContent = index + 1;
        button.removeAttribute('data-multiplier');
    });
});
