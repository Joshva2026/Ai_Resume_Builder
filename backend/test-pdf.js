const fetch = require('node-fetch');
(async () => {
    try {
        const email = `testpdf${Date.now()}@example.com`;
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: 'password123', name: 'Test' })
        });
        const loginReq = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: 'password123' })
        });
        const loginData = await loginReq.json();
        const token = loginData.token;
        const resReq = await fetch('http://localhost:5000/api/resumes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                title: 'Test PDF',
                content: { personal: { fullName: 'Test Name' }, styling: { template: 'professional-ats-compact' } }
            })
        });
        const resData = await resReq.json();
        if (!resData || !resData.resume || !resData.resume.id) {
            console.error('RESUME CREATE FAILED', resData);
            return;
        }
        const pdfReq = await fetch(`http://localhost:5000/api/download/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ resumeId: resData.resume.id })
        });
        if (!pdfReq.ok) {
            const text = await pdfReq.text();
            console.error('PDF API ERROR:', text);
        } else {
            console.log('PDF GENERATED SUCCESSFULLY!');
        }
    } catch (e) {
        console.error(e);
    }
})();
