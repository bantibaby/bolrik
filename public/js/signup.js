// // public/js/signup- frontend
// // ✅ URL se referral code extract karke input field me daalna

// document.getElementById('registerForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const fullname = document.getElementById('fullname').value;
//     const mobile = document.getElementById('mobile').value;

//     try {
//         const response = await fetch('/user/verify', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ fullname, mobile })
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             alert(`Error: ${errorData.message}`);
//             return;
//         }

//         const result = await response.json();
//         alert(result.message);
//     } catch (err) {
//         // console.error('Request failed:', err);
//         alert('Something went wrong. Please try again.');
//     }
// });
