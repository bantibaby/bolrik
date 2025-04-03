// ✅ Bank Details Functions
function showBankForm() {
    document.getElementById("bankForm").style.display = "block";
}

function saveBankDetails() {
    const bankData = {
        bankName: document.getElementById("newBankName").value,
        accountNumber: document.getElementById("newAccountNumber").value,
        ifsc: document.getElementById("newIfsc").value
    };

    fetch("/user/updateBank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => console.error(err));
}

function enableEdit(field) {
    document.getElementById(field).disabled = false;
    document.getElementById("updateBankBtn").disabled = false;
    document.getElementById(field).style.border = "2px solid #ffcc22";
    document.getElementById(field).inputMode.codePointAt;

}

function updateBankDetails() {
    const bankData = {
        bankName: document.getElementById("bankName").value,
        accountNumber: document.getElementById("accountNumber").value,
        ifsc: document.getElementById("ifsc").value
    };

    fetch("/user/updateBank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => console.error(err));
}

// ✅ UPI Details Functions
function showUpiForm() {
    document.getElementById("upiForm").style.display = "block";

}

function saveUpiDetails() {
    const upiData = { upiId: document.getElementById("newUpiId").value };

    fetch("/user/updateUpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upiData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => console.error(err));
}

function enableUpiEdit() {
    document.getElementById("editUpiId").style.display = "block";
    document.getElementById("upiId").style.display = "none";
    document.getElementById("updateUpiBtn").disabled = false;
    document.getElementById("editUpiId").style.border = "2px solid #ffcc22"; 

}

function updateUpiDetails() {
    const upiData = { upiId: document.getElementById("editUpiId").value };

    fetch("/user/updateUpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upiData)
    }).then(res => res.json()).then(data => {
        alert(data.message);
        location.reload();
    }).catch(err => console.error(err));
}