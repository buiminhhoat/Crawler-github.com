let showdown = require('showdown'),
    converter = new showdown.Converter();

function mdToHtml(text) {
    return converter.makeHtml(text);
}

module.exports = {
    mdToHTML: mdToHtml
}