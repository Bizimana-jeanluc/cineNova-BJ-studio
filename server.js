const http = require('http');
const url = require('url');
const querystring = require('querystring');
const https = require('https');

// Configuration
const PORT = 3000;
const TMDB_API_KEY = '028e8d9cfa50775d8e0a17c990c7ecac'; // Your actual API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        if (pathname === '/') {
            await serveHomePage(req, res);
        } else if (pathname === '/search') {
            await handleSearch(req, res, query);
        } else if (pathname === '/movie') {
            await handleMovieDetails(req, res, query);
        } else if (pathname === '/watch') {
            await handleWatchMovie(req, res, query);
        } else if (pathname === '/download') {
            await handleDownloadMovie(req, res, query);
        } else if (pathname === '/trending') {
            await serveTrendingPage(req, res);
        } else if (pathname === '/action') {
            await serveActionPage(req, res);
        } else if (pathname === '/api/search') {
            await handleApiSearch(req, res, query);
        } else if (pathname === '/api/trending') {
            await handleApiTrending(req, res);
        } else if (pathname === '/api/action') {
            await handleApiAction(req, res);
        } else if (pathname === '/api/movie-trailer') {
            await handleMovieTrailer(req, res, query);
        } else {
            serve404(req, res);
        }
    } catch (error) {
        console.error('Server error:', error);
        serve500(req, res, error);
    }
});

// Enhanced search with real TMDB data
async function searchMovies(searchTerm) {
    return new Promise((resolve) => {
        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=en-US&page=1`;
        
        https.get(searchUrl, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results && result.results.length > 0) {
                        // Get trailers for each movie
                        const moviesWithTrailers = await Promise.all(
                            result.results.slice(0, 20).map(async (movie) => {
                                const trailer = await getMovieTrailer(movie.id);
                                return {
                                    ...movie,
                                    trailer_key: trailer,
                                    release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
                                    duration: '1h 30m - 2h 30m' // Estimated runtime
                                };
                            })
                        );
                        resolve(moviesWithTrailers);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    console.error('Search parse error:', error);
                    resolve([]);
                }
            });
        }).on('error', (error) => {
            console.error('Search API error:', error);
            resolve([]);
        });
    });
}

// Get movie trailer
async function getMovieTrailer(movieId) {
    return new Promise((resolve) => {
        const trailerUrl = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        
        https.get(trailerUrl, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results && result.results.length > 0) {
                        // Find YouTube trailer
                        const trailer = result.results.find(video => 
                            video.type === 'Trailer' && video.site === 'YouTube'
                        );
                        resolve(trailer ? trailer.key : null);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            resolve(null);
        });
    });
}

// Get trending movies
async function getTrendingMovies() {
    return new Promise((resolve) => {
        const trendingUrl = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`;
        
        https.get(trendingUrl, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results) {
                        // Get trailers for trending movies
                        const moviesWithTrailers = await Promise.all(
                            result.results.slice(0, 12).map(async (movie) => {
                                const trailer = await getMovieTrailer(movie.id);
                                return {
                                    ...movie,
                                    trailer_key: trailer,
                                    release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
                                    duration: '1h 45m - 2h 15m'
                                };
                            })
                        );
                        resolve(moviesWithTrailers);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    resolve([]);
                }
            });
        }).on('error', (error) => {
            resolve([]);
        });
    });
}

