const http = require('http');

// Let's create a real elder in eldercare_db so when the user expands eldercare_db in Compass, they see real data!
async function seedDemoElder() {
  const reqData = JSON.stringify({
    name: "Sundaram Pillai",
    phone: "+91 94441 23456",
    pin: "5678",
    role: "elder",
    connectedFamilyPhone: "+91 98840 12345"
  });

  const options = {
    hostname: 'localhost',
    port: 8088,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(reqData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Signup Result:', data);
    });
  });
  req.on('error', console.error);
  req.write(reqData);
  req.end();
}

seedDemoElder();
