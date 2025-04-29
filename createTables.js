const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
  };

const createTables = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to MySQL!");
      } catch (error) {
        console.error("MySQL connection error:", error.message);
      }

  try {
    // Create movies table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS movies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255),
        description TEXT,
        duration VARCHAR(50),
        quality VARCHAR(50),
        rating DECIMAL(3,1),
        release_date DATE,
        language VARCHAR(100),
        iframe_src VARCHAR(500),
        poster VARCHAR(500),
        poster_alt VARCHAR(255),
        url VARCHAR(500),
        year INT
      );
    `);

    // Create download_links table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS download_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        movie_id INT,
        label VARCHAR(255),
        url VARCHAR(500),
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
      );
    `);

    // Create genres table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS genres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE
      );
    `);

    // Create movie_genres table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS movie_genres (
        movie_id INT,
        genre_id INT,
        PRIMARY KEY (movie_id, genre_id),
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
        FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
      );
    `);

    // Create tags table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE
      );
    `);

    // Create movie_tags table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS movie_tags (
        movie_id INT,
        tag_id INT,
        PRIMARY KEY (movie_id, tag_id),
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ All tables created successfully.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  } finally {
    await connection.end();
  }
};

createTables();
