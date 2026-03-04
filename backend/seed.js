const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
require('dotenv').config();

function extractYoutubeUrl(iframeOrUrl) {
  if (!iframeOrUrl) return '';
  const srcMatch = iframeOrUrl.match(/src="([^"]+)"/);
  if (srcMatch) return srcMatch[1].split('?')[0];
  return iframeOrUrl.trim();
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to database');

  const workbook = XLSX.readFile('C:/Users/theal/OneDrive/Desktop/CourseDb.xlsx');
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  console.log(`Read ${data.length} rows from Excel`);

  // Group by subject
  const subjectGroups = {};
  data.forEach(row => {
    const title = (row.subject_title || '').trim();
    if (!title) return;
    if (!subjectGroups[title]) {
      subjectGroups[title] = { description: (row.subject_description || '').trim(), rows: [] };
    }
    subjectGroups[title].rows.push(row);
  });

  const stats = { subjects: 0, sections: 0, videos: 0 };

  for (const [subjectTitle, group] of Object.entries(subjectGroups)) {
    // Create subject
    let [existing] = await conn.query('SELECT id FROM subjects WHERE title = ?', [subjectTitle]);
    let subjectId;
    if (existing.length > 0) {
      subjectId = existing[0].id;
      console.log(`  Subject exists: "${subjectTitle}" (id=${subjectId})`);
    } else {
      const [result] = await conn.query(
        'INSERT INTO subjects (title, description, is_published) VALUES (?, ?, 1)',
        [subjectTitle, group.description]
      );
      subjectId = result.insertId;
      stats.subjects++;
      console.log(`  Created subject: "${subjectTitle}" (id=${subjectId})`);
    }

    // Group by section within subject
    const sectionGroups = {};
    group.rows.forEach(row => {
      const sectionTitle = (row.section_title || '').trim();
      if (!sectionGroups[sectionTitle]) sectionGroups[sectionTitle] = [];
      sectionGroups[sectionTitle].push(row);
    });

    // Sort sections by minimum video_order
    const sectionEntries = Object.entries(sectionGroups).map(([title, rows]) => ({
      title,
      rows,
      minOrder: Math.min(...rows.map(r => r.video_order || 0)),
    }));
    sectionEntries.sort((a, b) => a.minOrder - b.minOrder);

    let sectionOrderIndex = 1;
    for (const section of sectionEntries) {
      let [existingSection] = await conn.query(
        'SELECT id FROM sections WHERE subject_id = ? AND title = ?',
        [subjectId, section.title]
      );
      let sectionId;
      if (existingSection.length > 0) {
        sectionId = existingSection[0].id;
      } else {
        const [result] = await conn.query(
          'INSERT INTO sections (subject_id, title, order_index) VALUES (?, ?, ?)',
          [subjectId, section.title, sectionOrderIndex]
        );
        sectionId = result.insertId;
        stats.sections++;
      }
      sectionOrderIndex++;

      // Insert videos
      const sortedRows = section.rows.sort((a, b) => (a.video_order || 0) - (b.video_order || 0));
      let videoOrderIndex = 1;
      for (const row of sortedRows) {
        const videoTitle = (row.video_title || '').trim();
        const youtubeUrl = extractYoutubeUrl(row.youtube_url || '');
        if (!videoTitle || !youtubeUrl) continue;

        const [existingVideo] = await conn.query(
          'SELECT id FROM videos WHERE section_id = ? AND title = ?',
          [sectionId, videoTitle]
        );
        if (existingVideo.length === 0) {
          await conn.query(
            'INSERT INTO videos (section_id, title, youtube_url, order_index) VALUES (?, ?, ?, ?)',
            [sectionId, videoTitle, youtubeUrl, videoOrderIndex]
          );
          stats.videos++;
        }
        videoOrderIndex++;
      }
    }
  }

  console.log('\nImport complete!');
  console.log(`  Subjects created: ${stats.subjects}`);
  console.log(`  Sections created: ${stats.sections}`);
  console.log(`  Videos created: ${stats.videos}`);

  // Verify
  const [subjects] = await conn.query('SELECT COUNT(*) as c FROM subjects');
  const [sections] = await conn.query('SELECT COUNT(*) as c FROM sections');
  const [videos] = await conn.query('SELECT COUNT(*) as c FROM videos');
  console.log(`\nDatabase totals: ${subjects[0].c} subjects, ${sections[0].c} sections, ${videos[0].c} videos`);

  await conn.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
