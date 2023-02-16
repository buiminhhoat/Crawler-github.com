const axios = require("axios");
const mdToHTML = require("./md-to-html").mdToHTML;
const cheerio = require("cheerio");

const {GITHUB_LINK, TOKEN} = require("./CONSTANTS");
const {response} = require("express");

let repoUrl;
let owner;
let repo;

function parseRepoUrl(link) {
    repoUrl = link;
    owner = link.slice(0, link.length + 1).split("/")[3];
    repo = link.slice(0, link.length + 1).split("/")[4];
}

async function fetchData(url) {
    let response;
    for (let count = 1; count <= 10; ++count) {
        if (count > 1) {
            console.log("Error occurred, refetching data from " + url);
        }
        response = await axios.get(url, {
            headers: {
                Authorization: `token ${TOKEN}`,
                accept: 'application/vnd.github+json',
            }
        }).catch((err) => console.log("fail when fetching from: " + url + "\n" + err));
        if (response?.status === 200) {
            return response.data;
        }
        if (response?.status === 401) {
            console.log("Kiểm tra lại token github");
            return undefined;
        }
    }
    return undefined;
}

async function countReleases() {
    const $ = cheerio.load(await fetchData(repoUrl));
    return Number.parseInt($(`a[href="/${owner}/${repo}/releases"] span.Counter`).text());
}

async function fetchGithubRelease() {
    let totalReleases = await countReleases();
    let listInfoReleases = [];
    let numberOfPages = Math.ceil(totalReleases / 30);
    console.log("number of Pages = " + numberOfPages);
    await Promise.all([...Array(numberOfPages)].map(async (val, page) => {
        const pageUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/releases?page=" + (page + 1);
        const $ = await fetchData(pageUrl);
        await Promise.all($.map(async (singleReleaseInfo, index) => {
            let releaseIndex = 30 * page + index;
            let info = {
                number: releaseIndex + 1,
                name: singleReleaseInfo.name,
                tag_name: singleReleaseInfo.tag_name,
                html_Url: singleReleaseInfo.html_url,
                author: {
                    login: singleReleaseInfo.author.login,
                    html_url: singleReleaseInfo.author.html_url,
                    avatar_url: singleReleaseInfo.author.avatar_url,
                },
                created_at: singleReleaseInfo.created_at,
                published_at: singleReleaseInfo.published_at,
                body: singleReleaseInfo.body === "" ? `<b>Không có Change log</b>` : mdToHTML(singleReleaseInfo.body),
            };
            listInfoReleases[releaseIndex] = info;
        }));
    }));
    console.log(`Đã lấy được ` + listInfoReleases.length + ` releases`);
    return listInfoReleases;
}

function getCompareLink(preVersion, curVersion, page) {
    return "https://api.github.com/repos/" + owner + "/" + repo + "/compare/" +
        preVersion + "..." + curVersion + "?page=" + page;

}

async function getTotalCommit(preVersion, curVersion) {
    let url = getCompareLink(preVersion, curVersion, 1);
    const $ = await fetchData(url);
    let total_commits = $.total_commits;
    return total_commits;
}

var releaseInfoList = [];
async function getGithubReleases(gitRepo) {
    parseRepoUrl(gitRepo);
    releaseInfoList = await fetchGithubRelease();
    await Promise.all(releaseInfoList.map(async (release, index) => {
        if (index + 1 < releaseInfoList.length) {
            // data = await getTotalCommit(releaseInfoList[index + 1].tag_name, releaseInfoList[index].tag_name);
            // release.totalCommits = data.total_commits;
            release.totalCommits = Number.parseInt(await getTotalCommit(releaseInfoList[index + 1].tag_name, releaseInfoList[index].tag_name));
        }
        else {
            release.totalCommits = 0;
        }
    }));
    return releaseInfoList;
}

async function getCommitsOfVersion(index) {
    if (index + 1 >= releaseInfoList.length) return [];
    let url = getCompareLink(releaseInfoList[index + 1].tag_name, releaseInfoList[index].tag_name, 1);
    const $ = await fetchData(url);
    let total_commits = $.total_commits;
    var listDetailCommit = [];
    let maxPage = Math.ceil((total_commits - 250) / 250);
    for (let i = 0; i <= maxPage; ++i) {
        let url2 = getCompareLink(releaseInfoList[index + 1].tag_name, releaseInfoList[index].tag_name, i + 1);
        const data = await fetchData(url2);
        // for (let j = 0; j < data.commits.length; ++j) {
        //     listDetailCommit.push(data.commits[j]);
        // }
        listDetailCommit = listDetailCommit.concat(data.commits);
    }
    for (let i = 0; i < listDetailCommit.length; ++i) {
        let comment = listDetailCommit[i].commit.message;
        comment = comment.replace(/\n/g, "<br>");
        let post = comment.search("<br>");
        if (post === -1)
            comment = "<b>" + comment + "</b>";
        else
            comment = "<b>" + comment.slice(0, post) + "</b>" + comment.slice(post);
        listDetailCommit[i].commit.message = comment;
    }
    return listDetailCommit;
}
async function Test() {
    parseRepoUrl("https://github.com/mastodon/mastodon");
    data = Number.parseInt(await getTotalCommit("v3.5.6", "v4.1.0", 1));
    // console.log(data);
    // console.log(await getTotalAndDetailCommit("v3.5.6", "v4.1.0", 1));
    // fetchGithubRelease();
    // console.log(getCompareLink("v3.5.6", "v4.1.0", 1));
}

// Test();

module.exports = {
    getGithubReleases: getGithubReleases,
    getCommitsOfVersion: getCommitsOfVersion,
}