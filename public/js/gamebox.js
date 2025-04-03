// // सॉकेट कनेक्शन और अन्य वेरिएबल्स...

// socket.on("flipButtons", ({ buttonValues }) => {
//     const buttons = document.querySelectorAll('.box');
    
//     // सभी बटन्स को क्रमवार फ्लिप करें
//     buttons.forEach((button, index) => {
//         setTimeout(() => {
//             // फ्रंट फेस का वर्तमान नंबर सेव करें
//             const currentNumber = button.querySelector('.front').textContent;
            
//             // बैक फेस पर नई वैल्यू सेट करें
//             const backFace = button.querySelector('.back');
//             backFace.textContent = buttonValues[index];
//             backFace.setAttribute('data-value', buttonValues[index]);
            
//             // फ्लिप एनिमेशन शुरू करें
//             button.classList.add('flipping');
            
//             // फ्लिप के बाद वैल्यूज अपडेट करें
//             setTimeout(() => {
//                 const frontFace = button.querySelector('.front');
//                 frontFace.textContent = buttonValues[index];
//                 button.classList.remove('flipping');
                
//                 // नई वैल्यू के हिसाब से कलर क्लास एड करें
//                 if(buttonValues[index] === '0x') {
//                     button.classList.add('zero-multiplier');
//                 } else if(buttonValues[index] === '2x') {
//                     button.classList.add('double-multiplier');
//                 } else if(buttonValues[index] === '4x') {
//                     button.classList.add('quadruple-multiplier');
//                 }
//             }, 300); // फ्लिप के बीच में वैल्यू अपडेट करें
            
//         }, index * 100); // हर बटन को 100ms के डिले से फ्लिप करें
//     });
// });

// // बटन्स पर क्लिक इवेंट
// document.querySelectorAll('.box').forEach(button => {
//     button.addEventListener('click', () => {
//         if(!button.classList.contains('flipping')) {
//             // यहाँ आपका मौजूदा क्लिक हैंडलिंग कोड...
//         }
//     });
// });

// // रीसेट फंक्शन
// socket.on("resetUI", () => {
//     const buttons = document.querySelectorAll('.box');
//     buttons.forEach((button, index) => {
//         // सभी एनिमेशन क्लासेज हटाएं
//         button.classList.remove('flipping', 'zero-multiplier', 'double-multiplier', 'quadruple-multiplier');
        
//         // फ्रंट फेस को ओरिजिनल नंबर पर रीसेट करें
//         const frontFace = button.querySelector('.front');
//         frontFace.textContent = index + 1;
        
//         // बैक फेस को खाली करें
//         const backFace = button.querySelector('.back');
//         backFace.textContent = '';
//         backFace.removeAttribute('data-value');
//     });
// });

// function initializeFlipAnimation() {
//     const buttons = document.querySelectorAll('.number-pad button');
    
//     // हर बटन में फेस एलिमेंट्स एड करें
//     buttons.forEach(button => {
//         const number = button.textContent;
//         button.textContent = '';
        
//         const frontFace = document.createElement('div');
//         frontFace.className = 'number-face front-face';
//         frontFace.textContent = number;
        
//         const backFace = document.createElement('div');
//         backFace.className = 'number-face back-face';
//         backFace.textContent = number;
        
//         button.appendChild(frontFace);
//         button.appendChild(backFace);
//     });
// }

// // पेज लोड होने पर फेस एलिमेंट्स एड करें
// document.addEventListener('DOMContentLoaded', initializeFlipAnimation);

// // जब नए नंबर्स आएं तब फ्लिप एनिमेशन
// socket.on("updateNumbers", (data) => {
//     const buttons = document.querySelectorAll('.number-pad button');
    
//     buttons.forEach((button, index) => {
//         setTimeout(() => {
//             const frontFace = button.querySelector('.front-face');
//             const backFace = button.querySelector('.back-face');
//             const newValue = data.numbers[index];
            
//             // बैक फेस पर नई वैल्यू सेट करें
//             backFace.textContent = newValue;
            
//             // फ्लिप एनिमेशन शुरू करें
//             button.classList.add('flipping');
            
//             // फ्लिप के बाद फ्रंट फेस अपडेट करें
//             setTimeout(() => {
//                 frontFace.textContent = newValue;
//                 button.classList.remove('flipping');
//             }, 300);
            
//         }, index * 80); // हर बटन में थोड़ा डिले
//     });
// });

// // रीसेट के लिए
// socket.on("resetGame", () => {
//     const buttons = document.querySelectorAll('.number-pad button');
//     buttons.forEach((button, index) => {
//         const frontFace = button.querySelector('.front-face');
//         const backFace = button.querySelector('.back-face');
//         const originalNumber = index + 1;
        
//         button.classList.remove('flipping');
//         frontFace.textContent = originalNumber;
//         backFace.textContent = originalNumber;
//     });
// });
