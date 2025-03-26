const fetch = require('node-fetch');
const crypto = require('crypto'); // Node.js built-in

module.exports = async (req, res) => {
  const { source, id, streamNo } = req.body;
  const response = await fetch(`https://streamed.su/api/matches/watch/${id}/${source}/${streamNo}`, {
    method: 'GET', // Adjust if Streamed needs POST
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Referer': 'https://streamed.su/',
      'Origin': 'https://streamed.su'
    }
  });
  const enc = await response.text(); // Encrypted token
  console.log('Encrypted:', enc);

  // Decryption (guessing AES from embedme.top style)
  const key = 'some-secret-key'; // Need Streamed’s real key
  const iv = 'some-iv-16bytes'; // Need real IV
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(enc, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  const m3u8Url = `https://rr.vipstreams.in${decrypted}`;
  res.json({ m3u8_url: m3u8Url });
};
