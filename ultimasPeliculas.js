const puppeteer = require("puppeteer");
require("dotenv").config();

const ultimasPeliculas = async (res) => {
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
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    const url = 'https://peliculas10.pro';

    await page.goto(url, { waitUntil: 'networkidle2' });

    const peliculas = await page.$$eval('.items.normal .item.movies', items => {
        return items.map(item => {
            const title = item.querySelector('.data h3 a')?.textContent.trim() || null;
            const link = item.querySelector('.data h3 a')?.href || null;
            const imgSrc = item.querySelector('.poster img')?.src || null;
            const releaseDate = item.querySelector('.data span')?.textContent.trim() || null;
            const id = title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') : null;

            return { id, title, link, imgSrc, releaseDate };
        });
    });

    await browser.close();

    res.json({
        peliculas: peliculas.filter(peli => peli.title && peli.link),
    });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
}finally {
    await browser.close();
  }
};

module.exports = { ultimasPeliculas };