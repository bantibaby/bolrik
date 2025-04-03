document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('fullname').value;
    const mobile = document.getElementById('mobile').value;
    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, mobile })
    });
    const result = await response.json();
    alert(result.message);
});