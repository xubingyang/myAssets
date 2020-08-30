const dotenv = require('dotenv');
const mongoose = require('mongoose');
const moment = require('moment');
const { Builder, By, Key, until } = require('selenium-webdriver');
const colors = require("colors");
const axios = require('axios');

// 加载env参数
dotenv.config({ path: './config/config.env' });

const connectDB = async () => {
  const connection = await mongoose.connect(
    process.env.MONGO_URI.replace(
      '<MONGO_PASSWORD>',
      process.env.MONGO_PASSWORD
    ).replace('<MONGO_COLLECT_NAME>', process.env.MONGO_COLLECT_NAME),
    {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true
    }
  );
  console.log(`MongoDB 数据库连接正常...`.cyan.bold);
};

// 连接数据库
connectDB();

// 调用 Assets 的 Model
const Assets = require('./models/Assets');

const today = moment().locale('zh-cn').format('YYYY-MM-DD');

(async function getAllMyAssets() {
  const driver = await new Builder().forBrowser('chrome').build();
  const UFJHomepage = 'https://direct.bk.mufg.jp/';
  let UFJAssets, UFJAssetsFutsu, UFJAssetsTeiki, UFJAssetsGaikaFutsu, UFJAssetsGaikaTeiki, UFJAssetsGaikaCyochiku, UFJAssetsShintaku, UFJAssetsShintakuRevenue;
  const NomuraHomepage = 'https://hometrade.nomura.co.jp/';
  let NomuraAssets, NomuraAssetsRevenue, NomuraMRF, NomuraTsumitate, NomuraTokutei;
  let allAssets = 0, allAssetsToCNY, allAssetsToUSD;
  const regex = /,/gi;

  try {
    const exchangeRateJPYToCNYRaw = await axios({
      method: 'GET',
      url: `https://api.exchangeratesapi.io/latest?base=CNY&symbols=JPY`
    });
    const exchangeRateJPYToUSDRaw = await axios({
      method: 'GET',
      url: `https://api.exchangeratesapi.io/latest?base=USD&symbols=JPY`
    });
    // 开始获取UFJ部分
    if (process.env.ENABLE_UFJ) {
      await driver.get(UFJHomepage);
      await driver.sleep(process.env.WAIT_INTERVAL);
      const UFJDirectUrl = await (await driver.findElement(By.id('lnav_direct_login'))).getAttribute('href');
      await driver.sleep(process.env.WAIT_INTERVAL);
      await driver.get(UFJDirectUrl);
      await driver.findElement(By.id('tx-contract-number')).sendKeys(process.env.UFJ_ACCOUNT_NUMBER);
      await driver.findElement(By.id('tx-ib-password')).sendKeys(process.env.UFJ_ACCOUNT_PASSWORD);
      await driver.findElement(By.className('gonext')).sendKeys(Key.ENTER);
      await driver.findElement(By.className('open-text')).click();
      await driver.sleep(process.env.WAIT_INTERVAL);
      await driver.findElement(By.linkText('口座一覧')).click();
      UFJAssets = await (await driver.findElement(By.css('#remainder_info > div > div > div > div.flat_unit.head_info > div.fleft > div > div > table > tbody > tr > td.number > strong'))).getText();
      UFJAssets = Number(UFJAssets.replace(regex, ''));
      UFJAssetsFutsu = await (await driver.findElement(By.css('#remainder_info > div > div > div > div.info_table_gray.section > table > tbody > tr > td.balance_info > p > strong'))).getText();
      UFJAssetsFutsu = Number(UFJAssetsFutsu.replace(regex, ''));
      UFJAssetsTeiki = await (await driver.findElement(By.css('#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(2) > div > div.read_first_table > table > tbody > tr > td.balance_info > p > strong'))).getText();
      UFJAssetsTeiki = Number(UFJAssetsTeiki.replace(regex, ''));
      UFJAssetsGaikaFutsu = await (await driver.findElement(By.css('#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr.first_child > td.balance_info > p > strong'))).getText();
      UFJAssetsGaikaFutsu = Number(UFJAssetsGaikaFutsu.replace(regex, ''));
      UFJAssetsGaikaTeiki = await (await driver.findElement(By.css('#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(2) > td.balance_info > p > strong'))).getText();
      UFJAssetsGaikaTeiki = Number(UFJAssetsGaikaTeiki.replace(regex, ''));
      UFJAssetsGaikaCyochiku = await (await driver.findElement(By.css('#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(3) > td.balance_info > p > strong'))).getText();
      UFJAssetsGaikaCyochiku = Number(UFJAssetsGaikaCyochiku.replace(regex, ''));
      await driver.findElement(By.linkText('投資信託トップ')).click();
      await driver.sleep(process.env.WAIT_INTERVAL);
      UFJAssetsShintaku = await (await driver.findElement(By.css('#fundlist > div > div > div > div.head_info > div.colR > dl > dd.item01 > strong'))).getText();
      UFJAssetsShintaku = Number(UFJAssetsShintaku.replace(regex, ''));
      UFJAssetsShintakuRevenue = await (await driver.findElement(By.css('#fundlist > div > div > div > div.head_info > div.colR > dl > dd.item02 > strong'))).getText();
      if (UFJAssetsShintakuRevenue.startsWith('+')) {
        UFJAssetsShintakuRevenue = Number(UFJAssetsShintakuRevenue.substring(1, UFJAssetsShintakuRevenue.length).replace(regex, ''));
      } else {
        UFJAssetsShintakuRevenue = Number(UFJAssetsShintakuRevenue.substring(1, UFJAssetsShintakuRevenue.length).replace(regex, '')) * -1;
      }
      console.log('三菱UFJ銀行总资产：', colors.red(UFJAssets));
      console.log('三菱UFJ銀行普通預金账户资产：', colors.red(UFJAssetsFutsu));
      console.log('三菱UFJ銀行定期預金账户资产：', colors.red(UFJAssetsTeiki));
      console.log('三菱UFJ銀行外貨普通账户资产：', colors.red(UFJAssetsGaikaFutsu));
      console.log('三菱UFJ銀行外貨定期账户资产：', colors.red(UFJAssetsGaikaTeiki));
      console.log('三菱UFJ銀行外貨貯蓄账户资产：', colors.red(UFJAssetsGaikaCyochiku));
      console.log('三菱UFJ銀行投資信託账户资产：', colors.red(UFJAssetsShintaku));
      console.log('三菱UFJ銀行投資信託账户收益：', colors.red(UFJAssetsShintakuRevenue));
      allAssets += UFJAssets;
    }

    if (process.env.ENABLE_NOMURA) {
      await driver.get(NomuraHomepage);
      await driver.sleep(process.env.WAIT_INTERVAL);
      await driver.findElement(By.id('branchNo')).sendKeys(process.env.NOMURA_ACCOUNT_BRUNCH);
      await driver.findElement(By.id('accountNo')).sendKeys(process.env.NOMURA_ACCOUNT_NUMBER);
      await driver.findElement(By.id('passwd1')).sendKeys(process.env.NOMURA_ACCOUNT_PASSWORD, Key.ENTER);
      await driver.sleep(process.env.WAIT_INTERVAL);
      NomuraAssets = await (await driver.findElement(By.css('#main > div > div > div.ct-top-col-left > div.asset-summary-set > div > dl > dd > div > div.ct-top-asset-col-left.grid-15.grid-sd-24.valign-t > div > div > table > tbody > tr:nth-child(1) > td > strong'))).getText();
      NomuraAssets = Number(NomuraAssets.replace(regex, ''));
      NomuraAssetsRevenue = await (await driver.findElement(By.css('#main > div > div > div.ct-top-col-left > div.asset-summary-set > div > dl > dd > div > div.ct-top-asset-col-left.grid-15.grid-sd-24.valign-t > div > div > table > tbody > tr:nth-child(2) > td > span'))).getText();
      NomuraAssetsRevenue = Number(NomuraAssetsRevenue.replace(regex, ''));
      await driver.findElement(By.linkText('お預り資産を確認')).click();
      NomuraMRF = await (await driver.findElement(By.css('#mrf > div.hidden-sd > table > tbody > tr:nth-child(1) > td.txt-num.no-line-td-bottom'))).getText();
      NomuraMRF = Number(NomuraMRF.substring(0, NomuraMRF.length - 1).replace(regex, ''));
      if (driver.findElement(By.css('#mrf > div.hidden-sd > table > tbody > tr:nth-child(3) > td:nth-child(1)'))) {
        NomuraTsumitate = await (await driver.findElement(By.css('#mrf > div.hidden-sd > table > tbody > tr:nth-child(3) > td.txt-num.no-line-td-bottom'))).getText();
        NomuraTsumitate = Number(NomuraTsumitate.substring(0, NomuraTsumitate.length - 1).replace(regex, ''));
      }
      NomuraTokutei = await (await driver.findElement(By.css('#domestic-trust > div:nth-child(2) > table > tbody > tr > td:nth-child(2)'))).getText();
      NomuraTokutei = Number(NomuraTokutei.substring(0, NomuraTokutei.length - 1).replace(regex, ''));

      console.log('野村證券总资产: ', colors.green(NomuraAssets));
      console.log('野村證券账户收益：', colors.green(NomuraAssetsRevenue));
      console.log('野村證券MRF账户资产：', colors.green(NomuraMRF));
      console.log('野村證券投信積立账户资产：', colors.green(NomuraTsumitate));
      console.log('野村證券特定預り账户资产：', colors.green(NomuraTokutei));

      allAssets += NomuraAssets;
    }

    console.log(today, ' 总资产：', colors.yellow((allAssets)));

    await driver.sleep(process.env.WAIT_INTERVAL);
    const exchangeRateJPYToCNY = exchangeRateJPYToCNYRaw.data.rates.JPY;
    const exchangeRateJPYToUSD = exchangeRateJPYToUSDRaw.data.rates.JPY;
    allAssetsToCNY = (allAssets / exchangeRateJPYToCNY).toFixed(2);
    allAssetsToUSD = (allAssets / exchangeRateJPYToUSD).toFixed(2);

    const payload = {
      UFJAssets,
      UFJAssetsFutsu,
      UFJAssetsTeiki,
      UFJAssetsGaikaFutsu,
      UFJAssetsGaikaTeiki,
      UFJAssetsGaikaCyochiku,
      UFJAssetsShintaku,
      UFJAssetsShintakuRevenue,
      NomuraAssets,
      NomuraMRF,
      NomuraTsumitate,
      NomuraTokutei,
      NomuraAssetsRevenue,
      allAssets,
      allAssetsToCNY,
      allAssetsToUSD,
      exchangeRates: {
        exchangeRateJPYToCNY,
        exchangeRateJPYToUSD
      }
    }

    await Assets.create(
      {
        date: Number(moment().format('YYYYMMDD')),
        data: payload
      }
    );
    console.log('上传数据库成功...'.magenta.bold);
    process.exit();
  } catch (err) {
    console.error(err);
  }
  finally {
    await driver.quit();
  }
})();