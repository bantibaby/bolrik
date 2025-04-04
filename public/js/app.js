// const buttons = document.querySelectorAll('.box');
// const textBox1 = document.getElementById('text-box1');
// const removeButton = document.getElementById('remove');
// const betAmountEl = document.getElementById("bet-amount");
// const lowBtn = document.getElementById("low");
// const highBtn = document.getElementById("high");
// const submitBtn = document.getElementById("submit");
// const leftBalanceEl = document.querySelector(".Left-balance");
// // const leftBalanceEl = document.getElementById("Left-balance");
// const table = document.querySelector(".result-table");


// // const table2 = document.querySelector("#tables2");


// let selectedNumbers = [];
// let betAmount = 10;

// // ✅ Update Controls Function
// function updateControls() {
//     const enable = selectedNumbers.length === 3;
//     submitBtn.disabled = !enable;
//     submitBtn.style.opacity = enable ? 1 : 0.5;
// }
// updateControls();

// // ✅ Highlight & Remove Highlight
// function highlightButton(number) {
//     buttons.forEach(btn => {
//         if (btn.textContent === number) btn.classList.add("selected");
//     });
// }
// // function removeHighlight(number) {
// //     buttons.forEach(btn => {
// //         if (btn.textContent === number) btn.classList.remove("selected");
// //     });
// // }
// function removeHighlight(number) {
//     console.log("Removing highlight from:", number);
//     buttons.forEach(btn => {
//         if (btn.textContent.trim() === number) {
//             console.log("Found button:", btn.textContent);
//             btn.classList.remove("selected");
//         }
//     });
// }

// // ✅ Number Selection
// // buttons.forEach(button => {
// //     button.addEventListener("click", () => {
// //         if (selectedNumbers.length < 3 && !selectedNumbers.includes(button.textContent)) {
// //             selectedNumbers.push(button.textContent);
// //             textBox1.innerText = selectedNumbers.join(",");
// //             highlightButton(button.textContent);
// //         }
// //         updateControls();
// //     });
// // });
// buttons.forEach(button => {
//     button.addEventListener("click", () => {
//         const number = button.textContent.trim();
//         console.log("Clicked:", number);
//         console.log("Already selected?", selectedNumbers.includes(number));
//         console.log("Selected Numbers Before:", selectedNumbers);

//         if (selectedNumbers.includes(number)) {
//             selectedNumbers = selectedNumbers.filter(num => num !== number);
//             removeHighlight(number);
//         } else if (selectedNumbers.length < 3) {
//             selectedNumbers.push(number);
//             highlightButton(number);
//         }

//         textBox1.innerText = selectedNumbers.join(",");
//         updateControls();

//         console.log("Selected Numbers After:", selectedNumbers);
//     });
// });

// // ✅ Remove Selected Number
// removeButton.addEventListener("click", () => {
//     if (selectedNumbers.length > 0) {
//         const removed = selectedNumbers.pop();
//         textBox1.innerText = selectedNumbers.join(",");
//         removeHighlight(removed);
//     }
//     updateControls();
// });




// // ✅ Increase & Decrease Bet Amount
// highBtn.addEventListener("click", () => {
//     betAmount += 10;
//     betAmountEl.innerText = betAmount + " ₹";
// });
// lowBtn.addEventListener("click", () => {
//     if (betAmount > 10) {
//         betAmount -= 10;
//         betAmountEl.innerText = betAmount + " ₹";
//     }
// });

// submitBtn.addEventListener("click", async () => {
//     if (selectedNumbers.length !== 3) {
//         alert("⚠️ Please select exactly 3 numbers before submitting.");
//         return;
//     }

//     try {
//         // बेट प्लेस करने के पहले सबमिट बटन को अपडेट करें
//         submitBtn.disabled = true;
//         submitBtn.innerHTML = '<div class="btn-loader"></div> wait...';
//         submitBtn.style.backgroundColor = "#aaa";

