// // ✅ Bank Details Functions
// function showBankForm() {
//     document.getElementById("bankForm").style.display = "block";
// }

// function saveBankDetails() {
//     const bankData = {
//         bankName: document.getElementById("newBankName").value,
//         accountNumber: document.getElementById("newAccountNumber").value,
//         ifsc: document.getElementById("newIfsc").value
//     };

//     fetch("/user/updateBank", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(bankData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }

// function enableEdit(field) {
//     document.getElementById(field).disabled = false;
//     document.getElementById("updateBankBtn").disabled = false;
//     document.getElementById(field).style.border = "2px solid #ffcc22";
//     document.getElementById(field).inputMode.codePointAt;

// }

// function updateBankDetails() {
//     const bankData = {
//         bankName: document.getElementById("bankName").value,
//         accountNumber: document.getElementById("accountNumber").value,
//         ifsc: document.getElementById("ifsc").value
//     };

//     fetch("/user/updateBank", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(bankData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }

// // ✅ UPI Details Functions
// function showUpiForm() {
//     document.getElementById("upiForm").style.display = "block";

// }

// function saveUpiDetails() {
//     const upiData = { upiId: document.getElementById("newUpiId").value };

//     fetch("/user/updateUpi", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(upiData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }

// function enableUpiEdit() {
//     document.getElementById("editUpiId").style.display = "block";
//     document.getElementById("upiId").style.display = "none";
//     document.getElementById("updateUpiBtn").disabled = false;
//     document.getElementById("editUpiId").style.border = "2px solid #ffcc22"; 

// }

// function updateUpiDetails() {
//     const upiData = { upiId: document.getElementById("editUpiId").value };

//     fetch("/user/updateUpi", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(upiData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }


// ✅ Bank Details Functions
// function showBankForm() {
//     document.getElementById("bankForm").style.display = "block";
// }


// function saveBankDetails() {
//     const bankData = {
//         bankName: document.getElementById("newBankName").value,
//         accountNumber: document.getElementById("newAccountNumber").value,
//         ifsc: document.getElementById("newIfsc").value
//     };


//     fetch("/user/updateBank", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(bankData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }


// function enableEdit(field) {
//     document.getElementById(field).disabled = false;
//     document.getElementById("updateBankBtn").disabled = false;
//     document.getElementById(field).style.border = "2px solid #ffcc22";
//     document.getElementById(field).inputMode.codePointAt;


// }


// function updateBankDetails() {
//     const bankData = {
//         bankName: document.getElementById("bankName").value,
//         accountNumber: document.getElementById("accountNumber").value,
//         ifsc: document.getElementById("ifsc").value
//     };


//     fetch("/user/updateBank", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(bankData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }


// // ✅ UPI Details Functions
// function showUpiForm() {
//     document.getElementById("upiForm").style.display = "block";


// }


// function saveUpiDetails() {
//     const upiData = { upiId: document.getElementById("newUpiId").value };


//     fetch("/user/updateUpi", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(upiData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }


// function enableUpiEdit() {
//     document.getElementById("editUpiId").style.display = "block";
//     document.getElementById("upiId").style.display = "none";
//     document.getElementById("updateUpiBtn").disabled = false;
//     document.getElementById("editUpiId").style.border = "2px solid #ffcc22";


// }


// function updateUpiDetails() {
//     const upiData = { upiId: document.getElementById("editUpiId").value };


//     fetch("/user/updateUpi", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(upiData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => console.error(err));
// }


// // ✅ Paytm Details Functions
// function showPaytmForm() {
//     document.getElementById("paytmForm").style.display = "block";
// }
               
// function savePaytmDetails() {
//     const paytmData = { paytmNumber: document.getElementById("newPaytmNumber").value };

//     fetch("/user/updatePaytm", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(paytmData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => {
//         console.error(err);
//         alert("Error: " + (err.message || "Failed to update Paytm details"));
//     });
// }

// function enablePaytmEdit() {
//     document.getElementById("editPaytmNumber").style.display = "block";
//     document.getElementById("paytmNumber").style.display = "none";
//     document.getElementById("updatePaytmBtn").disabled = false;
//     document.getElementById("editPaytmNumber").style.border = "2px solid #ffcc22";
// }

