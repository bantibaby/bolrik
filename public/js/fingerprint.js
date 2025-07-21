// FingerprintJS client implementation
(async function() {
    // Load FingerprintJS from CDN
    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4')
        .then(FingerprintJS => FingerprintJS.load());

    try {
        // Get the visitor identifier when you need it
        const fp = await fpPromise;
        const result = await fp.get();

        // The visitorId is the stable identifier for this browser
        const visitorId = result.visitorId;
        
        // Store the fingerprint in a hidden input field for forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Check if the form already has a fingerprint field
            if (!form.querySelector('input[name="clientFingerprint"]')) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'clientFingerprint';
                hiddenInput.value = visitorId;
                form.appendChild(hiddenInput);
            }
        });
        
        // Store fingerprint in localStorage for future reference
        localStorage.setItem('deviceFingerprint', visitorId);
        
        // Check if we're on the registration page
        if (window.location.pathname.includes('/register')) {
            // Check if this device has already registered an account
            const existingRegistration = localStorage.getItem('hasRegistered');
            if (existingRegistration === 'true') {
                // Redirect to duplicate device page
                window.location.href = '/user/duplicate-device';
            }
        }
        
        // If on successful registration page, mark this device as registered
        if (window.location.pathname.includes('/dashboard')) {
            localStorage.setItem('hasRegistered', 'true');
        }
        
        // Send fingerprint to server for existing sessions
        if (document.cookie.includes('jwt=')) {
            fetch('/api/update-fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientFingerprint: visitorId }),
                credentials: 'same-origin'
            }).catch(error => console.error('Error updating fingerprint:', error));
        }
        
        console.log('Fingerprint generated successfully');
    } catch (error) {
        console.error('Error generating fingerprint:', error);
    }
})(); 