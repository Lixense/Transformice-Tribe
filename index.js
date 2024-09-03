// created By Lix#4300 
// A tool for scraping informations and memebers from TFM tribes



const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const baseUrl = 'https://atelier801.com/tribe?tr=';
const membersUrl = 'https://atelier801.com/tribe-members?tr=';

// Function to ask for the Tribe ID
function askForTribeId() {
    return new Promise((resolve) => {
        rl.question('Please enter the Tribe ID: ', (tribeId) => {
            resolve(tribeId);
        });
    });
}

// Function to get HTML content from a URL
async function getHtmlFromUrl(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching the page:', error);
        return null;
    }
}

// Function to scrape tribe information
function scrapeTribeInfo(html) {
    const $ = cheerio.load(html);
    const tribeTitle = $('.cadre-tribu-titre.cadre-tribu-nom').text().trim();
    const creationDate = $('.cadre-tribu-date-creation').text().trim();
    const ras = $('.cadre-tribu-recrutement').text().trim();

    return {
        tribeTitle,
        creationDate,
        ras
    };
}

// Function to scrape tribe members from a page
function scrapeTribeMembers(html) {
    const $ = cheerio.load(html);
    const members = [];

    $('tbody tr').each((index, element) => {
        const usernameElement = $(element).find('.nom-utilisateur-scindable');
        const username = usernameElement.text().trim();
        const tag = $(element).find('.nav-header-hashtag').text().trim();

        if (username && tag) {
            members.push({
                username: username,
                tag: tag
            });
        }
    });

    return members;
}

// Function to fetch and scrape pages in chunks
async function scrapeAllPages(tribeId) {
    let allMembers = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        let pageMembers = [];
        for (let i = 0; i < 3; i++) { // Process 3 pages at a time
            console.log(`Fetching page ${currentPage}: ${membersUrl}${tribeId}&p=${currentPage}`);
            const html = await getHtmlFromUrl(`${membersUrl}${tribeId}&p=${currentPage}`);
            if (html) {
                pageMembers = scrapeTribeMembers(html);
                if (pageMembers.length > 0) {
                    allMembers = allMembers.concat(pageMembers);
                    currentPage++;
                } else {
                    hasMorePages = false; // Stop if no members found on the current page
                    break;
                }
            } else {
                console.error(`Failed to fetch page ${currentPage}.`);
                hasMorePages = false; // Stop if there is a failure fetching the page
                break;
            }
        }
    }

    return allMembers;
}

// Function to save members to a file
async function saveToFile(tribeTitle, members) {
    const filename = `TribeTFM${members.length}.txt`;
    const content = `Tribe Name: ${tribeTitle}\nTotal Members: ${members.length}\n\n` +
                    members.map(member => `${member.username}${member.tag}`).sort((a, b) => a.length - b.length).join('\n');

    fs.writeFileSync(filename, content, 'utf8');
    console.log(`Saved ${members.length} members to ${filename}`);
}

(async function() {
    const tribeId = await askForTribeId();
    
    // Fetch and scrape tribe information
    const tribeHtml = await getHtmlFromUrl(`${baseUrl}${tribeId}`);
    if (tribeHtml) {
        const tribeInfo = scrapeTribeInfo(tribeHtml);
        console.log(`Tribe URL: ${baseUrl}${tribeId}`);
        console.log(`Title of Tribe: ${tribeInfo.tribeTitle}`);
        console.log(`Creation Date: ${tribeInfo.creationDate}`);
        console.log(`Recruitment Status: ${tribeInfo.ras}`);

        // Fetch and scrape all pages of tribe members
        const allMembers = await scrapeAllPages(tribeId);
        await saveToFile(tribeInfo.tribeTitle, allMembers);
    } else {
        console.error('Failed to fetch tribe information.');
    }

    rl.close();
})();