// Get action movies
async function getActionMovies() {
    return new Promise((resolve) => {
        const actionUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&sort_by=popularity.desc&page=1`;
        
        https.get(actionUrl, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results) {
                        const moviesWithTrailers = await Promise.all(
                            result.results.slice(0, 12).map(async (movie) => {
                                const trailer = await getMovieTrailer(movie.id);
                                return {
                                    ...movie,
                                    trailer_key: trailer,
                                    release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
                                    duration: '1h 40m - 2h 20m'
                                };
                            })
                        );
                        resolve(moviesWithTrailers);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    resolve([]);
                }
            });
        }).on('error', (error) => {
            resolve([]);
        });
    });
}

// Get movie details with trailer
async function getMovieDetails(movieId) {
    return new Promise((resolve) => {
        const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
        
        https.get(detailsUrl, async (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    const trailer = await getMovieTrailer(movieId);
                    
                    // Enhance with trailer and runtime info
                    result.trailer_key = trailer;
                    result.duration = result.runtime ? 
                        `${Math.floor(result.runtime / 60)}h ${result.runtime % 60}m` : 
                        '1h 30m - 2h 30m';
                    result.release_year = result.release_date ? new Date(result.release_date).getFullYear() : 'N/A';
                    
                    resolve(result);
                } catch (error) {
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            resolve(null);
        });
    });
}

// Route handlers
async function serveHomePage(req, res) {
    try {
        const trendingMovies = await getTrendingMovies();
        
        const html = generateHTML(`
            <div class="hero">
                <h1>🎬 CineNova Pro</h1>
                <p>🚫 Ad-Free Experience • 🎥 HD Trailers • ⚡ Instant Play • 📥 Quick Access</p>
                <div class="search-container">
                    <form action="/search" method="GET" class="hero-search-form">
                        <input type="text" name="q" class="hero-search-input" placeholder="Search 10,000+ movies... Full trailers available!" required>
                        <button type="submit" class="cta-button">🔍 Search Movies</button>
                    </form>
                </div>
            </div>

            <div class="quick-links">
                <a href="/trending" class="quick-link">
                    <span class="link-icon">🔥</span>
                    <span>Trending Now</span>
                </a>
                <a href="/action" class="quick-link">
                    <span class="link-icon">💥</span>
                    <span>Action Packed</span>
                </a>
                <a href="/search?q=comedy" class="quick-link">
                    <span class="link-icon">😂</span>
                    <span>Comedy</span>
                </a>
                <a href="/search?q=2024" class="quick-link">
                    <span class="link-icon">🆕</span>
                    <span>New Releases</span>
                </a>
            </div>

            <h2 class="section-title">🔥 Trending This Week</h2>
            <div class="movies-grid">
                ${trendingMovies.map(movie => `
                    <div class="movie-card">
                        <div class="poster-container">
                            <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'}" 
                                 alt="${movie.title}" 
                                 class="movie-poster"
                                 onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'">
                            ${movie.trailer_key ? '<div class="play-overlay" onclick="watchTrailer(\'' + movie.id + '\')">▶</div>' : ''}
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${movie.title}</div>
                            <div class="movie-meta">
                                <span>${movie.release_year}</span>
                                <span>•</span>
                                <span>${movie.duration}</span>
                                <span class="rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            </div>
                            <div class="movie-description">
                                ${movie.overview ? movie.overview.substring(0, 100) + '...' : 'Full movie trailer available for instant viewing.'}
                            </div>
                            <div class="movie-actions">
                                <button class="watch-btn" onclick="watchMovie('${movie.id}')">🎬 Watch Trailer</button>
                                <button class="info-btn" onclick="viewDetails('${movie.id}')">ℹ️ Details</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, 'CineNova Pro - HD Movie Trailers & Streaming');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Home page error:', error);
        serve500(req, res, error);
    }
}

async function handleSearch(req, res, query) {
    const searchTerm = query.q || '';
    
    if (!searchTerm) {
        res.writeHead(302, { 'Location': '/' });
        res.end();
        return;
    }

    const html = generateHTML(`
        <div class="search-header">
            <button class="back-button" onclick="window.location.href='/'">← Home</button>
            <h2 class="section-title">Search Results for "${searchTerm}"</h2>
        </div>
        
        <div id="searchResults" class="search-results-container">
            <div class="loading-message">
                <div class="spinner"></div>
                <p>🔍 Searching for "${searchTerm}" across TMDB database...</p>
            </div>
        </div>

        <script>
            async function performSearch() {
                try {
                    const response = await fetch('/api/search?q=${encodeURIComponent(searchTerm)}');
                    const data = await response.json();
                    
                    const resultsContainer = document.getElementById('searchResults');
                    
                    if (data.success && data.movies.length > 0) {
                        resultsContainer.innerHTML = \`
                            <div class="search-info">
                                <p>🎉 Found \${data.movies.length} movies • 🎥 HD Trailers • 🚫 No Ads</p>
                            </div>
                            <div class="movies-grid">
                                \${data.movies.map(movie => \`
                                    <div class="movie-card">
                                        <div class="poster-container">
                                            <img src="\${movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'}" 
                                                 alt="\${movie.title}" 
                                                 class="movie-poster"
                                                 onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'">
                                            \${movie.trailer_key ? '<div class="play-overlay" onclick="watchTrailer(\\'' + movie.id + '\\')">▶</div>' : ''}
                                        </div>
                                        <div class="movie-info">
                                            <div class="movie-title">\${movie.title}</div>
                                            <div class="movie-meta">
                                                <span>\${movie.release_year}</span>
                                                <span>•</span>
                                                <span>\${movie.duration}</span>
                                                <span class="rating">★ \${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                                            </div>
                                            <div class="movie-description">
                                                \${movie.overview ? movie.overview.substring(0, 120) + '...' : 'Full trailer available for instant viewing.'}
                                            </div>
                                            <div class="movie-actions">
                                                <button class="watch-btn" onclick="watchMovie('\${movie.id}')">🎬 Watch Trailer</button>
                                                <button class="info-btn" onclick="viewDetails('\${movie.id}')">ℹ️ Details</button>
                                            </div>
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    } else {
                        resultsContainer.innerHTML = \`
                            <div class="no-results">
                                <h3>😔 No movies found for "${searchTerm}"</h3>
                                <p>Try different keywords or check the spelling</p>
                                <button class="cta-button" onclick="window.location.href='/trending'">Browse Trending Movies</button>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultsContainer.innerHTML = \`
                        <div class="error-message">
                            <h3>⚠️ Search failed</h3>
                            <p>Please try again later</p>
                        </div>
                    \`;
                }
            }
            
            performSearch();
        </script>
    `, `Search: ${searchTerm} - CineNova`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

async function handleMovieDetails(req, res, query) {
    const movieId = query.id;
    
    if (!movieId) {
        serve404(req, res);
        return;
    }

    try {
        const movie = await getMovieDetails(movieId);
        
        if (!movie) {
            serve404(req, res);
            return;
        }

        const html = generateHTML(`
            <div class="movie-detail-container">
                <button class="back-button" onclick="window.history.back()">← Back</button>
                
                <div class="movie-detail">
                    <div class="detail-poster-section">
                        <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/400x600/333333/ffffff?text=No+Poster'}" 
                             alt="${movie.title}" 
                             class="detail-poster"
                             onerror="this.src='https://via.placeholder.com/400x600/333333/ffffff?text=No+Poster'">
                        ${movie.trailer_key ? `
                            <button class="trailer-preview-btn" onclick="watchTrailer('${movie.id}')">
                                ▶ Play Trailer
                            </button>
                        ` : ''}
                    </div>
                    <div class="detail-info">
                        <h1>${movie.title}</h1>
                        <div class="detail-meta">
                            <span class="year">${movie.release_year}</span>
                            <span class="rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            <span class="duration">${movie.duration}</span>
                            <span class="ad-free-badge">🚫 No Ads</span>
                        </div>
                        
                        <div class="genres">
                            ${movie.genres ? movie.genres.map(genre => `
                                <span class="genre-tag">${genre.name}</span>
                            `).join('') : ''}
                        </div>
                        
                        <div class="plot">
                            <h3>Overview</h3>
                            <p>${movie.overview || 'An exciting movie with full trailer available for your entertainment.'}</p>
                        </div>
                        
                        <div class="movie-features">
                            <div class="feature">
                                <span class="feature-icon">🎬</span>
                                <span>Full HD Trailer</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">🚫</span>
                                <span>Ad-Free Experience</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">⚡</span>
                                <span>Instant Play</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">📱</span>
                                <span>Mobile Friendly</span>
                            </div>
                        </div>
                        
                        <div class="detail-actions">
                            <button class="detail-watch-btn" onclick="watchTrailer('${movie.id}')">
                                <span class="play-icon">▶</span> Watch Trailer
                            </button>
                            <button class="detail-info-btn" onclick="window.open('https://www.themoviedb.org/movie/${movie.id}', '_blank')">
                                ℹ️ TMDB Info
                            </button>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <h3>Release Date</h3>
                                <p>${movie.release_date || 'Coming Soon'}</p>
                            </div>
                            <div class="info-item">
                                <h3>Rating</h3>
                                <p>${movie.vote_average ? movie.vote_average.toFixed(1) + '/10' : 'N/A'}</p>
                            </div>
                            <div class="info-item">
                                <h3>Runtime</h3>
                                <p>${movie.duration}</p>
                            </div>
                            <div class="info-item">
                                <h3>Status</h3>
                                <p>${movie.status || 'Released'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `, `${movie.title} - CineNova`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Movie details error:', error);
        serve500(req, res, error);
    }
}

async function handleWatchMovie(req, res, query) {
    const movieId = query.id;
    
    if (!movieId) {
        serve404(req, res);
        return;
    }

    try {
        const movie = await getMovieDetails(movieId);
        const trailer = await getMovieTrailer(movieId);

        if (!trailer) {
            const html = generateHTML(`
                <div class="error-container">
                    <button class="back-button" onclick="window.history.back()">← Back</button>
                    <div class="error-message">
                        <h2>🎬 Trailer Not Available</h2>
                        <p>Sorry, the trailer for this movie is not currently available.</p>
                        <button class="cta-button" onclick="window.history.back()">Back to Movie</button>
                    </div>
                </div>
            `, 'Trailer Not Available - CineNova');
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
        }

        const html = generateHTML(`
            <div class="video-player-container">
                <div class="player-header">
                    <button class="back-button" onclick="window.history.back()">← Back</button>
                    <h2>${movie.title} - Official Trailer</h2>
                </div>
                
                <div class="video-wrapper">
                    <div class="video-container">
                        <iframe 
                            id="youtube-player"
                            src="https://www.youtube.com/embed/${trailer}?autoplay=1&controls=1&modestbranding=1&rel=0"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            class="youtube-iframe">
                        </iframe>
                    </div>
                </div>
                
                <div class="player-info">
                    <h3>${movie.title}</h3>
                    <p>${movie.release_year} • ${movie.duration} • ★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                    <div class="player-features">
                        <span>🎬 Full HD Trailer</span>
                        <span>🚫 Ad-Free</span>
                        <span>⚡ Instant Play</span>
                    </div>
                </div>
            </div>
            
            <style>
                .video-player-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #0a0a0a;
                    min-height: 100vh;
                    color: white;
                }
                
                .player-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .player-header h2 {
                    color: white;
                    margin: 0;
                }
                
                .video-wrapper {
                    position: relative;
                    width: 100%;
                    margin-bottom: 20px;
                }
                
                .video-container {
                    position: relative;
                    width: 100%;
                    height: 0;
                    padding-bottom: 56.25%; /* 16:9 aspect ratio */
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .youtube-iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                
                .player-info {
                    text-align: center;
                    padding: 20px;
                }
                
                .player-info h3 {
                    font-size: 1.5em;
                    margin-bottom: 10px;
                    color: white;
                }
                
                .player-features {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 15px;
                    flex-wrap: wrap;
                }
                
                .player-features span {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 0.9em;
                }
            </style>
        `, `Watch ${movie.title} - CineNova`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Watch movie error:', error);
        serve500(req, res, error);
    }
}

async function handleDownloadMovie(req, res, query) {
    const movieId = query.id;
    
    // For demo purposes, we'll redirect to TMDB page
    // In a real app, you'd handle actual downloads
    res.writeHead(302, { 
        'Location': `https://www.themoviedb.org/movie/${movieId}` 
    });
    res.end();
}

async function serveTrendingPage(req, res) {
    try {
        const trendingMovies = await getTrendingMovies();
        
        const html = generateHTML(`
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='/'">← Home</button>
                <h1 class="page-title">🔥 Trending Movies This Week</h1>
            </div>
            
            <div class="movies-grid">
                ${trendingMovies.map(movie => `
                    <div class="movie-card">
                        <div class="poster-container">
                            <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'}" 
                                 alt="${movie.title}" 
                                 class="movie-poster"
                                 onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'">
                            ${movie.trailer_key ? '<div class="play-overlay" onclick="watchTrailer(\'' + movie.id + '\')">▶</div>' : ''}
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${movie.title}</div>
                            <div class="movie-meta">
                                <span>${movie.release_year}</span>
                                <span>•</span>
                                <span>${movie.duration}</span>
                                <span class="rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            </div>
                            <div class="movie-actions">
                                <button class="watch-btn" onclick="watchMovie('${movie.id}')">🎬 Watch Trailer</button>
                                <button class="info-btn" onclick="viewDetails('${movie.id}')">ℹ️ Details</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, 'Trending Movies - CineNova');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Trending page error:', error);
        serve500(req, res, error);
    }
}

async function serveActionPage(req, res) {
    try {
        const actionMovies = await getActionMovies();
        
        const html = generateHTML(`
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='/'">← Home</button>
                <h1 class="page-title">💥 Action Movies</h1>
            </div>
            
            <div class="movies-grid">
                ${actionMovies.map(movie => `
                    <div class="movie-card">
                        <div class="poster-container">
                            <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'}" 
                                 alt="${movie.title}" 
                                 class="movie-poster"
                                 onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Poster'">
                            ${movie.trailer_key ? '<div class="play-overlay" onclick="watchTrailer(\'' + movie.id + '\')">▶</div>' : ''}
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${movie.title}</div>
                            <div class="movie-meta">
                                <span>${movie.release_year}</span>
                                <span>•</span>
                                <span>${movie.duration}</span>
                                <span class="rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            </div>
                            <div class="movie-actions">
                                <button class="watch-btn" onclick="watchMovie('${movie.id}')">🎬 Watch Trailer</button>
                                <button class="info-btn" onclick="viewDetails('${movie.id}')">ℹ️ Details</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, 'Action Movies - CineNova');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Action page error:', error);
        serve500(req, res, error);
    }
}

// API handlers
async function handleApiSearch(req, res, query) {
    const searchTerm = query.q || '';
    
    try {
        const movies = await searchMovies(searchTerm);
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: true, 
            searchTerm,
            count: movies.length,
            movies: movies
        }));
    } catch (error) {
        console.error('API search error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: false, 
            error: 'Search failed'
        }));
    }
}

async function handleApiTrending(req, res) {
    try {
        const movies = await getTrendingMovies();
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: true, 
            count: movies.length,
            movies: movies
        }));
    } catch (error) {
        console.error('API trending error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch trending movies'
        }));
    }
}

