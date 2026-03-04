const { pool } = require('../config/db');

async function getVideoById(req, res) {
  try {
    const { id } = req.params;

    // Get the video
    const [videoRows] = await pool.query(`
      SELECT v.*, s.subject_id, s.title as section_title, s.order_index as section_order
      FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE v.id = ?
    `, [id]);

    if (videoRows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoRows[0];
    const subjectId = video.subject_id;

    // Check enrollment
    const [enrollment] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND subject_id = ?',
      [req.user.id, subjectId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this subject' });
    }

    // Get all videos in order for this subject
    const [allVideos] = await pool.query(`
      SELECT v.id FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE s.subject_id = ?
      ORDER BY s.order_index ASC, v.order_index ASC
    `, [subjectId]);

    const currentIndex = allVideos.findIndex(v => v.id === parseInt(id));

    // Check prerequisite: is the previous video completed?
    if (currentIndex > 0) {
      const prevVideoId = allVideos[currentIndex - 1].id;
      const [prevProgress] = await pool.query(
        'SELECT is_completed FROM video_progress WHERE user_id = ? AND video_id = ?',
        [req.user.id, prevVideoId]
      );

      if (prevProgress.length === 0 || !prevProgress[0].is_completed) {
        return res.status(403).json({
          error: 'Video is locked',
          locked: true,
          unlock_reason: 'Complete the previous video first',
          previous_video_id: prevVideoId,
        });
      }
    }

    // Get user progress for this video
    const [progressRows] = await pool.query(
      'SELECT * FROM video_progress WHERE user_id = ? AND video_id = ?',
      [req.user.id, parseInt(id)]
    );

    const progress = progressRows[0] || { last_position_seconds: 0, is_completed: false };

    res.json({
      video: {
        ...video,
        locked: false,
        previous_video_id: currentIndex > 0 ? allVideos[currentIndex - 1].id : null,
        next_video_id: currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1].id : null,
      },
      progress: {
        last_position_seconds: progress.last_position_seconds,
        is_completed: !!progress.is_completed,
      },
    });
  } catch (err) {
    console.error('GetVideo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateVideoProgress(req, res) {
  try {
    const { id } = req.params;
    const { last_position_seconds, duration_seconds } = req.body;

    if (last_position_seconds === undefined) {
      return res.status(400).json({ error: 'last_position_seconds is required' });
    }

    // Verify video exists and user is enrolled
    const [videoRows] = await pool.query(`
      SELECT v.*, s.subject_id FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE v.id = ?
    `, [id]);

    if (videoRows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoRows[0];

    const [enrollment] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND subject_id = ?',
      [req.user.id, video.subject_id]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this subject' });
    }

    // Check prerequisite
    const [allVideos] = await pool.query(`
      SELECT v.id FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE s.subject_id = ?
      ORDER BY s.order_index ASC, v.order_index ASC
    `, [video.subject_id]);

    const currentIndex = allVideos.findIndex(v => v.id === parseInt(id));
    if (currentIndex > 0) {
      const prevVideoId = allVideos[currentIndex - 1].id;
      const [prevProgress] = await pool.query(
        'SELECT is_completed FROM video_progress WHERE user_id = ? AND video_id = ?',
        [req.user.id, prevVideoId]
      );
      if (prevProgress.length === 0 || !prevProgress[0].is_completed) {
        return res.status(403).json({ error: 'Video is locked' });
      }
    }

    // Determine completion
    const effectiveDuration = duration_seconds || video.duration_seconds || 0;
    let isCompleted = false;
    let completedAt = null;

    if (effectiveDuration > 0 && last_position_seconds >= effectiveDuration * 0.9) {
      isCompleted = true;
      completedAt = new Date();
    }

    // Update video duration if provided and not yet stored
    if (duration_seconds && video.duration_seconds === 0) {
      await pool.query('UPDATE videos SET duration_seconds = ? WHERE id = ?', [duration_seconds, id]);
    }

    // Upsert progress
    const [existing] = await pool.query(
      'SELECT * FROM video_progress WHERE user_id = ? AND video_id = ?',
      [req.user.id, parseInt(id)]
    );

    if (existing.length > 0) {
      // Don't un-complete
      if (existing[0].is_completed) {
        isCompleted = true;
        completedAt = existing[0].completed_at;
      }

      await pool.query(
        `UPDATE video_progress
         SET last_position_seconds = ?, is_completed = ?, completed_at = ?
         WHERE user_id = ? AND video_id = ?`,
        [last_position_seconds, isCompleted ? 1 : 0, completedAt, req.user.id, parseInt(id)]
      );
    } else {
      await pool.query(
        `INSERT INTO video_progress (user_id, video_id, last_position_seconds, is_completed, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, parseInt(id), last_position_seconds, isCompleted ? 1 : 0, completedAt]
      );
    }

    // Compute overall progress for this subject
    const totalVideos = allVideos.length;
    const [completedRows] = await pool.query(`
      SELECT COUNT(*) as cnt FROM video_progress vp
      JOIN videos v ON vp.video_id = v.id
      JOIN sections s ON v.section_id = s.id
      WHERE vp.user_id = ? AND s.subject_id = ? AND vp.is_completed = 1
    `, [req.user.id, video.subject_id]);

    const completedCount = completedRows[0].cnt;
    const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

    res.json({
      message: 'Progress updated',
      is_completed: isCompleted,
      course_progress: {
        total: totalVideos,
        completed: completedCount,
        percent: progressPercent,
      },
    });
  } catch (err) {
    console.error('UpdateProgress error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getVideoById, updateVideoProgress };
