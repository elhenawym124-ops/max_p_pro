const axios = require('axios');
const jwt = require('jsonwebtoken');

// Config
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const TASK_ID = 'cmjsjm4ds003nuqmcl0fmhajf';
const API_URL = `https://maxp-ai.pro/api/v1/super-admin/dev/tasks/${TASK_ID}`;

async function verifyTaskDetails() {
    try {
        // 1. Forge Token
        console.log('1. Forging Token...');
        const payload = {
            id: 'cme8one7i0002uf6s5vj1gpv0',
            email: 'superadmin@system.com',
            role: 'SUPER_ADMIN'
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // 2. Fetch Task
        console.log(`2. Fetching Task ${TASK_ID}...`);
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const task = response.data.data;
        console.log('✅ Task Fetched Successfully');
        console.log('Title:', task.title);

        // 3. Inspect Subtasks
        if (task.subtasks) {
            console.log(`\n📂 Subtasks (${task.subtasks.length}):`);
            task.subtasks.forEach(st => {
                console.log(`   - [${st.status}] ${st.title} (ID: ${st.id})`);
            });
        } else {
            console.log('\n⚠️ No subtasks field returned.');
        }

        // 4. Inspect Checklists
        if (task.checklists) {
            console.log(`\nVX Checklists (${task.checklists.length}):`);
            task.checklists.forEach(cl => {
                console.log(`   - ${cl.title} (${cl.items?.length || 0} items)`);
            });
        } else {
            console.log('\n⚠️ No checklists field returned (might be null if empty).');
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Script Error:', error.message);
        }
    }
}

verifyTaskDetails();
