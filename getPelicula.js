const puppeteer = require("puppeteer");
require("dotenv").config();

const getPelicula = async (req, res) => {
  const nombrePelicula = req.params.nombrePelicula;
  const url = `https://peliculas10.pro/pelicula/${nombrePelicula}/`;

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

      //const doodstreamLinks = allLinks.filter(url => url.includes('doodstream'));
      const streamwishLinks = allLinks.filter(url => url.includes('streamwish'));
      const filteredLinks = streamwishLinks ;

      const [sinopsis, posterSrc, rating] = await Promise.all([
        page.$eval('div[itemprop="description"] p', p => p.textContent.trim()).catch(() => null),
        page.$eval('div.poster img[itemprop="image"]', img => img.src.replace(/w185/, 'w500')).catch(() => null),
        page.$eval('span.valor b#repimdb strong', strong => strong.textContent.trim()).catch(() => null)
      ]);
      

      res.json({
        links: filteredLinks,
        descripcion: sinopsis,
        poster: posterSrc,
        calificacion: rating,
      });
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
