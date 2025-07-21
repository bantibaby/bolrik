// Alert Offer Popup Logic
(function() {
  const popup = document.getElementById('alert-offer-popup');
  const closeBtn = document.getElementById('alert-offer-close');
  const openBtn = document.getElementById('alert-offer-open-btn');
  const timerEl = document.getElementById('alert-offer-timer');
  const fakeUsersEl = document.getElementById('alert-offer-fake-users');
  const depositInput = document.getElementById('alert-offer-deposit-input');
  const payoutRangeEl = document.getElementById('alert-offer-payout-range');
  const depositBtn = document.getElementById('alert-offer-deposit-btn');
  const dropdown = document.getElementById('alert-offer-deposit-dropdown');
  const confirmBtn = document.getElementById('alert-offer-confirm-btn');
  const coupon = document.getElementById('alert-offer-coupon');
  const couponDeposit = document.getElementById('alert-offer-coupon-deposit');
  const couponPayout = document.getElementById('alert-offer-coupon-payout');
  const couponStatus = document.getElementById('alert-offer-coupon-status');
  const leaderboardBody = document.getElementById('alert-offer-leaderboard-body');

  // Always show popup on page load
  popup.style.display = 'flex';
  openBtn.style.display = 'none';

  // Close only hides for this session
  closeBtn.onclick = function() {
    popup.style.display = 'none';
    openBtn.style.display = 'block';
  };
  openBtn.onclick = function() {
    popup.style.display = 'flex';
    openBtn.style.display = 'none';
  };

  // --- Countdown (23 July 2025, 12:00am IST) ---
  // IST is UTC+5:30, so UTC time is 2025-07-22T18:30:00Z
  const END_TIME = new Date('2025-07-22T12:20:00Z').getTime();
  function updateCountdown() {
    const now = Date.now();
    let diff = Math.max(0, END_TIME - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `${String(h).padStart(2,'0')} घंटे : ${String(m).padStart(2,'0')} मिनट : ${String(s).padStart(2,'0')} सेकंड`;
    if (diff > 0) setTimeout(updateCountdown, 1000);
    else timerEl.textContent = '00 घंटे : 00 मिनट : 00 सेकंड';
  }
  updateCountdown();

  // --- Fake user counter ---
  let fakeUsers = 1234 + Math.floor(Math.random()*100);
  function updateFakeUsers() {
    fakeUsers += Math.floor(Math.random()*3);
    fakeUsersEl.textContent = fakeUsers.toLocaleString('en-IN');
    setTimeout(updateFakeUsers, 4000 + Math.random()*3000);
  }
  updateFakeUsers();

  // --- Calculator logic ---
  function calcPayout(amount) {
    amount = Math.max(300, Math.min(10000, Number(amount)||300));
    let min = amount;
    let max = Math.round(amount * (2 + Math.random()));
    if (amount === 300) max = 900;
    if (amount === 500) max = 1500;
    if (amount === 1000) max = 3000;
    return [min, max];
  }
  function updateCalc() {
    const val = depositInput.value;
    const [min, max] = calcPayout(val);
    payoutRangeEl.textContent = `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;
  }
  depositInput.oninput = updateCalc;
  updateCalc();

  // --- Deposit dropdown ---
  depositBtn.onclick = function() {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  };
  confirmBtn.onclick = function() {
    dropdown.style.display = 'none';
    coupon.style.display = 'block';
    couponDeposit.textContent = `₹${depositInput.value}`;
    const [min, max] = calcPayout(depositInput.value);
    couponPayout.textContent = `₹${max}`;
    couponStatus.textContent = 'अप्रूवल का इंतजार...';
    setTimeout(() => {
      couponStatus.textContent = 'अप्रूव्ड! पेआउट प्रोसेस हो रहा है...';
    }, 5000);
  };

  // --- Fake leaderboard ---
  const fakeNumbers = [12, 43, 56, 78, 91, 34, 67, 89, 23, 45];
  function randomMobile() {
    const n = fakeNumbers[Math.floor(Math.random()*fakeNumbers.length)];
    return `+91 ****${String(n).padStart(2,'0')}`;
  }
  function randomBalance() {
    return 600 + Math.floor(Math.random()*2400);
  }
  function randomDeposit() {
    const vals = [300, 500, 1000, 700, 900];
    return vals[Math.floor(Math.random()*vals.length)];
  }
  function randomPayout(dep) {
    if (dep === 300) return 600 + Math.floor(Math.random()*300);
    if (dep === 500) return 900 + Math.floor(Math.random()*600);
    if (dep === 1000) return 1800 + Math.floor(Math.random()*1200);
    return dep*2 + Math.floor(Math.random()*dep);
  }
  function updateLeaderboard() {
    let html = '';
    for (let i=0; i<5; ++i) {
      const mob = randomMobile();
      const dep = randomDeposit();
      const bal = randomBalance();
      const pay = randomPayout(dep);
      html += `<tr><td>${mob}</td><td>₹${bal}</td><td>₹${dep}</td><td>₹${pay}</td></tr>`;
    }
    leaderboardBody.innerHTML = html;
    setTimeout(updateLeaderboard, 4000 + Math.random()*3000);
  }
  updateLeaderboard();
})(); 