async function handleApiAction(req, res) {
    try {
        const movies = await getActionMovies();
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: true, 
            count: movies.length,
            movies: movies
        }));
    } catch (error) {
        console.error('API action error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch action movies'
        }));
    }
}

async function handleMovieTrailer(req, res, query) {
    const movieId = query.id;
    
    try {
        const trailer = await getMovieTrailer(movieId);
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: true, 
            trailer_key: trailer
        }));
    } catch (error) {
        console.error('Trailer API error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch trailer'
        }));
    }
}

// Utility functions
function serve404(req, res) {
    const html = generateHTML(`
        <div class="error-container">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <button class="cta-button" onclick="window.location.href='/'">Go Home</button>
        </div>
    `, '404 - Page Not Found');
    
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(html);
}

function serve500(req, res, error) {
    const html = generateHTML(`
        <div class="error-container">
            <h1>500 - Server Error</h1>
            <p>Something went wrong on our end.</p>
            <button class="cta-button" onclick="window.location.href='/'">Go Home</button>
        </div>
    `, '500 - Server Error');
    
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(html);
}

function generateHTML(content, title = 'CineNova Pro') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
            color: #ffffff;
            min-height: 100vh;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Header & Navigation */
        .hero {
            text-align: center;
            padding: 60px 20px;
            background: linear-gradient(135deg, rgba(255,0,150,0.1) 0%, rgba(0,204,255,0.1) 100%);
            border-radius: 20px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
        }
        
        .hero h1 {
            font-size: 3.5em;
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ff0080, #00ccff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .hero p {
            font-size: 1.3em;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        
        /* Search Form */
        .hero-search-form {
            display: flex;
            max-width: 600px;
            margin: 0 auto;
            gap: 10px;
        }
        
        .hero-search-input {
            flex: 1;
            padding: 15px 20px;
            border: none;
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 1.1em;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .hero-search-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .cta-button {
            padding: 15px 30px;
            background: linear-gradient(45deg, #ff0080, #00ccff);
            border: none;
            border-radius: 50px;
            color: white;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 0, 128, 0.3);
        }
        
        /* Quick Links */
        .quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }
        
        .quick-link {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            text-decoration: none;
            color: white;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .quick-link:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-3px);
        }
        
        .link-icon {
            font-size: 1.5em;
        }
        
        /* Movies Grid */
        .section-title {
            font-size: 2.2em;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .movies-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .movie-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .movie-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
            background: rgba(255, 255, 255, 0.08);
        }
        
        .poster-container {
            position: relative;
            width: 100%;
            height: 400px;
            overflow: hidden;
        }
        
        .movie-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .movie-card:hover .movie-poster {
            transform: scale(1.05);
        }
        
        .play-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            cursor: pointer;
            font-size: 3em;
            color: white;
        }
        
        .poster-container:hover .play-overlay {
            opacity: 1;
        }
        
        .movie-info {
            padding: 20px;
        }
        
        .movie-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        
        .movie-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-size: 0.9em;
            opacity: 0.8;
            flex-wrap: wrap;
        }
        
        .rating {
            color: #ffd700;
            font-weight: bold;
        }
        
        .movie-description {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 15px;
            line-height: 1.4;
        }
        
        .movie-actions {
            display: flex;
            gap: 10px;
        }
        
        .watch-btn, .info-btn, .download-btn {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 8px;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .watch-btn {
            background: linear-gradient(45deg, #ff0080, #00ccff);
            color: white;
        }
        
        .info-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .watch-btn:hover, .info-btn:hover {
            transform: translateY(-2px);
        }
        
        /* Back Button */
        .back-button {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            cursor: pointer;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        
        .back-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        /* Movie Detail Page */
        .movie-detail {
            display: grid;
            grid-template-columns: 400px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .detail-poster {
            width: 100%;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .detail-info h1 {
            font-size: 2.5em;
            margin-bottom: 15px;
        }
        
        .detail-meta {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .ad-free-badge {
            background: linear-gradient(45deg, #00ff88, #00ccff);
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .genres {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .genre-tag {
            background: rgba(255, 255, 255, 0.1);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .plot {
            margin-bottom: 30px;
        }
        
        .plot h3 {
            margin-bottom: 10px;
            font-size: 1.3em;
        }
        
        .movie-features {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .feature-icon {
            font-size: 1.2em;
        }
        
        .detail-actions {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .detail-watch-btn, .detail-download-btn, .detail-info-btn {
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
        }
        
        .detail-watch-btn {
            background: linear-gradient(45deg, #ff0080, #00ccff);
            color: white;
        }
        
        .detail-info-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .detail-watch-btn:hover, .detail-info-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(255, 0, 128, 0.3);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        
        .info-item h3 {
            margin-bottom: 5px;
            opacity: 0.8;
            font-size: 0.9em;
        }
        
        /* Loading and Error States */
        .loading-message, .no-results, .error-message {
            text-align: center;
            padding: 60px 20px;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.1);
            border-top: 5px solid #00ccff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-container {
            text-align: center;
            padding: 100px 20px;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5em;
            }
            
            .hero-search-form {
                flex-direction: column;
            }
            
            .movie-detail {
                grid-template-columns: 1fr;
            }
            
            .detail-actions {
                flex-direction: column;
            }
            
            .movies-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
            
            .info-grid, .movie-features {
                grid-template-columns: 1fr;
            }
        }
        
        /* Search Header */
        .search-header {
            margin-bottom: 30px;
        }
        
        .page-header {
            margin-bottom: 30px;
        }
        
        .page-title {
            font-size: 2.5em;
            text-align: center;
            margin: 20px 0;
        }
        
        .search-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
        }
        
        /* Trailer Preview Button */
        .trailer-preview-btn {
            width: 100%;
            padding: 15px;
            margin-top: 15px;
            background: linear-gradient(45deg, #ff0080, #00ccff);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .trailer-preview-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 0, 128, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
    
    <script>
        // Global functions for movie actions
        function watchMovie(movieId) {
            window.location.href = '/watch?id=' + movieId;
        }
        
        function watchTrailer(movieId) {
            window.location.href = '/watch?id=' + movieId;
        }
        
        function viewDetails(movieId) {
            window.location.href = '/movie?id=' + movieId;
        }
        
        function downloadMovie(movieId) {
            window.location.href = '/download?id=' + movieId;
        }
        
        // Handle YouTube iframe API
        function onYouTubeIframeAPIReady() {
            // YouTube API ready
        }
    </script>
</body>
</html>`;
}

// Start server
server.listen(PORT, () => {
    console.log(`🎬 CineNova Pro Server running at http://localhost:${PORT}`);
    console.log(`🚀 Features: HD Trailers • Ad-Free • Full Video Controls`);
    console.log(`📡 TMDB API: Connected with key ${TMDB_API_KEY.substring(0, 8)}...`);
});