// function updatePaytmDetails() {
//     const paytmData = { paytmNumber: document.getElementById("editPaytmNumber").value };
   
//     fetch("/user/updatePaytm", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(paytmData)
//     }).then(res => res.json()).then(data => {
//         alert(data.message);
//         location.reload();
//     }).catch(err => {
//         console.error(err);
//         alert("Error: " + (err.message || "Failed to update Paytm details"));
//     });
// }


// ✅ Referral Functions - Merged from referral.js
document.addEventListener('DOMContentLoaded', function() {
    // Existing event listener for copy button
    const copyBtn = document.getElementById('copyRefLink');
    if (copyBtn) {
        const refLink = document.getElementById('refLink');
        const copyMessage = document.getElementById('copyMessage');


        copyBtn.addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText(refLink.value);
                copyMessage.style.display = 'block';
                copyBtn.classList.add('copied');
               
                setTimeout(() => {
                    copyMessage.style.display = 'none';
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    }


    // Load user data and referral information
    fetchUserData();
    loadDetailedReferralData();
});


// Fetch user data
async function fetchUserData() {
    try {
        const response = await fetch("/user/getCurrentUser", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        console.log("Data received from API:", data);
       
        if (data.success) {
            // Update referral stats
            const totalReferred = Array.isArray(data.referredUsers) ? data.referredUsers.length : 0;
            const referralEarnings = data.referralEarnings || 0;
           
            console.log("Updating stats:", { totalReferred, referralEarnings });
           
            const totalReferredElement = document.getElementById("totalReferred");
            const referralEarningsElement = document.getElementById("referralEarnings");
           
            if (totalReferredElement) {
                totalReferredElement.textContent = totalReferred;
                console.log("totalReferred updated:", totalReferred);
            } else {
                console.error("Element with ID 'totalReferred' not found");
            }
           
            if (referralEarningsElement) {
                referralEarningsElement.innerHTML = `${referralEarnings} <span class="currency">₹</span>`;
                console.log("referralEarnings updated:", referralEarnings);
            } else {
                console.error("Element with ID 'referralEarnings' not found");
            }
           
            // Do NOT render referral users here!
            // Only loadDetailedReferralData should update the referral table.
        } else {
            console.error("Error fetching user data:", data.error);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}


// Function to display referred users list
function renderReferredUsers(users) {
    const referralUsersList = document.getElementById('referralUsersList');
    if (!referralUsersList) {
        console.error("Element with ID 'referralUsersList' not found");
        return;
    }
   
    referralUsersList.innerHTML = '';

    const referralUsersSection = document.getElementById("referralUsersSection");
    const referralUsersLoading = document.getElementById("referralUsersLoading");
    const noReferralsMsg = document.getElementById("noReferralsMsg");
    const referralTableContainer = document.getElementById("referralTableContainer");
   
    if (!referralUsersSection || !referralUsersLoading || !noReferralsMsg || !referralTableContainer) {
        console.error("One or more required referral UI elements not found");
        return;
    }

    if (!users || users.length === 0) {
        referralUsersLoading.style.display = 'none';
        noReferralsMsg.style.display = 'block';
        referralTableContainer.style.display = 'none';
        return;
    }

    referralUsersLoading.style.display = 'none';
    noReferralsMsg.style.display = 'none';
    referralTableContainer.style.display = 'block';

    users.forEach((user) => {
        const row = document.createElement('tr');
        
        // Format values more concisely for mobile
        // Format deposit amount (shorter format)
        let depositAmount = user.depositAmount !== undefined && user.depositAmount !== null ?
            `₹${user.depositAmount}` : '₹0';
            
        // Format your bonus (shorter format)
        let yourBonus = user.yourBonus !== undefined && user.yourBonus !== null ?
            `₹${user.yourBonus}` : '₹0';
            
        // Status
        let statusClass = 'status-pending';
        let statusText = user.status || 'Pending';
        if (statusText === 'Active') statusClass = 'status-success';
        else if (statusText === 'Processing') statusClass = 'status-processing';
        else if (statusText === 'Rejected') statusClass = 'status-rejected';

        // Determine neon light colors based on deposit status
        const isDepositApproved = user.status === 'Active' || user.status === 'Approved';
        const yourBonusNeonClass = isDepositApproved ? 'neon-green' : 'neon-red';

        // Get short name (first name only or truncate if too long)
        const fullname = user.fullname || 'Unknown';
        const shortName = fullname.split(' ')[0];
        const displayName = shortName.length > 8 ? shortName.substring(0, 7) + '...' : shortName;

        row.innerHTML = `
            <td>${displayName}</td>
            <td>${depositAmount}</td>
            <td>
                <div class="status-indicator">
                    <span class="neon-light ${yourBonusNeonClass}"></span>
                    <span class="status-text">${yourBonus}</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        referralUsersList.appendChild(row);
    });
}


// Update stats display if additional stats are provided
function updateReferralStats(stats) {
    const totalReferredElement = document.getElementById("totalReferred");
    const referralEarningsElement = document.getElementById("referralEarnings");
   
    if (totalReferredElement && stats.totalReferrals !== undefined) {
        totalReferredElement.textContent = stats.totalReferrals;
    }
   
    if (referralEarningsElement && stats.totalEarnings !== undefined) {
        referralEarningsElement.innerHTML = `${stats.totalEarnings} <span class="currency">₹</span>`;
    }
}


// API से विस्तृत रेफरल डेटा लोड करें
async function loadDetailedReferralData() {
    try {
        const referralUsersSection = document.getElementById("referralUsersSection");
        if (!referralUsersSection) {
            console.error("Element with ID 'referralUsersSection' not found");
            return;
        }
       
        const referralUsersLoading = document.getElementById("referralUsersLoading");
        const noReferralsMsg = document.getElementById("noReferralsMsg");
        const referralTableContainer = document.getElementById("referralTableContainer");
       
        if (!referralUsersLoading || !noReferralsMsg || !referralTableContainer) {
            console.error("One or more required referral UI elements not found");
            return;
        }
       
        referralUsersSection.style.display = "block";
        referralUsersLoading.style.display = "block";
        noReferralsMsg.style.display = "none";
        referralTableContainer.style.display = "none";
       
        const response = await fetch("/user/getReferralDetails", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
       
        const data = await response.json();
       
        if (data.success) {
            renderReferredUsers(data.referredUsers);
            
            // Update total earnings if available
            if (data.totalEarnings !== undefined) {
                const referralEarningsElement = document.getElementById("referralEarnings");
                if (referralEarningsElement) {
                    referralEarningsElement.innerHTML = `${data.totalEarnings} <span class="currency">₹</span>`;
                    console.log("Total earnings updated from detailed data:", data.totalEarnings);
                }
            }
        } else {
            console.error("Error fetching referral data:", data.error);
           
            if (referralUsersLoading) referralUsersLoading.style.display = "none";
            if (noReferralsMsg) {
                noReferralsMsg.textContent = "रेफरल डेटा लोड करने में त्रुटि हुई।";
                noReferralsMsg.style.display = "block";
            }
        }
    } catch (error) {
        console.error("Error loading referral data:", error);
       
        const referralUsersLoading = document.getElementById("referralUsersLoading");
        const noReferralsMsg = document.getElementById("noReferralsMsg");
       
        if (referralUsersLoading) referralUsersLoading.style.display = "none";
        if (noReferralsMsg) {
            noReferralsMsg.textContent = "रेफरल डेटा लोड करने में त्रुटि हुई।";
            noReferralsMsg.style.display = "block";
        }
    }
}


// ✅ Paytm Details Functions
function showPaytmForm() {
    document.getElementById("paytmForm").style.display = "block";
}

function savePaytmDetails() {
    const paytmData = { paytmNumber: document.getElementById("newPaytmNumber").value };

    fetch("/user/updatePaytm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paytmData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => {
        console.error(err);
        alert("Error: " + (err.message || "Failed to update Paytm details"));
    });
}

function enablePaytmEdit() {
    document.getElementById("editPaytmNumber").style.display = "block";
    document.getElementById("paytmNumber").style.display = "none";
    document.getElementById("updatePaytmBtn").disabled = false;
    document.getElementById("editPaytmNumber").style.border = "2px solid #ffcc22";
}

function updatePaytmDetails() {
    const paytmData = { paytmNumber: document.getElementById("editPaytmNumber").value };

    fetch("/user/updatePaytm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paytmData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => {
        console.error(err);
        alert("Error: " + (err.message || "Failed to update Paytm details"));
    });
}