//         let responseUser = await fetch("/user/getCurrentUser", {
//             method: "GET",
//             credentials: "include",
//             headers: { "Content-Type": "application/json" },
//         });

//         let userData = await responseUser.json();
//         if (!userData.success || !userData.userId) {
//             alert("❌ User not logged in! Please log in to place a bet.");
//             resetSubmitButton();
//             return;
//         }

//         let userId = userData.userId;
//         let currentBalance = userData.balance.pending || 0;

//         if (currentBalance < betAmount) {
//             alert("❌ Insufficient balance! Please add funds.");
//             resetSubmitButton();
//             return;
//         }

//         let newBalance = currentBalance - betAmount;

//         let bet = {
//             userId,
//             betNumber: selectedNumbers.map(Number),
//             betAmount: betAmount
//         };

//         document.getElementById("win-loss").style.display = "none";
//         document.getElementById("no-bet-message").style.display = "none";
//         document.getElementById("loading-icon").style.display = "block";

//         // ✅ Send Bet Request to Server
//         let responseBet = await fetch("/user/placeBet", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             credentials: "include",
//             body: JSON.stringify(bet)
//         });

//         let betData = await responseBet.json();
//         console.log("🔹 Bet Response:", betData);

//         if (!betData.success) {
//             alert("❌ Bet Placement Failed: " + betData.message);
//             resetSubmitButton();
//             return;
//         }

//         if (!betData.bet.gameId) {
//             console.error("❌ Error: gameId is missing from response!");
//             resetSubmitButton();
//         } else {
//             console.log("✅ gameId received:", betData.bet.gameId);
//         }

//         const table = document.querySelector(".result-table");
//         const tableHead = document.getElementById("table-head");

//         const newRow = document.createElement("tr");
//         tableHead.style.display = "table-row";
//         newRow.innerHTML = `
//             <td class="result-data-table">${table.rows.length}</td>
//             <td class="result-data-table">${betData.bet.gameId || "N/A"}</td>
//             <td class="result-data-table">${betData.bet.betNumber.join(", ")}</td>
//             <td class="result-data-table">${betData.bet.betAmount} ₹</td>
//             <td class="result-data-table">
//             <div id="loader"></div></td>
//             <td class="result-data-table">wait...</td>
//         `;
//         table.appendChild(newRow);

//         // ✅ बेट सफलतापूर्वक प्लेस होने पर अतिरिक्त फीडबैक
//         showSuccessToast("✅ success: " + betData.bet.betAmount + " ₹ Bet is successfully places");
        
//         // ✅ साइड में ट्रेड पैनल की तरफ स्क्रॉल करें
//         smoothScrollToTradePanel();
        
//         // ✅ बेट प्लेस होने पर ट्रेड पैनल को हाइलाइट करें
//         highlightTradePanel();

//         console.log("✅ Bet successfully placed and displayed on UI.");

//         // ✅ सभी सेलेक्ट किए गए नंबर हटाएं (Reset Selected Numbers)
//         selectedNumbers = [];
//         textBox1.innerText = "";
//         document.querySelectorAll(".box").forEach(button => button.classList.remove("selected")); // हाइलाइट हटाए
        
//         // ✅ सबमिट बटन रीसेट करें
//         resetSubmitButton();
        
//         // ✅ बेट अमाउंट रीसेट करें
//         betAmount = 10;
//         betAmountEl.innerText = betAmount + " ₹";

//     } catch (error) {
//         alert("❌ Server error! Please try again.");
//         resetSubmitButton();
//     }
// });

// // सबमिट बटन को रीसेट करने का फंक्शन
// function resetSubmitButton() {
//     submitBtn.disabled = false;
//     submitBtn.innerHTML = "Submit";
//     submitBtn.style.backgroundColor = "";
//     updateControls();
// }

