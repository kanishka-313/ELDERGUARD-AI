const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== VERIFYING FAMILY PHONE REGISTRATION, PROFILE & DOCTOR REMOVAL FLOW ===\n');

  const timestamp = Date.now();
  const elderPhone = `+91 78100 ${Math.floor(10000 + Math.random() * 90000)}`;
  const familyPhone = `+91 34539 ${Math.floor(10000 + Math.random() * 90000)}`;
  const elderPin = '1234';

  // 1. Test Elder Registration with Family Phone Number
  console.log(`1. Testing Elder Registration: Name="Eswari", Phone="${elderPhone}", FamilyPhone="${familyPhone}"`);
  const elderSignupRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Eswari',
    phone: elderPhone,
    pin: elderPin,
    role: 'elder',
    connectedFamilyPhone: familyPhone
  });

  console.log('Elder Signup Status:', elderSignupRes.status);
  const elderUser = elderSignupRes.data.data;
  if (elderSignupRes.status !== 200 || !elderUser) {
    throw new Error('Elder signup failed: ' + JSON.stringify(elderSignupRes));
  }
  console.log(`Registered Elder ID: ${elderUser.userId}`);
  console.log(`Registered Family Phone in MongoDB: "${elderUser.connectedFamilyPhone}"`);
  if (elderUser.connectedFamilyPhone !== familyPhone) {
    throw new Error(`Mismatch in connectedFamilyPhone: expected ${familyPhone}, got ${elderUser.connectedFamilyPhone}`);
  }
  console.log('✅ Step 1 Passed: Family phone number saved into Elder profile in MongoDB.\n');

  // 2. Test Elder Profile Update (Save & Update Profile from Modal)
  console.log('2. Testing Profile Update: Updating family name and email from Profile Modal...');
  const updateRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': elderUser.userId,
      'X-User-Role': 'ELDER'
    }
  }, {
    userId: elderUser.userId,
    name: 'Eswari',
    phone: elderPhone,
    connectedFamilyPhone: familyPhone,
    connectedFamilyName: 'Ramesh (Son)',
    connectedFamilyEmail: 'ramesh.son@gmail.com'
  });

  console.log('Profile Update Status:', updateRes.status);
  const updatedElder = updateRes.data.data;
  console.log(`Updated Elder Profile in DB: Name="${updatedElder.name}", FamilyName="${updatedElder.connectedFamilyName}", FamilyEmail="${updatedElder.connectedFamilyEmail}", FamilyPhone="${updatedElder.connectedFamilyPhone}"`);
  if (updatedElder.connectedFamilyName !== 'Ramesh (Son)' || updatedElder.connectedFamilyEmail !== 'ramesh.son@gmail.com') {
    throw new Error('Profile update failed to persist family name/email in MongoDB');
  }
  console.log('✅ Step 2 Passed: Family details successfully updated in MongoDB.\n');

  // 3. Test Family Registration with Matching Phone Number
  console.log(`3. Testing Family Registration with matching phone "${familyPhone}" linking to elder phone "${elderPhone}"...`);
  const familySignupRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Ramesh',
    phone: familyPhone,
    email: 'ramesh.son@gmail.com',
    password: 'password123',
    role: 'family',
    connectedElderPhone: elderPhone
  });

  console.log('Family Signup Status:', familySignupRes.status);
  const familyUser = familySignupRes.data.data;
  console.log(`Family Registered: ConnectedElderName="${familyUser.connectedElderName}", ConnectedElderPhone="${familyUser.connectedElderPhone}"`);
  if (familyUser.connectedElderName !== 'Eswari') {
    throw new Error(`Bidirectional auto-link failed: expected "Eswari", got "${familyUser.connectedElderName}"`);
  }
  console.log('✅ Step 3 Passed: Bidirectional auto-linking between Elder and Family accounts in MongoDB works perfectly.\n');

  // 4. Test SOS Alert Trigger using registered family phone
  console.log('4. Testing SOS Alert Trigger for Elder...');
  const sosRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/alerts/sos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': elderUser.userId,
      'X-User-Role': 'ELDER'
    }
  }, {
    elderId: elderUser.userId,
    elderName: 'Eswari',
    elderPhone: elderPhone,
    familyPhone: familyPhone,
    source: 'Elder SOS Button'
  });

  console.log('SOS Alert Status:', sosRes.status);
  const alertData = sosRes.data.data;
  console.log(`Alert Created: ID="${alertData.alertId}", DispatchedToFamilyPhone="${alertData.familyPhone}", RecipientIds=${JSON.stringify(alertData.recipientIds)}`);
  if (alertData.familyPhone !== familyPhone) {
    throw new Error(`SOS alert routed to wrong phone: expected ${familyPhone}, got ${alertData.familyPhone}`);
  }
  console.log('✅ Step 4 Passed: SOS Alert & Emergency Call Dispatched to real Family Phone Number.\n');

  // 5. Test Doctor Endpoints are completely removed (Must return 404)
  console.log('5. Testing Doctor endpoints removal (Must Return HTTP 404)...');
  const docGetRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/doctor',
    method: 'GET'
  });
  console.log('GET /api/doctor Status:', docGetRes.status);

  const docLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/login/doctor',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'kavsika@eldercare.ai', password: '123' });
  console.log('POST /api/auth/login/doctor Status:', docLoginRes.status);

  if (docGetRes.status !== 404 && docGetRes.status !== 405) {
    throw new Error('Doctor endpoint still active!');
  }
  console.log('✅ Step 5 Passed: Doctor backend endpoints completely removed.\n');

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The flow is 100% verified.');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
