// public/js/signup- frontend

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mobile = document.getElementById('mobile').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({mobile })
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
            return;
        }

        const result = await response.json();
        alert(result.message);
    } catch (err) {
        console.error('Request failed:', err);
        alert('Something went wrong. Please try again.');
    }
});
