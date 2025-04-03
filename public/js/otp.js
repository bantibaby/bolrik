// // public/js/otp.js- frontend

// // Firebase Import
// import { auth, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config';

// // OTP Form Submission
// document.getElementById('otpForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const otp = document.getElementById('otp').value;

//     try {
//         // Firebase OTP Verification
//         const confirmationResult = window.confirmationResult;
//         const result = await confirmationResult.confirm(otp);
//         alert('OTP verified successfully!');

//         // Proceed with backend verification if needed
//         const response = await fetch('/verify-otp', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ otp })
//         });

//         const backendResult = await response.json();
//         alert(backendResult.message);
//     } catch (error) {
//         console.error('Invalid OTP:', error);
//         alert('Invalid OTP. Please try again.');
//     }
// });

// // Resend OTP Button
// document.getElementById('resendOtp').addEventListener('click', async () => {
//     const mobile = document.getElementById('mobile').value; // Ensure mobile is accessible

//     try {
//         // Firebase Recaptcha Setup
//         window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
//             size: 'invisible',
//             callback: (response) => {
//                 console.log('Recaptcha verified');
//             },
//             'expired-callback': () => {
//                 console.error('Recaptcha expired');
//             }
//         }, auth);

//         const appVerifier = window.recaptchaVerifier;
//         const phoneNumber = `+91${mobile}`; // Change country code as per need

//         // Firebase Send OTP
//         const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
//         window.confirmationResult = confirmationResult;
//         alert('OTP resent to ' + mobile);

//     } catch (error) {
//         console.error('Error sending OTP:', error);
//         alert('Failed to resend OTP. Please try again.');
//     }
// });

document.addEventListener('DOMContentLoaded', function() {
    const copyBtn = document.getElementById('copyRefLink');
    const refLink = document.getElementById('refLink');
    const copyMessage = document.getElementById('copyMessage');
    copyBtn.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(refLink.value);
            copyMessage.style.display = 'block';
            copyBtn.style.background = '#00FF00';
            
            setTimeout(() => {
                copyMessage.style.display = 'none';
                copyBtn.style.background = '#FFCC00';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
});