const puppeteer = require("puppeteer");
require("dotenv").config();
const https = require("https");

const PING_INTERVAL_MS = 1000 * 60 * 20; // 20 minutos

// Cachear datos durante un tiempo definido
let cachedData = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // Cache por 24 horas

const ultimasPeliculas = async (res) => {
  const currentTime = Date.now();
  
  // Comprobar si los datos cacheados aún son válidos
  if (cachedData && (currentTime - lastCacheTime) < CACHE_DURATION_MS) {
    return res.json({ peliculas: cachedData });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    const url = 'https://peliculas10.pro';

    await page.goto(url, { waitUntil: 'networkidle2' });

    const peliculas = await page.$$eval('.items.normal .item.movies', items => {
      return items.map(item => {
        const title = item.querySelector('.poster a')?.href || null;
        const parts = title.split('/');
        const id = parts[parts.length - 2];
        const link = item.querySelector('.data h3 a')?.href || null;
        const imgSrc = item.querySelector('.poster img')?.src || null;
        const releaseDate = item.querySelector('.data span')?.textContent.trim() || null;
        const title2 = item.querySelector('.data h3 a')?.textContent.trim() || null;

        return { id, title, link, imgSrc, releaseDate, title2 };
      });
    });

    // Actualizar los datos cacheados y el tiempo de caché
    cachedData = peliculas.filter(peli => peli.title && peli.link);
    lastCacheTime = Date.now();

    await browser.close();

    res.json({ peliculas: cachedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
  } finally {
    if (browser) {
      await browser.close(); // Asegurarse de cerrar el navegador en caso de error
    }
  }
};

// Función para hacer un "ping" al servidor cada 20 minutos
const keepServerAwake = () => {
  const url = process.env.SERVER_URL; // Reemplaza esto con la URL de tu servidor
  if (url) {
    setInterval(() => {
      console.log(`Haciendo ping a ${url} para mantener el servidor despierto...`);
      https.get(url, (res) => {
        console.log(`Ping a servidor completado. Status Code: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error(`Error haciendo ping: ${err.message}`);
      });
    }, PING_INTERVAL_MS);
  }
};

keepServerAwake(); // Llamamos a la función para mantener el servidor activo

module.exports = { ultimasPeliculas };
