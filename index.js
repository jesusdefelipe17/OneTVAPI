const puppeteer = require('puppeteer'); // Usa puppeteer en lugar de puppeteer-core
const express = require('express');
const cors = require('cors');
const app = express();

// Habilitar CORS para todas las solicitudes
app.use(cors());

// Función para inicializar Puppeteer
async function launchBrowser() {
    return await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Puedes agregar otras opciones si es necesario
    });
}

// Endpoint para obtener datos de una película
app.get('/getPelicula/:nombrePelicula', async (req, res) => {
    try {
        const nombrePelicula = req.params.nombrePelicula;
        const url = `https://peliculas10.pro/pelicula/${nombrePelicula}/`;
        
        const browser = await launchBrowser();
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

            // Filtrar enlaces que contienen 'doodstream' o 'streamwish'
            const doodstreamLinks = allLinks.filter(url => url.includes('doodstream'));
            const streamwishLinks = allLinks.filter(url => url.includes('streamwish'));

            // Priorizar 'doodstream' si está disponible, sino usar 'streamwish'
            const filteredLinks = doodstreamLinks.length > 0 ? doodstreamLinks : streamwishLinks;

            const [sinopsis, posterSrc, rating] = await Promise.all([
                page.waitForSelector('div[itemprop="description"] p')
                    .then(() => page.$eval('div[itemprop="description"] p', p => p.textContent.trim())),
                
                page.waitForSelector('div.poster img[itemprop="image"]')
                    .then(() => page.$eval('div.poster img[itemprop="image"]', img => img.src.replace(/w185/, 'w500'))), // Cambiar la resolución aquí
                
                page.waitForSelector('span.valor b#repimdb strong')
                    .then(() => page.$eval('span.valor b#repimdb strong', strong => strong.textContent.trim()))
            ]);

            await browser.close();

            res.json({
                links: filteredLinks,
                descripcion: sinopsis,
                poster: posterSrc,
                calificacion: rating
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

// Endpoint para obtener últimas películas
app.get('/ultimasPeliculas', async (req, res) => {
    try {
        const url = 'https://peliculas10.pro';
        
        const browser = await launchBrowser();
        const page = await browser.newPage();
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
            peliculas: peliculas.filter(peli => peli.title && peli.link) // Filtra las que tienen título y enlace
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
    }
});

app.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});
