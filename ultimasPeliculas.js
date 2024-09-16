const puppeteer = require("puppeteer");
require("dotenv").config();

// Cachear datos durante un tiempo definido
let cachedData = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24 // Cache por 5 minutos

const ultimasPeliculas = async (res) => {
  // Comprobar si los datos cacheados aún son válidos
  const currentTime = Date.now();
  if (cachedData && (currentTime - lastCacheTime) < CACHE_DURATION_MS) {
    return res.json({ peliculas: cachedData });
  }

  const browser = await puppeteer.launch({
    headless: "new", // Usar la nueva implementación headless
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

  try {
    const page = await browser.newPage();

    // Interceptar y bloquear solicitudes de recursos innecesarios
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
        req.abort(); // Cancelar imágenes, estilos, fuentes y scripts
      } else {
        req.continue();
      }
    });

    // Reducir el tamaño del viewport
    await page.setViewport({ width: 1200, height: 800 });

    const url = 'https://peliculas10.pro';

    // Usar la estrategia de carga rápida
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extraer solo los datos esenciales
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
      }).filter(peli => peli !== null); // Filtrar nulos directamente aquí
    });

    // Actualizar los datos cacheados y el tiempo de caché
    cachedData = peliculas;
    lastCacheTime = Date.now();

    // Cerrar el navegador lo antes posible
    await browser.close();

    // Devolver los datos cacheados
    res.json({ peliculas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { ultimasPeliculas };
