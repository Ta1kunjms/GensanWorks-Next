const https = require('https');

function ipv6ToBinary(ip) {
  // Expand "::" if present
  let fullIp = ip;
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0].split(':').filter(Boolean);
    const right = parts[1].split(':').filter(Boolean);
    const missingCount = 8 - (left.length + right.length);
    const middle = Array(missingCount).fill('0000');
    fullIp = [...left, ...middle, ...right].join(':');
  }
  
  const blocks = fullIp.split(':').map(b => b.padStart(4, '0'));
  let binary = '';
  for (const block of blocks) {
    const value = parseInt(block, 16);
    binary += value.toString(2).padStart(16, '0');
  }
  return binary;
}

function matchIp(ipBin, prefixBin, len) {
  return ipBin.substring(0, len) === prefixBin.substring(0, len);
}

https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const targetIpStr = '2406:da12:5ca:b700:5541:f66a:38c9:7a3f';
    const targetIpBin = ipv6ToBinary(targetIpStr);
    
    const matches = [];
    
    for (const p of json.ipv6_prefixes) {
      try {
        const [prefixIp, lenStr] = p.ipv6_prefix.split('/');
        const len = parseInt(lenStr, 10);
        const prefixBin = ipv6ToBinary(prefixIp);
        
        if (matchIp(targetIpBin, prefixBin, len)) {
          matches.push(p);
        }
      } catch (e) {}
    }
    
    console.log('Matches for', targetIpStr);
    console.log(JSON.stringify(matches, null, 2));
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
