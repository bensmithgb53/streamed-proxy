const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    // Fetch all matches from streamed.su
    const matchesResponse = await fetch('https://streamed.su/api/matches/all', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' }
    });
    const matches = await matchesResponse.json();

    // Filter matches from the last 24 hours
    const currentTime = Math.floor(Date.now() / 1000);
    const liveMatches = matches.filter(m => m.date / 1000 >= currentTime - 86400);

    // Build streams object with all sources per match
    const streams = {};
    for (const match of liveMatches) {
      for (const source of match.sources) {
        const url = `https://streamed-proxy-vercel.vercel.app/api/get_m3u8?source=${source.source}&id=${match.id}&streamNo=1`;
        const m3u8Response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://streamed.su/'
          }
        });
        const m3u8Data = await m3u8Response.json();
        const m3u8Url = m3u8Data.m3u8_url || '';
        streams[`${match.id}-${source.id}`] = {
          matchId: match.id,
          source: source.source,
          m3u8_url: m3u8Url
        };
      }
    }

    res.status(200).json(streams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streams', details: error.message });
  }
};
