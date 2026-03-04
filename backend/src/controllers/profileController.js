const { pool } = require('../config/db');

async function getProfile(req, res) {
  try {
    const [userRows] = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Get enrollments with progress
    const [enrollments] = await pool.query(`
      SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        s.id as subject_id,
        s.title as subject_title,
        s.description as subject_description,
        s.thumbnail_url,
        (SELECT COUNT(*) FROM videos v JOIN sections sec ON v.section_id = sec.id WHERE sec.subject_id = s.id) as total_videos,
        (SELECT COUNT(*) FROM video_progress vp 
         JOIN videos v ON vp.video_id = v.id 
         JOIN sections sec ON v.section_id = sec.id 
         WHERE vp.user_id = ? AND sec.subject_id = s.id AND vp.is_completed = 1) as completed_videos
      FROM enrollments e
      JOIN subjects s ON e.subject_id = s.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `, [req.user.id, req.user.id]);

    enrollments.forEach(e => {
      e.progress_percent = e.total_videos > 0 ? Math.round((e.completed_videos / e.total_videos) * 100) : 0;
    });

    res.json({ user, enrollments });
  } catch (err) {
    console.error('GetProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getProfile };