// // सफलता मैसेज दिखाने के लिए टोस्ट
// function showSuccessToast(message) {
//     // पहले से मौजूद टोस्ट को हटाएं
//     const existingToast = document.querySelector('.bet-toast');
//     if (existingToast) {
//         existingToast.remove();
//     }
    
//     // नया टोस्ट बनाएं
//     const toast = document.createElement('div');
//     toast.className = 'bet-toast success-toast';
//     toast.innerHTML = `
//         <div class="toast-icon">✅</div>
//         <div class="toast-message">${message}</div>
//         <div class="toast-progress"></div>
//     `;
    
//     document.body.appendChild(toast);
    
//     // टोस्ट को दिखाएं
//     setTimeout(() => {
//         toast.classList.add('show-toast');
//     }, 100);
    
//     // 5 सेकंड के बाद टोस्ट हटा दें
//     setTimeout(() => {
//         toast.classList.remove('show-toast');
//         setTimeout(() => {
//             toast.remove();
//         }, 500);
//     }, 5000);
// }

// // ट्रेड पैनल तक स्मूथ स्क्रॉल करने का फंक्शन
// function smoothScrollToTradePanel() {
//     const tradePanel = document.querySelector('.trading-panel');
//     if (tradePanel) {
//         tradePanel.scrollIntoView({
//             behavior: 'smooth',
//             block: 'start'
//         });
//     }
// }

// // ट्रेड पैनल को हाइलाइट करने का फंक्शन
// function highlightTradePanel() {
//     const tradePanel = document.querySelector('.trading-panel');
//     if (tradePanel) {
//         // पहले से मौजूद हाइलाइट क्लास को हटाएं
//         tradePanel.classList.remove('highlight-panel');
        
//         // फिर से हाइलाइट करने के लिए
//         void tradePanel.offsetWidth; // रीफ्लो ट्रिगर करें
        
//         // हाइलाइट क्लास जोड़ें
//         tradePanel.classList.add('highlight-panel');
        
//         // कुछ सेकंड बाद हाइलाइट हटा दें
//         setTimeout(() => {
//             tradePanel.classList.remove('highlight-panel');
//         }, 3000);
//     }
// }

// // बेट लोडर के लिए CSS जोड़ें
// document.addEventListener('DOMContentLoaded', function() {
//     // डायनामिक CSS स्टाइल शीट जोड़ें
//     const style = document.createElement('style');
//     style.textContent = `
//         .btn-loader {
//             display: inline-block;
//             width: 15px;
//             height: 15px;
//             border: 2px solid rgba(255, 255, 255, 0.3);
//             border-radius: 50%;
//             border-top-color: #fff;
//             animation: spin 1s ease-in-out infinite;
//             margin-right: 8px;
//             vertical-align: middle;
//         }
        
//         @keyframes spin {
//             to { transform: rotate(360deg); }
//         }
        
//         .bet-toast {
//             position: fixed;
//             bottom: 30px;
//             left: 50%;
//             transform: translateX(-50%) translateY(100px);
//             background: rgba(0, 0, 0, 0.8);
//             color: white;
//             padding: 15px 20px;
//             border-radius: 8px;
//             box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
//             display: flex;
//             align-items: center;
//             z-index: 9999;
//             transition: transform 0.5s ease;
//             max-width: 90%;
//         }
        
//         .bet-toast.show-toast {
//             transform: translateX(-50%) translateY(0);
//         }
        
//         .success-toast {
//             border-left: 5px solid #4CAF50;
//         }
        
//         .toast-icon {
//             font-size: 24px;
//             margin-right: 10px;
//         }
        
//         .toast-message {
//             flex: 1;
//             font-size: 16px;
//         }
        
//         .toast-progress {
//             position: absolute;
//             bottom: 0;
//             left: 0;
//             height: 4px;
//             background: #4CAF50;
//             width: 100%;
//             animation: progress 5s linear forwards;
//         }
        
//         @keyframes progress {
//             0% { width: 100%; }
//             100% { width: 0%; }
//         }
        
