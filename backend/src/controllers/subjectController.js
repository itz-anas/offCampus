const { pool } = require('../config/db');

async function getAllSubjects(req, res) {
  try {
    const [subjects] = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM sections sec WHERE sec.subject_id = s.id) as section_count,
        (SELECT COUNT(*) FROM videos v JOIN sections sec ON v.section_id = sec.id WHERE sec.subject_id = s.id) as video_count
      FROM subjects s
      WHERE s.is_published = 1
      ORDER BY s.created_at DESC
    `);

    // If user is authenticated, add enrollment info
    if (req.user) {
      const [enrollments] = await pool.query(
        'SELECT subject_id FROM enrollments WHERE user_id = ?',
        [req.user.id]
      );
      const enrolledIds = new Set(enrollments.map(e => e.subject_id));
      subjects.forEach(s => { s.is_enrolled = enrolledIds.has(s.id); });
    }

    res.json({ subjects });
  } catch (err) {
    console.error('GetAllSubjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSubjectById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ? AND is_published = 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = rows[0];

    const [sections] = await pool.query(
      'SELECT * FROM sections WHERE subject_id = ? ORDER BY order_index ASC',
      [id]
    );

    const [videos] = await pool.query(`
      SELECT v.* FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE s.subject_id = ?
      ORDER BY s.order_index ASC, v.order_index ASC
    `, [id]);

    subject.section_count = sections.length;
    subject.video_count = videos.length;

    // Check enrollment
    if (req.user) {
      const [enrollment] = await pool.query(
        'SELECT id FROM enrollments WHERE user_id = ? AND subject_id = ?',
        [req.user.id, id]
      );
      subject.is_enrolled = enrollment.length > 0;
    }

    res.json({ subject });
  } catch (err) {
    console.error('GetSubjectById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSubjectTree(req, res) {
  try {
    const { id } = req.params;

    const [subjectRows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [id]);
    if (subjectRows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectRows[0];

    const [sections] = await pool.query(
      'SELECT * FROM sections WHERE subject_id = ? ORDER BY order_index ASC',
      [id]
    );

    const [allVideos] = await pool.query(`
      SELECT v.* FROM videos v
      JOIN sections s ON v.section_id = s.id
      WHERE s.subject_id = ?
      ORDER BY s.order_index ASC, v.order_index ASC
    `, [id]);

    // Build flat ordered list
    const flatVideos = allVideos.map((v, idx) => ({
      ...v,
      global_index: idx,
      previous_video_id: idx > 0 ? allVideos[idx - 1].id : null,
      next_video_id: idx < allVideos.length - 1 ? allVideos[idx + 1].id : null,
    }));

    // Get user progress if authenticated
    let progressMap = {};
    let enrollment = null;
    if (req.user) {
      const [enrollRows] = await pool.query(
        'SELECT * FROM enrollments WHERE user_id = ? AND subject_id = ?',
        [req.user.id, id]
      );
      enrollment = enrollRows[0] || null;

      if (enrollment) {
        const [progressRows] = await pool.query(
          `SELECT vp.* FROM video_progress vp
           JOIN videos v ON vp.video_id = v.id
           JOIN sections s ON v.section_id = s.id
           WHERE vp.user_id = ? AND s.subject_id = ?`,
          [req.user.id, id]
        );
        progressRows.forEach(p => { progressMap[p.video_id] = p; });
      }
    }

    // Compute lock status for each video
    flatVideos.forEach((v, idx) => {
      const progress = progressMap[v.id];
      v.is_completed = progress ? !!progress.is_completed : false;
      v.last_position_seconds = progress ? progress.last_position_seconds : 0;

      if (idx === 0) {
        v.locked = false;
        v.unlock_reason = null;
      } else {
        const prevProgress = progressMap[flatVideos[idx - 1].id];
        const prevCompleted = prevProgress ? !!prevProgress.is_completed : false;
        v.locked = !prevCompleted;
        v.unlock_reason = v.locked ? 'Complete the previous video first' : null;
      }
    });

    // Build tree
    const tree = sections.map(section => ({
      ...section,
      videos: flatVideos.filter(v => v.section_id === section.id),
    }));

    // Compute overall progress
    const totalVideos = flatVideos.length;
    const completedVideos = flatVideos.filter(v => v.is_completed).length;
    const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    res.json({
      subject,
      sections: tree,
      flat_videos: flatVideos,
      progress: {
        total: totalVideos,
        completed: completedVideos,
        percent: progressPercent,
      },
      is_enrolled: !!enrollment,
    });
  } catch (err) {
    console.error('GetSubjectTree error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function enrollInSubject(req, res) {
  try {
    const { id } = req.params;

    const [subject] = await pool.query('SELECT id FROM subjects WHERE id = ? AND is_published = 1', [id]);
    if (subject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND subject_id = ?',
      [req.user.id, id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already enrolled' });
    }

    await pool.query(
      'INSERT INTO enrollments (user_id, subject_id) VALUES (?, ?)',
      [req.user.id, id]
    );

    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAllSubjects, getSubjectById, getSubjectTree, enrollInSubject };
