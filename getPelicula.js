const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Usar un Map para almacenar la caché
let cachePelicula = new Map();
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 horas
const CACHE_FILE_PATH = path.join(__dirname, 'cachePelicula.json');

// Función para cargar la caché desde el archivo JSON al iniciar
const loadCacheFromFile = () => {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
    const jsonData = JSON.parse(data);
    const currentTime = Date.now();

    // Restaurar el cache en memoria si aún es válido
    for (const [key, value] of Object.entries(jsonData)) {
      if ((currentTime - value.timestamp) < CACHE_DURATION_MS) {
        cachePelicula.set(key, value);
      }
    }
  }
};

// Función para guardar la caché en un archivo JSON
const saveCacheToFile = () => {
  const cacheData = Object.fromEntries(cachePelicula);
  fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData), 'utf-8');
};

// Cargar la caché desde el archivo al iniciar el servidor
loadCacheFromFile();

const getPelicula = async (req, res) => {
  const nombrePelicula = req.params.nombrePelicula;
  const url = `https://peliculas10.pro/pelicula/${nombrePelicula}/`;

  // Verificar si la película está en caché y si la caché es válida
  const cachedEntry = cachePelicula.get(nombrePelicula);
  const currentTime = Date.now();

  if (cachedEntry && (currentTime - cachedEntry.timestamp) < CACHE_DURATION_MS) {
    // Devolver los datos cacheados si son válidos
    return res.json(cachedEntry.data);
  }

  const browser = await puppeteer.launch({
    headless: "new", // Usar la nueva implementación headless para mayor velocidad
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
    await page.goto(url, { waitUntil: 'load' });

    const frameElement = await page.waitForSelector('#dooplay_player_content iframe');
    const frame = await frameElement.contentFrame();

    if (frame) {
      const allLinks = await frame.$$eval('div.OD_1.REactiv li', items =>
        items.map(item => {
          const onclickValue = item.getAttribute('onclick');
          const urlMatch = onclickValue && onclickValue.match(/go_to_playerVast\('([^']+)'/);
          return urlMatch ? urlMatch[1] : null;
        }).filter(url => url !== null)
      );

      const streamwishLinks = allLinks.filter(url => url.includes('streamwish'));

      const [sinopsis, posterSrc, rating] = await Promise.all([
        page.$eval('div[itemprop="description"] p', p => p.textContent.trim()).catch(() => null),
        page.$eval('div.poster img[itemprop="image"]', img => img.src.replace(/w185/, 'w500')).catch(() => null),
        page.$eval('span.valor b#repimdb strong', strong => strong.textContent.trim()).catch(() => null)
      ]);

      const responseData = {
        links: allLinks,
        descripcion: sinopsis,
        poster: posterSrc,
        calificacion: rating,
      };

      // Guardar los datos en el caché
      cachePelicula.set(nombrePelicula, {
        data: responseData,
        timestamp: Date.now(),
      });

      // Guardar la caché en el archivo JSON
      saveCacheToFile();

      // Devolver los datos obtenidos
      res.json(responseData);
    } else {
      res.status(404).json({ error: 'No se encontró el iframe.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
  } finally {
    await browser.close();
  }
};

module.exports = { getPelicula };
