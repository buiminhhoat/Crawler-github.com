const express = require('express');
const morgan = require('morgan');
const app = express();
const path = require('path');
const publicDircetory = path.join(__dirname, './public');
const releaseCrawler = require('./controller/crawler.js');

const PORT = 6903;
const CRAWLER_DIR = '/crawl';
app.listen(6903, () => console.log(`Server is listening on port: ${PORT}`));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(publicDircetory));
app.set('view engine', 'hbs');
app.set('view engine', 'ejs');
const session = require('express-session');
app.use(
    session({
        secret: 'padv',
        cookie: { maxAge: 60000000 },
    }),
);

app.get('/', (req, res) => {
    res.render('./ejs/index.ejs');
});

app.post(CRAWLER_DIR, async (req, res) => {
    res.render("releases", {data: await releaseCrawler.getGithubReleases(req.body.githubRepo.trim())});
});

app.get("/commits_detail", async (req, res) => {
    let index = Number.parseInt(req.query.index);
    let listCommits = await releaseCrawler.getCommitsOfVersion(index);
    res.render('commits', {
        listCommits,
    });
});
