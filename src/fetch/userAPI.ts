import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';

function isDocker() {
  try {
    // Führt den Befehl "cat /proc/1/cgroup" aus und überprüft, ob "docker" in der Ausgabe enthalten ist
    const output = execSync('cat /proc/1/cgroup', { encoding: 'utf-8' });
    return output.includes('docker') || Boolean(process.env.DOCKER);
  } catch (error) {
    // Fehlerbehandlung: Wenn es einen Fehler beim Ausführen des Befehls gibt, gehen wir davon aus, dass wir nicht in einem Docker-Container sind
    return Boolean(process.env.DOCKER);
  }
}

const puppeteerExtra = puppeteer.use(StealthPlugin()) as typeof puppeteer;


export async function scrapeWebsite(url: string): Promise<any> {
  let launchOptions = {};

  if (isDocker()) {
    launchOptions = {
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: "new"
    };
  } else {
    launchOptions = {
      headless: "new",
    };
  }
    const browser = await puppeteerExtra.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector('body');
    try{
    const jsonContent = await page.evaluate(() => {
      const bodyElement = document.querySelector('body');
      const bodyText = bodyElement ? bodyElement.textContent : null;
      return bodyText ? JSON.parse(bodyText) : null;
      });

  
    await browser.close();
    return jsonContent;
    }catch (err: any) {
      throw err;
    }
  }