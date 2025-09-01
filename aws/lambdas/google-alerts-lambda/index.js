const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

exports.handler = async (event) => {
  const { brand_name } = JSON.parse(event.body || '{}');

  if (!brand_name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Missing brand_name' }),
    };
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Inject your cookies to simulate logged-in session
    const cookies = JSON.parse(process.env.GOOGLE_ALERT_COOKIES_JSON || '[]');
    await page.setCookie(...cookies);

    await page.goto('https://www.google.com/alerts', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="q"]');
    await page.type('input[name="q"]', brand_name);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(4000);

    const rss_url = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const rss = links.find(link => link.href.includes('google.com/alerts/feeds'));
      return rss ? rss.href : null;
    });

    await browser.close();

    if (!rss_url) throw new Error('No RSS URL found');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, rss_url }),
    };
  } catch (error) {
    if (browser) await browser.close();
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
