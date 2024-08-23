const express = require("express");
const { ultimasPeliculas } = require("./ultimasPeliculas");
const { getPelicula } = require("./getPelicula");
const app = express();

const PORT = process.env.PORT || 4000;

app.get("/ultimasPeliculas", (req, res) => {
    ultimasPeliculas(res);
});

app.get("/getPelicula/:nombrePelicula", (req, res) => {
    getPelicula(req, res);
});

app.get("/", (req, res) => {
  res.send("servidor levantado de Peliculas");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});



/*
const express = require('express');
const cors = require('cors');
const app = express();
require("dotenv").config();

app.use(cors());

let chrome;
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    chrome = require("chrome-aws-lambda");
    puppeteer = require("puppeteer-core");
} else {
    puppeteer = require("puppeteer");
}

app.get('/getPelicula/:nombrePelicula', async (req, res) => {

    let options = {};

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        options = {
            args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        };
    }

    try {
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        const nombrePelicula = req.params.nombrePelicula;
        const url = `https://peliculas10.pro/pelicula/${nombrePelicula}/`;

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

            const doodstreamLinks = allLinks.filter(url => url.includes('doodstream'));
            const streamwishLinks = allLinks.filter(url => url.includes('streamwish'));
            const filteredLinks = doodstreamLinks.length > 0 ? doodstreamLinks : streamwishLinks;

            const [sinopsis, posterSrc, rating] = await Promise.all([
                page.$eval('div[itemprop="description"] p', p => p.textContent.trim()),
                page.$eval('div.poster img[itemprop="image"]', img => img.src.replace(/w185/, 'w500')),
                page.$eval('span.valor b#repimdb strong', strong => strong.textContent.trim())
            ]);

            await browser.close();

            res.json({
                links: filteredLinks,
                descripcion: sinopsis,
                poster: posterSrc,
                calificacion: rating,
            });
        } else {
            await browser.close();
            res.status(404).json({ error: 'No se encontró el iframe.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
    }
});

app.get('/ultimasPeliculas', async (req, res) => {

    let options = {};

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        options = {
            args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        };
    }


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
    }
});

app.get('/ok', async (req, res) => {
    res.json({
        "OK": "Levantado",
    });
});


app.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});

module.exports = app;
*/