//         .highlight-panel {
//             animation: highlight-glow 0.5s ease-in-out 6 alternate;
//         }
        
//         @keyframes highlight-glow {
//             0% { box-shadow: 0 0 5px rgba(255, 204, 34, 0.5); }
//             100% { box-shadow: 0 0 20px rgba(255, 204, 34, 1), 0 0 30px rgba(255, 204, 34, 0.5); }
//         }
//     `;
//     document.head.appendChild(style);
// });
// // Rules Pop-up Functionality
// document.addEventListener('DOMContentLoaded', function() {
//     const rulesLink = document.getElementById('rules');
//     const rulesPopup = document.getElementById('rules-popup');
//     const closeRules = document.querySelector('.close-rules');

//     // Rules लिंक पर क्लिक इवेंट
//     rulesLink.addEventListener('click', function(e) {
//         e.preventDefault(); // पेज रीडायरेक्ट रोकें
//         rulesPopup.style.display = 'block';
//     });

//     // Close बटन पर क्लिक इवेंट
//     closeRules.addEventListener('click', function() {
//         rulesPopup.style.display = 'none';
//     });

//     // पॉप-अप के बाहर क्लिक करने पर बंद करें
//     window.addEventListener('click', function(e) {
//         if (e.target === rulesPopup) {
//             rulesPopup.style.display = 'none';
//         }
//     });

//     // Escape की दबाने पर बंद करें
//     document.addEventListener('keydown', function(e) {
//         if (e.key === 'Escape' && rulesPopup.style.display === 'block') {
//             rulesPopup.style.display = 'none';
//         }
//     });
// });


// // Referral Pop-up Functionality
// document.addEventListener('DOMContentLoaded', function() {
//     const refBtn = document.getElementById('ref-btn');
//     const referralPopup = document.getElementById('referral-popup');
//     const closeReferral = document.querySelector('.close-referral');
//     const copyBtn = document.getElementById('copyRefLink');
//     const refLink = document.getElementById('refLink');
//     const copyMessage = document.getElementById('copyMessage');

//     // रेफरल लिंक पर क्लिक इवेंट
//     refBtn.addEventListener('click', function(e) {
//         e.preventDefault();
//         referralPopup.style.display = 'block';
//     });

//     // Close बटन पर क्लिक इवेंट
//     closeReferral.addEventListener('click', function() {
//         referralPopup.style.display = 'none';
//     });

//     // कॉपी बटन फंक्शनैलिटी
//     copyBtn.addEventListener('click', async function() {
//         try {
//             await navigator.clipboard.writeText(refLink.value);
//             copyMessage.style.display = 'block';
//             copyBtn.style.background = '#00FF00';
            
//             setTimeout(() => {
//                 copyMessage.style.display = 'none';
//                 copyBtn.style.background = '#FFCC00';
//             }, 2000);
//         } catch (err) {
//             console.error('Failed to copy text: ', err);
//         }
//     });

//     // पॉप-अप के बाहर क्लिक करने पर बंद करें
//     window.addEventListener('click', function(e) {
//         if (e.target === referralPopup) {
//             referralPopup.style.display = 'none';
//         }
//     });

//     // Escape की दबाने पर बंद करें
//     document.addEventListener('keydown', function(e) {
//         if (e.key === 'Escape' && referralPopup.style.display === 'block') {
//             referralPopup.style.display = 'none';
//         }
//     });
// });


// ✅ DOM Element References
const buttons = document.querySelectorAll('.box');
const textBox1 = document.getElementById('text-box1');
const removeButton = document.getElementById('remove');
const betAmountEl = document.getElementById("bet-amount");
const lowBtn = document.getElementById("low");
const highBtn = document.getElementById("high");
const submitBtn = document.getElementById("submit");
const leftBalanceEl = document.querySelector(".Left-balance");
const table = document.querySelector(".result-table");

let selectedNumbers = [];
let betAmount = 10;

