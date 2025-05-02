const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
};

async function getLastMovieName() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT name FROM movies ORDER BY id DESC LIMIT 1');
    await connection.end();
    return rows.length ? rows[0].name : null;
}

async function scrapeLatestMovies() {
    const bearerToken = 'EQ2KSf4i49LwaT5DyLKfRXrj';
    const latestMovieName = await getLastMovieName();
    const newMovies = [];

    let page = 1;
    let stop = false;

    while (!stop) {
        try {
            const response = await fetch('https://mkvking-scraper.vercel.app/api/movies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify({ page })
            });

            if (!response.ok) {
                console.error(`Failed to fetch page ${page}: ${response.status}`);
                break;
            }

            const data = await response.json();
            if (!data.movies || !Array.isArray(data.movies) || data.movies.length === 0) break;

            for (const movie of data.movies) {
                if (movie.name === latestMovieName) {
                    stop = true;
                    break;
                }
                newMovies.push(movie);
            }

            console.log(`Page ${page}: Collected ${data.movies.length} movies (New so far: ${newMovies.length})`);
            page++;
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            break;
        }
    }

    console.log(`\n✅ Found ${newMovies.length} new movies.`);
    if (newMovies.length > 0) {
        await insertNewMovies(newMovies.reverse()); // Insert from oldest to newest
    }
}

async function insertNewMovies(movies) {
    const connection = await mysql.createConnection(dbConfig);

    for (const movie of movies) {
        try {
            // Insert into movies
            const [result] = await connection.execute(`
                INSERT INTO movies (name, description, duration, quality, rating, release_date, language, iframe_src, poster, poster_alt, url, year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                movie.name,
                movie.description,
                movie.duration?.startsWith('Duration:') ? movie.duration.replace(/^Duration:\s*/, '') : movie.duration,
                movie.quality,
                movie.rating,
                new Date(movie.release_date),
                movie.language,
                movie.iframe_src,
                movie.poster,
                movie.poster_alt,
                movie.url,
                movie.year
            ]);

            const movieId = result.insertId;

            // Insert download links
            for (const link of movie.download_links) {
                await connection.execute(`
                    INSERT INTO download_links (movie_id, label, url)
                    VALUES (?, ?, ?)
                `, [movieId, link.label, link.url]);
            }

            // Insert genres
            for (const genre of movie.genre || []) {
                const [rows] = await connection.execute(`SELECT id FROM genres WHERE name = ?`, [genre]);
                let genreId = rows[0]?.id;

                if (!genreId) {
                    const [genreResult] = await connection.execute(`INSERT INTO genres (name) VALUES (?)`, [genre]);
                    genreId = genreResult.insertId;
                }

                await connection.execute(`
                    INSERT INTO movie_genres (movie_id, genre_id)
                    VALUES (?, ?)
                `, [movieId, genreId]);
            }

            // Insert tags
            for (const tag of movie.tags || []) {
                const [rows] = await connection.execute(`SELECT id FROM tags WHERE name = ?`, [tag]);
                let tagId = rows[0]?.id;

                if (!tagId) {
                    const [tagResult] = await connection.execute(`INSERT INTO tags (name) VALUES (?)`, [tag]);
                    tagId = tagResult.insertId;
                }

                await connection.execute(`
                    INSERT INTO movie_tags (movie_id, tag_id)
                    VALUES (?, ?)
                `, [movieId, tagId]);
            }

            console.log(`✅ Inserted: ${movie.name}`);
        } catch (err) {
            console.error(`❌ Failed to insert movie "${movie.name}":`, err.message);
        }
    }

    await connection.end();
}

scrapeLatestMovies();
