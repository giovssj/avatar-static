import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error parsing form' });
    }

    const text = fields.text;
    const imageFile = files.image;
    const audioFile = files.audio;
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'API key not configured' });
    }
    // upload image asset
    const uploadImageRes = await fetch('https://upload.heygen.com/v1/asset', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: fs.createReadStream(imageFile.filepath)
    }).then(r => r.json());
    const talkingPhotoId = uploadImageRes.id;
    let voiceInput;
    if (audioFile && audioFile.size > 0) {
      const uploadAudioRes = await fetch('https://upload.heygen.com/v1/asset', {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
        body: fs.createReadStream(audioFile.filepath)
      }).then(r => r.json());
      const audioAssetId = uploadAudioRes.id;
      voiceInput = { type: 'audio', audio_asset_id: audioAssetId };
    } else {
      voiceInput = { type: 'text', input_text: text, voice_id: 'en_us_001' };
    }
    const generateRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'talking_photo',
              talking_photo_id: talkingPhotoId
            },
            voice: voiceInput
          }
        ],
        caption: { type: 'none' },
        ratio: '16:9'
      })
    }).then(r => r.json());
    const videoId = generateRes.data?.video_id;
    res.status(200).json({ videoId });
  });
}