// ✅ Update Submit Button State
function updateControls() {
    const enable = selectedNumbers.length === 3;
    submitBtn.disabled = !enable;
    submitBtn.style.opacity = enable ? 1 : 0.5;
}
updateControls();

// ✅ Button Highlight/Remove
function highlightButton(number) {
    buttons.forEach(btn => {
        if (btn.textContent.trim() === number) btn.classList.add("selected");
    });
}

function removeHighlight(number) {
    buttons.forEach(btn => {
        if (btn.textContent.trim() === number) btn.classList.remove("selected");
    });
}

// ✅ Number Selection Handler
buttons.forEach(button => {
    button.addEventListener("click", () => {
        const number = button.textContent.trim();
        if (selectedNumbers.includes(number)) {
            selectedNumbers = selectedNumbers.filter(num => num !== number);
            removeHighlight(number);
        } else if (selectedNumbers.length < 3) {
            selectedNumbers.push(number);
            highlightButton(number);
        }
        textBox1.innerText = selectedNumbers.join(",");
        updateControls();
    });
});

// ✅ Remove Last Selected Number
removeButton.addEventListener("click", () => {
    if (selectedNumbers.length > 0) {
        const removed = selectedNumbers.pop();
        removeHighlight(removed);
        textBox1.innerText = selectedNumbers.join(",");
    }
    updateControls();
});

// ✅ Bet Amount Control
highBtn.addEventListener("click", () => {
    betAmount += 10;
    betAmountEl.innerText = betAmount + " ₹";
});
lowBtn.addEventListener("click", () => {
    if (betAmount > 10) {
        betAmount -= 10;
        betAmountEl.innerText = betAmount + " ₹";
    }
});

// ✅ Submit Bet
submitBtn.addEventListener("click", async () => {
    if (selectedNumbers.length !== 3) {
        alert("⚠️ Please select exactly 3 numbers before submitting.");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="btn-loader"></div> wait...';
        submitBtn.style.backgroundColor = "#aaa";

        const responseUser = await fetch("/user/getCurrentUser", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        const userData = await responseUser.json();
        if (!userData.success || !userData.userId) {
            alert("❌ User not logged in!");
            resetSubmitButton();
            return;
        }

        const userId = userData.userId;
        const currentBalance = userData.balance?.pending || 0;

        if (currentBalance < betAmount) {
            alert("❌ Insufficient balance!");
            resetSubmitButton();
            return;
        }

        const bet = {
            userId,
            betNumber: selectedNumbers.map(Number),
            betAmount
        };

        document.getElementById("win-loss").style.display = "none";
        document.getElementById("no-bet-message").style.display = "none";
        document.getElementById("loading-icon").style.display = "block";

        const responseBet = await fetch("/user/placeBet", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bet)
        });

        const betData = await responseBet.json();
        if (!betData.success) {
            alert("❌ Bet Placement Failed: " + betData.message);
            resetSubmitButton();
            return;
        }

        const newRow = document.createElement("tr");
        document.getElementById("table-head").style.display = "table-row";
        newRow.innerHTML = `
            <td class="result-data-table">${table.rows.length}</td>
            <td class="result-data-table">${betData.bet.gameId || "N/A"}</td>
            <td class="result-data-table">${betData.bet.betNumber.join(", ")}</td>
            <td class="result-data-table">${betData.bet.betAmount} ₹</td>
            <td class="result-data-table"><div id="loader"></div></td>
            <td class="result-data-table">wait...</td>
        `;
        table.appendChild(newRow);

        showSuccessToast(`✅ success: ${betData.bet.betAmount} ₹ Bet successfully placed`);
        smoothScrollToTradePanel();
        highlightTradePanel();

        // Reset
        selectedNumbers = [];
        textBox1.innerText = "";
        document.querySelectorAll(".box").forEach(button => button.classList.remove("selected"));
        betAmount = 10;
        betAmountEl.innerText = betAmount + " ₹";

        resetSubmitButton();

    } catch (err) {
        alert("❌ Server error! Try again.");
        resetSubmitButton();
    }
});

