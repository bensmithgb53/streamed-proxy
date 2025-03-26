const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    // Fetch all matches
    const matchesResponse = await fetch('https://streamed.su/api/matches/all', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' }
    });
    const matches = await matchesResponse.json();

    // Filter last 24 hours and take only 5 matches to avoid timeout
    const currentTime = Math.floor(Date.now() / 1000);
    const liveMatches = matches
      .filter(m => m.date / 1000 >= currentTime - 86400)
      .slice(0, 5); // Limit to 5 matches

    // Fetch streams concurrently
    const streamPromises = liveMatches.flatMap(match =>
      match.sources.map(source =>
        fetch(`https://streamed-proxy-vercel.vercel.app/api/get_m3u8?source=${source.source}&id=${match.id}&streamNo=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://streamed.su/'
          },
          timeout: 3000 // 3s timeout per request
        })
          .then(r => r.json())
          .then(d => ({
            key: `${match.id}-${source.id}`,
            value: { matchId: match.id, source: source.source, m3u8_url: d.m3u8_url || '' }
          }))
          .catch(() => ({ key: `${match.id}-${source.id}`, value: { matchId: match.id, source: source.source, m3u8_url: '' } }))
      )
    );

    const streamsArray = await Promise.all(streamPromises);
    const streams = streamsArray.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});

    res.status(200).json(streams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streams', details: error.message });
  }
};
