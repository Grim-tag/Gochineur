require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const axios = require('axios');

const EBAY_APP_ID = process.env.EBAY_CLIENT_ID;
const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';

console.log('--- TEST EBAY FINDING API ---');
console.log('App ID:', EBAY_APP_ID ? `${EBAY_APP_ID.substring(0, 5)}...` : 'MISSING');

async function testFindingApi(operationName, params = {}) {
    console.log(`\n🔄 Testing ${operationName}...`);
    try {
        const response = await axios.get(EBAY_FINDING_URL, {
            headers: {
                'X-EBAY-SOA-OPERATION-NAME': operationName,
                'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
                'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
                'X-EBAY-SOA-GLOBAL-ID': 'EBAY-FR'
            },
            params: {
                'SECURITY-APPNAME': EBAY_APP_ID,
                'OPERATION-NAME': operationName,
                'SERVICE-VERSION': '1.0.0',
                'RESPONSE-DATA-FORMAT': 'JSON',
                ...params
            }
        });

        if (response.data.errorMessage) {
            console.error('❌ API Error:', JSON.stringify(response.data.errorMessage, null, 2));
        } else if (response.data[`${operationName}Response`][0].ack[0] === 'Failure') {
            console.error('❌ API Failure:', JSON.stringify(response.data[`${operationName}Response`][0].errorMessage, null, 2));
        } else {
            console.log('✅ Success!');
            const count = response.data[`${operationName}Response`][0].searchResult[0]['@count'];
            console.log(`   Found ${count} items.`);
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.message);
        if (error.response) {
            console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function runTests() {
    if (!EBAY_APP_ID) {
        console.error('❌ EBAY_CLIENT_ID missing in .env');
        return;
    }

    // Test 1: Standard Search (usually easiest to access)
    await testFindingApi('findItemsByKeywords', {
        'keywords': 'Nintendo Game Boy',
        'paginationInput.entriesPerPage': '1'
    });

    // Test 2: Completed Items (requires specific permissions sometimes)
    await testFindingApi('findCompletedItems', {
        'keywords': 'Nintendo Game Boy',
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true',
        'paginationInput.entriesPerPage': '1'
    });
}

runTests();
