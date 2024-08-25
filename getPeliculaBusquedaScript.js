const puppeteer = require("puppeteer");
require("dotenv").config();

const getPeliculaBusquedaScript = async (req, res) => {
  const nombrePelicula = req.params.nombrePelicula;
  const url = `https://peliculas10.pro/?s=${nombrePelicula.replaceAll(' ', '+')}`;

  const browser = await puppeteer.launch({
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
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extrae el primer enlace de búsqueda y procesa para obtener el slug
    const id = await page.$$eval('div.result-item a', anchors => {
      const href = anchors[0] ? anchors[0].href : null; // Solo el primer enlace
      if (href) {
        // Usa una expresión regular para extraer el slug de la URL
        const slugMatch = href.match(/\/pelicula\/([^\/]+)\/?$/);
        return slugMatch ? slugMatch[1] : null;
      }
      return null;
    });

    // Asegúrate de que se envía solo el string sin estructura adicional
    res.json(id);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
  } finally {
    await browser.close();
  }
};

module.exports = { getPeliculaBusquedaScript };
