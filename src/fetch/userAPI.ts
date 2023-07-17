import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const puppeteerExtra = puppeteer.use(StealthPlugin()) as typeof puppeteer;


export async function scrapeWebsite(url: string): Promise<{ data: any[] }> {
  const browser = await puppeteerExtra.launch({
    headless: "new"
  })
    const page = await browser.newPage();
    await page.goto(url);
  
    // Warte auf das Laden der Seite und erhalte den HTML-Inhalt
    await page.waitForSelector('body');
    const jsonContent = await page.evaluate(() => {
      const bodyElement = document.querySelector('body');
      const bodyText = bodyElement ? bodyElement.textContent : null;
      return bodyText ? JSON.parse(bodyText) : null;
      });

  
    await browser.close();
    return jsonContent;
  }