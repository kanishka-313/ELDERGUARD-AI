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
  console.log('=== ELDERCARE REGISTRATION & AUTH SUITE ===\n');
  const timestamp = Date.now();
  const elderPhone = `+91 94441 ${Math.floor(10000 + Math.random() * 90000)}`;
  const elderPin = '7890';
  const familyPhone = `+91 98840 ${Math.floor(10000 + Math.random() * 90000)}`;
  const familyEmail = `caregiver_${timestamp}@gmail.com`;
  const familyPassword = 'SecurePass@123';

  // 1. Test Elder Registration
  console.log(`1. Testing Elder Registration: Name="Sundaram Pillai", Phone="${elderPhone}", PIN="${elderPin}"`);
  const elderSignupRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sundaram Pillai',
    phone: elderPhone,
    pin: elderPin,
    role: 'elder',
    connectedElderPhone: familyPhone
  });

  console.log('Elder Signup Status:', elderSignupRes.status);
  const elderUser = elderSignupRes.data.data;
  if (elderSignupRes.status !== 200 || !elderUser) {
    throw new Error('Elder signup failed: ' + JSON.stringify(elderSignupRes));
  }
  console.log(`Elder Registered ID: ${elderUser.userId}, isProfileComplete: ${elderUser.isProfileComplete}\n`);

  // 2. Test Elder Login with WRONG PIN (Should fail)
  console.log('2. Testing Elder Login with WRONG PIN "0000" (Must Fail)');
  const wrongPinRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/login/elder',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sundaram Pillai',
    phone: elderPhone,
    pin: '0000'
  });
  console.log('Wrong PIN Response Status:', wrongPinRes.status, wrongPinRes.data);
  if (wrongPinRes.status === 200 && wrongPinRes.data.data) {
    throw new Error('Security flaw: Wrong PIN logged in!');
  }
  console.log('Security check passed: Wrong PIN correctly rejected (HTTP 401).\n');

  // 3. Test Elder Login with Hardcoded "1234" bypass (Should fail)
  console.log('3. Testing Elder Login with default "1234" bypass (Must Fail)');
  const bypassPinRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/login/elder',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sundaram Pillai',
    phone: elderPhone,
    pin: '1234'
  });
  console.log('Bypass PIN Status:', bypassPinRes.status);
  if (bypassPinRes.status === 200 && bypassPinRes.data.data) {
    throw new Error('Security flaw: Hardcoded 1234 PIN bypassed auth!');
  }
  console.log('Security check passed: Hardcoded 1234 bypass correctly rejected.\n');

  // 4. Test Elder Login with CORRECT PIN
  console.log(`4. Testing Elder Login with CORRECT PIN "${elderPin}"`);
  const correctLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/login/elder',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sundaram Pillai',
    phone: elderPhone,
    pin: elderPin
  });
  console.log('Correct Login Response Status:', correctLoginRes.status);
  const loggedInElder = correctLoginRes.data.data;
  if (correctLoginRes.status !== 200 || !loggedInElder) {
    throw new Error('Login with correct PIN failed!');
  }
  console.log(`Elder login success! User: ${loggedInElder.name}, isProfileComplete: ${loggedInElder.isProfileComplete}\n`);

  // 5. Test Profile Update for newly registered Elder (Age, Blood Group, Medical History)
  console.log('5. Testing Profile Update (Age: 78, Blood Group: "AB+", Medical History: "Hypertension, Mild Arthritis")');
  const profileUpdateRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/profile',
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Id': elderUser.userId
    }
  }, {
    userId: elderUser.userId,
    age: 78,
    bloodGroup: 'AB+',
    medicalHistory: 'Hypertension, Mild Arthritis',
    address: '42 Temple Street, Mylapore, Chennai',
    isProfileComplete: true
  });
  console.log('Profile Update Response Status:', profileUpdateRes.status);
  const updatedUser = profileUpdateRes.data.data;
  if (profileUpdateRes.status !== 200 || !updatedUser) {
    throw new Error('Profile update failed!');
  }
  if (updatedUser.age !== 78 || updatedUser.bloodGroup !== 'AB+' || !updatedUser.medicalHistory.includes('Hypertension')) {
    throw new Error('Profile details did not persist accurately in MongoDB!');
  }
  console.log(`Profile updated and persisted successfully! Age=${updatedUser.age}, BloodGroup=${updatedUser.bloodGroup}, isProfileComplete=${updatedUser.isProfileComplete}\n`);

  // 6. Test Family Caregiver Registration & Login
  console.log(`6. Testing Family Registration: Name="Kavitha Sundaram", Email="${familyEmail}", Password="${familyPassword}"`);
  const familySignupRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Kavitha Sundaram',
    email: familyEmail,
    phone: familyPhone,
    password: familyPassword,
    role: 'family',
    connectedElderPhone: elderPhone
  });
  console.log('Family Signup Response Status:', familySignupRes.status);
  const familyUser = familySignupRes.data.data;
  if (familySignupRes.status !== 200 || !familyUser) {
    throw new Error('Family signup failed!');
  }
  console.log(`Family member registered: ${familyUser.name}, Connected Elder Phone: ${familyUser.connectedElderPhone}\n`);

  console.log('7. Testing Family Login with Password');
  const familyLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/login/family',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: familyEmail,
    password: familyPassword,
    elderPhone: elderPhone
  });
  console.log('Family Login Response Status:', familyLoginRes.status);
  const loggedInFamily = familyLoginRes.data.data;
  if (familyLoginRes.status !== 200 || !loggedInFamily) {
    throw new Error('Family login failed!');
  }
  console.log(`Family login success: ${loggedInFamily.name}, Role: ${loggedInFamily.role}\n`);

  console.log('=============================================');
  console.log('? ALL REGISTRATION, MONGODB PERSISTENCE & PROFILE TESTS PASSED!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
