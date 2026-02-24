const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function checkEndpoint(pathname, expectedStatus = 200) {
  const url = `${BASE_URL}${pathname}`;
  const res = await fetch(url);
  if (res.status !== expectedStatus) {
    const body = await res.text();
    throw new Error(`${pathname} expected ${expectedStatus}, got ${res.status}. body=${body}`);
  }
  return res.json();
}

async function run() {
  try {
    const health = await checkEndpoint('/health', 200);
    const apiInfo = await checkEndpoint('/api', 200);

    if (health.status !== 'ok') {
      throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
    }

    if (!apiInfo.endpoints || !apiInfo.endpoints.contracts) {
      throw new Error(`Unexpected /api payload: ${JSON.stringify(apiInfo)}`);
    }

    console.log('API test passed');
    console.log(`baseUrl=${BASE_URL}`);
    console.log(`health=${health.status}`);
  } catch (error) {
    console.error('API test failed');
    console.error(
      'Make sure the backend is running first. Example: cd server && npm run dev'
    );
    console.error(error.message);
    process.exitCode = 1;
  }
}

run();
