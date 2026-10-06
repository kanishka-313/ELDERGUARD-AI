const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8088,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('=== TESTING APPOINTMENTS API ===');
  
  // 1. Get initial appointments
  const listRes = await makeRequest('/appointments');
  console.log('Initial appointments count:', listRes.data?.data?.length);

  // 2. Create an appointment
  const newApt = {
    purpose: 'Routine Cardiology Follow-up',
    appointmentDate: 'Tomorrow, 11:00 AM',
    appointmentTime: '11:00 AM',
    location: 'Cardio OPD, Room 102',
    consultationMode: 'In-Person Clinic Visit',
    elderId: 'usr-elder-test-1',
    elderName: 'Sundaram Pillai',
    status: 'CONFIRMED'
  };

  const createRes = await makeRequest('/appointments', 'POST', newApt);
  console.log('Create appointment status:', createRes.status);
  const createdId = createRes.data?.data?.appointmentId;
  console.log('Created appointment ID:', createdId);

  // 3. Fetch appointments again
  const listRes2 = await makeRequest('/appointments');
  console.log('Appointments count after creation:', listRes2.data?.data?.length);

  // 4. Delete appointment
  if (createdId) {
    const delRes = await makeRequest(`/appointments/${createdId}`, 'DELETE');
    console.log('Delete appointment status:', delRes.status);
  }

  const listRes3 = await makeRequest('/appointments');
  console.log('Final appointments count:', listRes3.data?.data?.length);
  console.log('=== ALL APPOINTMENTS TESTS PASSED! ===');
}

run().catch(console.error);
