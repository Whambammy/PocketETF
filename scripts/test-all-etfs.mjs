const etfs = ['silicon-ai', 'mag-titans', 'spy-benchmark', 'nasdaq-growth', 'hard-assets', 'crypto-frontier'];

async function testAll() {
  for (const id of etfs) {
    for (const amt of [5, 10, 50, 100]) {
      try {
        const res = await fetch(`https://pocketetf.vercel.app/api/actions/etf/${id}?amount=${amt}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' })
        });
        const data = await res.json();
        if (res.ok) {
          const len = Buffer.from(data.transaction, 'base64').length;
          console.log(`[PASS] ${id} ($${amt}): ${len}B / 1232B`);
        } else {
          console.log(`[FAIL] ${id} ($${amt}): Status ${res.status} - ${data.message || data.error}`);
        }
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.log(`[ERR] ${id} ($${amt}): ${err.message}`);
      }
    }
  }
}

testAll();
