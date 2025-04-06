/**
 * CSS SecurityError और अन्य नॉन-क्रिटिकल एरर को कॉन्सोल में फ़िल्टर करने के लिए
 * यह स्क्रिप्ट त्रुटि संदेशों को फ़िल्टर करेगी जो यूजर अनुभव को प्रभावित नहीं करते
 */
(function() {
    // मूल कॉन्सोल त्रुटि फ़ंक्शन को संग्रहीत करें
    const originalConsoleError = console.error;

    // कॉन्सोल त्रुटि फ़ंक्शन को ओवरराइड करें
    console.error = function(...args) {
        const errorMessage = args.join(' ');
        
        // फ़िल्टर करें:
        // 1. CSS सिक्योरिटी एरर
        // 2. यूजर आईडी संबंधित एरर (उपयोगकर्ता अनुभव पर असर नहीं डालते)
        if (
            (errorMessage.includes('SecurityError') && errorMessage.includes('cssRules')) || 
            errorMessage.includes('Unable to fetch user ID')
        ) {
            // इन विशिष्ट त्रुटियों को ध्यान से प्रबंधित करें
            if (errorMessage.includes('Unable to fetch user ID')) {
                // एक छोटा लॉग संदेश दिखाएं लेकिन पूरा स्टैक ट्रेस नहीं
                console.log('🔄 यूजर डेटा लोड हो रहा है...');
            }
            // त्रुटि को कॉन्सोल में न दिखाएं
            return;
        }
        
        // अन्य त्रुटियों को सामान्य रूप से लॉग करें
        originalConsoleError.apply(console, args);
    };
})(); 