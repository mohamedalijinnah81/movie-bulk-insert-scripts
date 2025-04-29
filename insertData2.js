const mysql = require('mysql2/promise');
const fs = require('fs');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: '',
};

const insertData = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL!");
  } catch (error) {
    console.error("MySQL connection error:", error.message);
    return;
  }

  const rawData = fs.readFileSync('./movies.json', 'utf-8');
  const { movies } = JSON.parse(rawData);

  for (const movie of movies) {
    let transaction;
    try {
      // Start a transaction
      transaction = await connection.beginTransaction();

      // Insert into movies
      const [movieInsert] = await connection.execute(`
        INSERT INTO movies (name, description, duration, quality, rating, release_date, language, iframe_src, poster, poster_alt, url, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movie.name,
        movie.description,
        movie.duration,
        movie.quality,
        movie.rating,
        new Date(movie.release_date),
        movie.language,
        movie.iframe_src,
        movie.poster,
        movie.poster_alt,
        movie.url,
        movie.year,
      ]);
      
      const movieId = movieInsert.insertId;

      // Insert download_links
      for (const link of movie.download_links) {
        await connection.execute(`
          INSERT INTO download_links (movie_id, label, url)
          VALUES (?, ?, ?)
        `, [movieId, link.label, link.url]);
      }

      // Insert genres and movie_genres
      for (const genreName of movie.genre) {
        const [genreRows] = await connection.execute(`SELECT id FROM genres WHERE name = ?`, [genreName]);
        let genreId = genreRows.length ? genreRows[0].id : null;

        if (!genreId) {
          const [result] = await connection.execute(`INSERT INTO genres (name) VALUES (?)`, [genreName]);
          genreId = result.insertId;
        }

        await connection.execute(`INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)`, [movieId, genreId]);
      }

      // Insert tags and movie_tags
      for (const tagName of movie.tags) {
        const [tagRows] = await connection.execute(`SELECT id FROM tags WHERE name = ?`, [tagName]);
        let tagId = tagRows.length ? tagRows[0].id : null;

        if (!tagId) {
          const [result] = await connection.execute(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
          tagId = result.insertId;
        }

        await connection.execute(`INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)`, [movieId, tagId]);
      }

      // Commit the transaction
      await connection.commit();
      console.log(`✅ Inserted movie: ${movie.name}`);

    } catch (err) {
      if (transaction) {
        // Rollback the transaction on error
        await connection.rollback();
      }
      console.error(`❌ Error inserting movie ${movie.name}:`, err.message);
    }
  }

  await connection.end();
  console.log("✅ Done inserting all data");
};

insertData();
