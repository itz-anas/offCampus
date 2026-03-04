const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const { pool } = require('../config/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `import-${Date.now()}.xlsx`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function extractYoutubeUrl(iframeOrUrl) {
  if (!iframeOrUrl) return '';
  // Extract src from iframe tag
  const srcMatch = iframeOrUrl.match(/src="([^"]+)"/);
  if (srcMatch) {
    return srcMatch[1].split('?')[0]; // Remove query params
  }
  return iframeOrUrl.trim();
}

function extractYoutubeId(url) {
  const match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const match2 = url.match(/v=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  return null;
}

async function importExcel(req, res) {
  const conn = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Validate required columns
    const requiredCols = ['subject_title', 'section_title', 'section_order', 'video_title', 'video_order', 'youtube_url'];
    const firstRow = data[0];
    const missingCols = requiredCols.filter(col => !(col in firstRow));
    if (missingCols.length > 0) {
      return res.status(400).json({ error: `Missing columns: ${missingCols.join(', ')}` });
    }

    await conn.beginTransaction();

    const stats = { subjects_created: 0, sections_created: 0, videos_created: 0, errors: [] };
    const subjectCache = {};
    const sectionCache = {};

    // Group by subject
    const subjectGroups = {};
    data.forEach((row, idx) => {
      const subjectTitle = (row.subject_title || '').trim();
      if (!subjectTitle) {
        stats.errors.push(`Row ${idx + 2}: missing subject_title`);
        return;
      }
      if (!subjectGroups[subjectTitle]) {
        subjectGroups[subjectTitle] = { description: (row.subject_description || '').trim(), rows: [] };
      }
      subjectGroups[subjectTitle].rows.push(row);
    });

    for (const [subjectTitle, group] of Object.entries(subjectGroups)) {
      // Create or find subject
      let subjectId;
      const [existingSubject] = await conn.query('SELECT id FROM subjects WHERE title = ?', [subjectTitle]);
      if (existingSubject.length > 0) {
        subjectId = existingSubject[0].id;
      } else {
        const [result] = await conn.query(
          'INSERT INTO subjects (title, description, is_published) VALUES (?, ?, 1)',
          [subjectTitle, group.description]
        );
        subjectId = result.insertId;
        stats.subjects_created++;
      }
      subjectCache[subjectTitle] = subjectId;

      // Group rows by section within this subject
      const sectionGroups = {};
      group.rows.forEach(row => {
        const sectionTitle = (row.section_title || '').trim();
        if (!sectionGroups[sectionTitle]) {
          sectionGroups[sectionTitle] = [];
        }
        sectionGroups[sectionTitle].push(row);
      });

      // Determine section ordering: use the minimum video_order in each section
      const sectionEntries = Object.entries(sectionGroups).map(([title, rows]) => ({
        title,
        rows,
        minVideoOrder: Math.min(...rows.map(r => r.video_order || 0)),
      }));
      sectionEntries.sort((a, b) => a.minVideoOrder - b.minVideoOrder);

      let sectionOrderIndex = 1;
      for (const sectionEntry of sectionEntries) {
        const sectionKey = `${subjectId}:${sectionEntry.title}`;
        let sectionId;

        const [existingSection] = await conn.query(
          'SELECT id FROM sections WHERE subject_id = ? AND title = ?',
          [subjectId, sectionEntry.title]
        );

        if (existingSection.length > 0) {
          sectionId = existingSection[0].id;
        } else {
          const [result] = await conn.query(
            'INSERT INTO sections (subject_id, title, order_index) VALUES (?, ?, ?)',
            [subjectId, sectionEntry.title, sectionOrderIndex]
          );
          sectionId = result.insertId;
          stats.sections_created++;
        }
        sectionCache[sectionKey] = sectionId;
        sectionOrderIndex++;

        // Insert videos for this section
        const sortedRows = sectionEntry.rows.sort((a, b) => (a.video_order || 0) - (b.video_order || 0));
        let videoOrderIndex = 1;
        for (const row of sortedRows) {
          const videoTitle = (row.video_title || '').trim();
          const rawUrl = row.youtube_url || '';
          const youtubeUrl = extractYoutubeUrl(rawUrl);

          if (!videoTitle || !youtubeUrl) {
            stats.errors.push(`Skipped video: missing title or URL in section "${sectionEntry.title}"`);
            continue;
          }

          const [existingVideo] = await conn.query(
            'SELECT id FROM videos WHERE section_id = ? AND title = ?',
            [sectionId, videoTitle]
          );

          if (existingVideo.length === 0) {
            await conn.query(
              'INSERT INTO videos (section_id, title, youtube_url, order_index) VALUES (?, ?, ?, ?)',
              [sectionId, videoTitle, youtubeUrl, videoOrderIndex]
            );
            stats.videos_created++;
          }
          videoOrderIndex++;
        }
      }
    }

    await conn.commit();

    res.json({
      message: 'Import completed successfully',
      summary: stats,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  } finally {
    conn.release();
  }
}

async function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('DeleteSubject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function togglePublish(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const newStatus = rows[0].is_published ? 0 : 1;
    await pool.query('UPDATE subjects SET is_published = ? WHERE id = ?', [newStatus, id]);
    res.json({ message: `Subject ${newStatus ? 'published' : 'unpublished'}`, is_published: !!newStatus });
  } catch (err) {
    console.error('TogglePublish error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAllSubjectsAdmin(req, res) {
  try {
    const [subjects] = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM sections sec WHERE sec.subject_id = s.id) as section_count,
        (SELECT COUNT(*) FROM videos v JOIN sections sec ON v.section_id = sec.id WHERE sec.subject_id = s.id) as video_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id) as enrollment_count
      FROM subjects s
      ORDER BY s.created_at DESC
    `);
    res.json({ subjects });
  } catch (err) {
    console.error('GetAllSubjectsAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { upload, importExcel, deleteSubject, togglePublish, getAllSubjectsAdmin };
