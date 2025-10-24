export default async function handler(req, res) {
  const videoId = req.query.videoId || req.query.video_id;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }
  const apiKey = process.env.HEYGEN_API_KEY;
  try {
    const response = await fetch('https://api.heygen.com/v1/video_status.get?video_id=' + videoId, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey }
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