function resetSubmitButton() {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit";
    submitBtn.style.backgroundColor = "";
    updateControls();
}

// ✅ Toast Message
function showSuccessToast(message) {
    const existingToast = document.querySelector('.bet-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'bet-toast success-toast';
    toast.innerHTML = `
        <div class="toast-icon">✅</div>
        <div class="toast-message">${message}</div>
        <div class="toast-progress"></div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show-toast'), 100);
    setTimeout(() => {
        toast.classList.remove('show-toast');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// ✅ Scroll to Trade Panel
function smoothScrollToTradePanel() {
    const tradePanel = document.querySelector('.trading-panel');
    if (tradePanel) {
        tradePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ✅ Highlight Trade Panel
function highlightTradePanel() {
    const tradePanel = document.querySelector('.trading-panel');
    if (tradePanel) {
        tradePanel.classList.remove('highlight-panel');
        void tradePanel.offsetWidth; // Reflow
        tradePanel.classList.add('highlight-panel');
        setTimeout(() => tradePanel.classList.remove('highlight-panel'), 3000);
    }
}

// ✅ Dynamic Style Injection (Button Loader, Toasts)
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .btn-loader {
            display: inline-block;
            width: 15px;
            height: 15px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .bet-toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            z-index: 9999;
            transition: transform 0.5s ease;
            max-width: 90%;
        }

        .bet-toast.show-toast {
            transform: translateX(-50%) translateY(0);
        }

        .success-toast { border-left: 5px solid #4CAF50; }
        .toast-icon { font-size: 24px; margin-right: 10px; }
        .toast-message { flex: 1; font-size: 16px; }
        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            background: #4CAF50;
            width: 100%;
            animation: progress 5s linear forwards;
        }

        @keyframes progress { 0% { width: 100%; } 100% { width: 0%; } }

        .highlight-panel {
            animation: highlight-glow 0.5s ease-in-out 6 alternate;
        }

        @keyframes highlight-glow {
            0% { box-shadow: 0 0 5px rgba(255,204,34,0.5); }
            100% { box-shadow: 0 0 20px rgba(255,204,34,1), 0 0 30px rgba(255,204,34,0.5); }
        }
    `;
    document.head.appendChild(style);
});

// ✅ Rules & Referral Popup Logic
document.addEventListener('DOMContentLoaded', () => {
    // Rules
    const rulesLink = document.getElementById('rules');
    const rulesPopup = document.getElementById('rules-popup');
    const closeRules = document.querySelector('.close-rules');
    rulesLink?.addEventListener('click', e => {
        e.preventDefault();
        rulesPopup.style.display = 'block';
    });
    closeRules?.addEventListener('click', () => rulesPopup.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === rulesPopup) rulesPopup.style.display = 'none'; });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && rulesPopup.style.display === 'block') rulesPopup.style.display = 'none';
    });

    // Referral
    const refBtn = document.getElementById('ref-btn');
    const referralPopup = document.getElementById('referral-popup');
    const closeReferral = document.querySelector('.close-referral');
    const copyBtn = document.getElementById('copyRefLink');
    const refLink = document.getElementById('refLink');
    const copyMessage = document.getElementById('copyMessage');

    refBtn?.addEventListener('click', e => {
        e.preventDefault();
        referralPopup.style.display = 'block';
    });
    closeReferral?.addEventListener('click', () => referralPopup.style.display = 'none');
    copyBtn?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(refLink.value);
            copyMessage.style.display = 'block';
            copyBtn.style.background = '#00FF00';
            setTimeout(() => {
                copyMessage.style.display = 'none';
                copyBtn.style.background = '#FFCC00';
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    });
    window.addEventListener('click', e => { if (e.target === referralPopup) referralPopup.style.display = 'none'; });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && referralPopup.style.display === 'block') referralPopup.style.display = 'none';
    });
});
