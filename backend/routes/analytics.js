const express = require('express');
const router = express.Router();

// Mock analytics data — replace with real DB queries
const generateMetrics = (platform) => {
  const base = { tiktok:1, instagram:.85, twitter:.7, facebook:.6, snapchat:.55 }[platform] || 1;
  return {
    views: Math.floor(2400000 * base),
    engagement: Math.floor(287000 * base),
    followers_gained: Math.floor(42100 * base),
    estimated_value: parseFloat((3800 * base).toFixed(2)),
    weekly: Array.from({length:7}, () => Math.floor(Math.random()*40+50)),
    top_content_types: [
      { type: 'Hook فيروسي', score: 91, reach: '284K' },
      { type: 'Tutorial سريع', score: 85, reach: '196K' },
      { type: 'Trend Hijack', score: 78, reach: '158K' },
      { type: 'قصة قصيرة', score: 72, reach: '98K' },
    ],
    audience: {
      age_groups: [
        { label:'18-24', value:38 },
        { label:'25-34', value:31 },
        { label:'35-44', value:19 },
        { label:'45+', value:12 },
      ],
      geo: [
        { country:'🇸🇦 السعودية', pct:'34%' },
        { country:'🇪🇬 مصر', pct:'22%' },
        { country:'🇦🇪 الإمارات', pct:'18%' },
        { country:'🇰🇼 الكويت', pct:'11%' },
        { country:'🌍 آخر', pct:'15%' },
      ],
    },
    algo_scores: {
      quality: 87,
      organic_reach: 72,
      engagement_power: 91,
      algo_trust: 64,
    },
  };
};

router.get('/metrics/:platform', (req, res) => {
  const { platform } = req.params;
  const valid = ['tiktok','instagram','twitter','facebook','snapchat'];
  if (!valid.includes(platform)) return res.status(400).json({ error: 'Invalid platform' });
  res.json({ success: true, platform, metrics: generateMetrics(platform) });
});

router.get('/best-times/:platform', (req, res) => {
  const times = {
    tiktok:    [{time:'7:00 - 9:00 صباحاً',quality:'ممتاز'},{time:'12:00 - 2:00 ظهراً',quality:'جيد'},{time:'7:00 - 10:00 مساءً',quality:'الأفضل'}],
    instagram: [{time:'6:00 - 9:00 صباحاً',quality:'جيد'},{time:'11:00 - 1:00 ظهراً',quality:'ممتاز'},{time:'8:00 - 11:00 مساءً',quality:'الأفضل'}],
    twitter:   [{time:'8:00 - 10:00 صباحاً',quality:'ممتاز'},{time:'12:00 - 3:00 ظهراً',quality:'الأفضل'},{time:'5:00 - 7:00 مساءً',quality:'جيد'}],
    facebook:  [{time:'9:00 - 11:00 صباحاً',quality:'جيد'},{time:'1:00 - 3:00 ظهراً',quality:'ممتاز'},{time:'6:00 - 9:00 مساءً',quality:'الأفضل'}],
    snapchat:  [{time:'9:00 - 11:00 صباحاً',quality:'جيد'},{time:'3:00 - 6:00 مساءً',quality:'ممتاز'},{time:'8:00 - 12:00 مساءً',quality:'الأفضل'}],
  };
  res.json({ success: true, times: times[req.params.platform] || times.tiktok });
});

module.exports = router;
