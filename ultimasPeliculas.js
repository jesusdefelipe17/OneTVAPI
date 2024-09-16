const puppeteer = require("puppeteer");
require("dotenv").config();

// Cachear datos durante un tiempo definido
let cachedData = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // Cache por 24 horas

const ultimasPeliculas = async (res) => {
  const currentTime = Date.now();
  if (cachedData && (currentTime - lastCacheTime) < CACHE_DURATION_MS) {
    return res.json({ peliculas: cachedData });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        "--disable-dev-shm-usage", // Importante en entornos Docker
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();

    // Configurar la interceptación de solicitudes antes de navegar
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
        req.abort(); // Cancelar recursos no necesarios
      } else {
        req.continue();
      }
    });

    // Reducir el tamaño del viewport
    await page.setViewport({ width: 1200, height: 800 });

    const url = 'https://peliculas10.pro';

    // Cargar la página usando una estrategia de carga rápida
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extraer los datos esenciales
    const peliculas = await page.$$eval('.items.normal .item.movies', items => {
      return items.map(item => {
        const title = item.querySelector('.poster a')?.href || null;
        if (!title) return null;

        const parts = title.split('/');
        const id = parts[parts.length - 2];
        const link = item.querySelector('.data h3 a')?.href || null;
        const imgSrc = item.querySelector('.poster img')?.src || null;
        const releaseDate = item.querySelector('.data span')?.textContent.trim() || null;
        const title2 = item.querySelector('.data h3 a')?.textContent.trim() || null;

        return { id, title, link, imgSrc, releaseDate, title2 };
      }).filter(peli => peli !== null);
    });

    // Actualizar los datos cacheados y el tiempo de caché
    cachedData = peliculas;
    lastCacheTime = Date.now();

    // Devolver los datos cacheados
    res.json({ peliculas });
  } catch (error) {
    console.error('Error en el proceso de Puppeteer:', error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
  } finally {
    if (browser) {
      await browser.close(); // Asegurarse de cerrar el navegador en caso de error
    }
  }
};

module.exports = { ultimasPeliculas };
