import { openPlayer } from './serve.mjs';
const [ex = '0', ts = '0.3,1.8,4.4', cam = 'threeQuarter', side = 'R', bg = 'dark', tag = ''] = process.argv.slice(2);
const { browser, page, errors } = await openPlayer();
await page.evaluate(([ex, cam, side, bg]) => { __rr.load(+ex); __rr.S.playing = false; __rr.S.side = side; __rr.S.bg = bg; document.querySelector(`#bgSeg button[data-v="${bg}"]`).click(); document.querySelector(`#sideSeg button[data-v="${side}"]`).click(); __rr.setCam(cam); }, [ex, cam, side, bg]);
for (const t of ts.split(',').map(Number)) { await page.evaluate((t) => __rr.setT(t), t); await page.waitForTimeout(120); await page.locator('#stage').screenshot({ path: `/tmp/s3d-${ex}-${cam}-${side}-${t}${tag}.png` }); }
if (tag === 'full') await page.screenshot({ path: '/tmp/s3d-full.png' });
console.log('errors', JSON.stringify(errors)); await browser.close();
