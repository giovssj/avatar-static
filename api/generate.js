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

    let character;
    // Determine character settings: if image provided, upload to HeyGen and use as talking photo; otherwise use default avatar
    if (imageFile && imageFile.size > 0) {
      try {
        const uploadImageRes = await fetch('https://upload.heygen.com/v1/asset', {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
          },
          body: fs.createReadStream(imageFile.filepath),
        }).then(r => r.json());
        const talkingPhotoId = uploadImageRes.id;
        character = {
          type: 'talking_photo',
          talking_photo_id: talkingPhotoId,
        };
      } catch (err) {
        console.error('Image upload error', err);
        return res.status(500).json({ message: 'Error uploading image' });
      }
    } else {
      // Use a default avatar when no image is provided. Replace with a valid avatar ID if necessary.
      character = {
        type: 'avatar',
        avatar_id: 'Angela-inblackskirt-20220820',
      };
    }

    let voiceInput;
    if (audioFile && audioFile.size > 0) {
      try {
        const uploadAudioRes = await fetch('https://upload.heygen.com/v1/asset', {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
          },
          body: fs.createReadStream(audioFile.filepath),
        }).then(r => r.json());
        const audioAssetId = uploadAudioRes.id;
        voiceInput = {
          type: 'audio',
          audio_asset_id: audioAssetId,
        };
      } catch (err) {
        console.error('Audio upload error', err);
        return res.status(500).json({ message: 'Error uploading audio' });
      }
    } else {
      voiceInput = {
        type: 'text',
        input_text: text,
        voice_id: 'en_us_001',
      };
    }

    try {
      const generateRes = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: character,
              voice: voiceInput,
            },
          ],
          caption: { type: 'none' },
          ratio: '16:9',
        }),
      }).then(r => r.json());

      const videoId = generateRes.data?.video_id;
      return res.status(200).json({ videoId });
    } catch (err) {
      console.error('Error generating video', err);
      return res.status(500).json({ message: 'Error generating video' });
    }
  });
}
