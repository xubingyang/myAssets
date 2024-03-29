const dotenv = require('dotenv')
const mongoose = require('mongoose')
const moment = require('moment')
const { Builder, By, Key, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const colors = require('colors')
const axios = require('axios')

// 加载env参数
dotenv.config({ path: './config/config.env' })
;(async function connectDB() {
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
  )
  console.log(`MongoDB 数据库连接正常...`.cyan.bold)
})()

// 调用 Assets 的 Model
const Assets = require('./models/Assets')

const today = moment().locale('zh-cn').format('YYYY-MM-DD')

;(async function getAllMyAssets() {
  const chromeOptions = new chrome.Options()
  if (process.env.ENABLE_CHROME_WINDOW === 'OFF')
    chromeOptions.addArguments('headless', 'disable-gpu')
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build()

  let UFJAssets,
    UFJAssetsFutsu,
    UFJAssetsTeiki,
    UFJAssetsGaikaFutsu,
    UFJAssetsGaikaTeiki,
    UFJAssetsGaikaCyochiku,
    UFJAssetsShintaku,
    UFJAssetsShintakuRevenue
  let NomuraAssets,
    NomuraAssetsRevenue,
    NomuraMRF,
    NomuraTsumitate,
    NomuraTokutei
  let RakutenCreditCardDebt,
    RakutenCreditCardDebtPayDate,
    RakutenCreditCardDebtAvailable,
    RakutenCreditCardDebtTotal,
    RakutenPoints,
    RakutenPointsLimited
  let AmexCreditCardDebt, AmexCreditCardDebtPayDate, AmexPoints
  let MizuhoAssets
  let RakutenAssets
  let RakutenSecurityAssets
  let RakutenSecurityAssetsRevenue

  let allAssets = 0,
    allAssetsToCNY,
    allAssetsToUSD
  let allDebts = 0,
    allDebtsToCNY,
    allDebtsToUSD
  let allPoints = 0,
    allPointsToCNY,
    allPointsToUSD

  const regex = /,/gi

  try {
    const exchangeRateCNYToJPYRaw = await axios({
      method: 'GET',
      url: `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_API_KEY}&base_currency=CNY&currencies=JPY`
    })
    const exchangeRateUSDToJPYRaw = await axios({
      method: 'GET',
      url: `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_API_KEY}&base_currency=USD&currencies=JPY`
    })
    if (process.env.ENABLE_AMEX_CREDIT_CARD === 'ON') {
      await driver.get(process.env.AMEX_CREDIT_CARD_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL * 2)
      await driver
        .findElement(By.id('eliloUserID'))
        .sendKeys(process.env.AMEX_CREDIT_CARD_ID)
      await driver
        .findElement(By.id('eliloPassword'))
        .sendKeys(process.env.AMEX_CREDIT_CARD_PASSWORD)
      await driver.findElement(By.id('eliloSelect')).click()
      await driver
        .findElement(By.css('#eliloSelect > option:nth-child(1)'))
        .click()
      await driver.findElement(By.css('#loginSubmit > span')).click()
      await driver.sleep(process.env.WAIT_INTERVAL * 10)
      AmexCreditCardDebtPayDate = await (
        await driver.findElement(
          By.css(
            '#axp-balance-payment > div:nth-child(1) > div > div > div:nth-child(2) > div > div > div.heading-5.margin-1-b'
          )
        )
      ).getText()
      AmexCreditCardDebtPayDate = Number(
        AmexCreditCardDebtPayDate.replace('/', '').replace('/', '')
      )
      await driver.get(process.env.AMEX_CREDIT_CARD_DETAILPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL * 10)
      AmexPoints = await (
        await driver.findElement(By.css('#rewards > div.flex > h1'))
      ).getText()
      AmexPoints = Number(AmexPoints.replace(regex, ''))
      AmexCreditCardDebt = await (
        await driver.findElement(
          By.css(
            '#balanceSummary > div.block > div.balance-summary-first > div > p'
          )
        )
      ).getText()
      if (AmexCreditCardDebt.trim() === '-') {
        AmexCreditCardDebt = 0
      } else {
        AmexCreditCardDebt = Number(
          AmexCreditCardDebt.replace('¥', '').trim().replace(regex, '')
        )
      }
      console.log('Amexカード负债: ', colors.gray(AmexCreditCardDebt))
      console.log(
        'Amexカードお支払い日: ',
        colors.gray(AmexCreditCardDebtPayDate)
      )
      console.log('Amexカードポイント: ', colors.gray(AmexPoints))

      allDebts += AmexCreditCardDebt
      allPoints += AmexPoints
    }

    if (process.env.ENABLE_RAKUTEN_CREDIT_CARD === 'ON') {
      await driver.get(process.env.RAKUTEN_CREDIT_CARD_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('u'))
        .sendKeys(process.env.RAKUTEN_CREDIT_CARD_ID)
      await driver
        .findElement(By.id('p'))
        .sendKeys(process.env.RAKUTEN_CREDIT_CARD_PASSWORD, Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('indexForm:password'))
        .sendKeys(process.env.RAKUTEN_CREDIT_CARD_2_PASSWORD, Key.ENTER)
        await driver.sleep(process.env.WAIT_INTERVAL * 3)
      RakutenCreditCardDebt = await (
        await driver.findElement(By.css('#js-rd-billInfo-amount_show > span'))
      ).getText()
      RakutenCreditCardDebt = Number(
        RakutenCreditCardDebt.substring(
          0,
          RakutenCreditCardDebt.length
        ).replace(regex, '')
      )
      RakutenCreditCardDebtPayDate = await (
        await driver.findElement(
          By.css(
            '#js-rd-billInfo > div.rd-column-cell.rd-billInfo-month > div.rd-billInfo-table > div.rd-billInfo-table_month.rd-flex > div.rd-billInfo-table_date > div.rd-billInfo-table_data.rd-flex.rf-font-bold > div.rd-font-robot'
          )
        )
      ).getText()
      RakutenCreditCardDebtPayDate = Number(
        RakutenCreditCardDebtPayDate.substring(
          0,
          RakutenCreditCardDebtPayDate.length - 5
        )
          .replace('年', '')
          .replace('月', '')
          .replace('日', '')
      )
      RakutenCreditCardDebtAvailable = await (
        await driver.findElement(By.css('#js-bill-available > span'))
      ).getText()
      RakutenCreditCardDebtAvailable = Number(
        RakutenCreditCardDebtAvailable.trim().replace(regex, '')
      )
      RakutenCreditCardDebtTotal = await (
        await driver.findElement(By.css('#js-bill-available-amount > span'))
      ).getText()
      RakutenCreditCardDebtTotal = Number(
        RakutenCreditCardDebtTotal.trim().replace(regex, '')
      )
      RakutenPoints = await (
        await driver.findElement(By.id('rakutenSuperPoints'))
      ).getText()
      RakutenPoints = Number(RakutenPoints.trim().replace(regex, ''))
      RakutenPointsLimited = await (
        await driver.findElement(By.id('rakutenLimitedSuperPoints'))
      ).getText()
      RakutenPointsLimited = Number(
        RakutenPointsLimited.trim().replace(regex, '')
      )
      const RakutenCreditCardPaymentInfo = await (
        await driver.findElement(By.id('month'))
      ).getText()
      console.log(
        `楽天カード${RakutenCreditCardPaymentInfo}: `,
        colors.gray(RakutenCreditCardDebt)
      )
      console.log(
        '楽天カードお支払い日: ',
        colors.gray(RakutenCreditCardDebtPayDate)
      )
      console.log(
        '楽天カード現在のご利用可能額: ',
        colors.gray(RakutenCreditCardDebtAvailable)
      )
      console.log(
        '楽天カードご利用可能枠: ',
        colors.gray(RakutenCreditCardDebtTotal)
      )
      console.log('楽天ポイント: ', colors.gray(RakutenPoints))
      console.log('楽天期間限定ポイント: ', colors.gray(RakutenPointsLimited))

      allDebts += RakutenCreditCardDebt
      allPoints += RakutenPoints
    }

    // 开始获取UFJ部分
    if (process.env.ENABLE_UFJ === 'ON') {
      await driver.get(process.env.UFJ_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL)
      const UFJDirectUrl = await (
        await driver.findElement(By.id('lnav_direct_login'))
      ).getAttribute('href')
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver.get(UFJDirectUrl)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('tx-contract-number'))
        .sendKeys(process.env.UFJ_ACCOUNT_NUMBER)
      await driver
        .findElement(By.id('tx-ib-password'))
        .sendKeys(process.env.UFJ_ACCOUNT_PASSWORD)
      await driver.findElement(By.className('gonext')).sendKeys(Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver.findElement(By.className('open-text')).click()
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver.findElement(By.linkText('口座一覧')).click()
      UFJAssets = await (
        await driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div.flat_unit.head_info > div.fleft > div > div > table > tbody > tr > td.number > strong'
          )
        )
      ).getText()
      UFJAssets = Number(UFJAssets.replace(regex, ''))
      console.log('三菱UFJ銀行总资产：', colors.red(UFJAssets))
      if (
        driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div.info_table_gray.section > table > tbody > tr > td.balance_info > p > strong'
          )
        ) != null
      ) {
        UFJAssetsFutsu = await (
          await driver.findElement(
            By.css(
              '#remainder_info > div > div > div > div.info_table_gray.section > table > tbody > tr > td.balance_info > p > strong'
            )
          )
        ).getText()
        UFJAssetsFutsu = Number(UFJAssetsFutsu.replace(regex, ''))
        console.log('三菱UFJ銀行普通預金账户资产：', colors.red(UFJAssetsFutsu))
      }
      if (
        driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(2) > div > div.read_first_table > table > tbody > tr > td.balance_info > p > strong'
          )
        ) != null
      ) {
        UFJAssetsTeiki = await (
          await driver.findElement(
            By.css(
              '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(2) > div > div.read_first_table > table > tbody > tr > td.balance_info > p > strong'
            )
          )
        ).getText()
        UFJAssetsTeiki = Number(UFJAssetsTeiki.replace(regex, ''))
        console.log('三菱UFJ銀行定期預金账户资产：', colors.red(UFJAssetsTeiki))
      }
      if (
        driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr.first_child > td.balance_info > p > strong'
          )
        ) != null
      ) {
        UFJAssetsGaikaFutsu = await (
          await driver.findElement(
            By.css(
              '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr.first_child > td.balance_info > p > strong'
            )
          )
        ).getText()
        UFJAssetsGaikaFutsu = Number(UFJAssetsGaikaFutsu.replace(regex, ''))
        console.log(
          '三菱UFJ銀行外貨普通账户资产：',
          colors.red(UFJAssetsGaikaFutsu)
        )
      }
      if (
        driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(2) > td.balance_info > p > strong'
          )
        ) != null
      ) {
        UFJAssetsGaikaTeiki = await (
          await driver.findElement(
            By.css(
              '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(2) > td.balance_info > p > strong'
            )
          )
        ).getText()
        UFJAssetsGaikaTeiki = Number(UFJAssetsGaikaTeiki.replace(regex, ''))
        console.log(
          '三菱UFJ銀行外貨定期账户资产：',
          colors.red(UFJAssetsGaikaTeiki)
        )
      }
      if (
        driver.findElement(
          By.css(
            '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(3) > td.balance_info > p > strong'
          )
        ) != null
      ) {
        UFJAssetsGaikaCyochiku = await (
          await driver.findElement(
            By.css(
              '#remainder_info > div > div > div > div:nth-child(5) > div:nth-child(3) > div > div.read_first_table > table > tbody > tr:nth-child(3) > td.balance_info > p > strong'
            )
          )
        ).getText()
        UFJAssetsGaikaCyochiku = Number(
          UFJAssetsGaikaCyochiku.replace(regex, '')
        )
        console.log(
          '三菱UFJ銀行外貨貯蓄账户资产：',
          colors.red(UFJAssetsGaikaCyochiku)
        )
      }
      if (driver.findElement(By.linkText('投資信託トップ')) != null) {
        await driver.findElement(By.linkText('投資信託トップ')).click()
        await driver.sleep(process.env.WAIT_INTERVAL)
        UFJAssetsShintaku = await (
          await driver.findElement(
            By.css(
              'body > div.body-wrap > main > section.sec.container-wide.s-pc-pd-b-40 > div > section > div > div > section > div.btn-item.s-sp-pd-t-10.s-sp-pd-b-10 > div:nth-child(1) > span.amount'
            )
          )
        ).getText()
        UFJAssetsShintaku = Number(
          UFJAssetsShintaku.replace('円', '').replace(regex, '')
        )
        console.log(
          '三菱UFJ銀行投資信託账户资产：',
          colors.red(UFJAssetsShintaku)
        )
        // UFJAssetsShintakuRevenue = await (
        //   await driver.findElement(
        //     By.css(
        //       'body > div.body-wrap > main > section.sec.container-wide.s-pc-pd-b-40 > div > section > div > div > section > div.btn-item.s-sp-pd-t-10.s-sp-pd-b-10 > div:nth-child(2) > span.profit.signed-value-plus'
        //     )
        //   )
        // ).getText()
        // if (UFJAssetsShintakuRevenue.startsWith('+')) {
        //   UFJAssetsShintakuRevenue = Number(
        //     UFJAssetsShintakuRevenue.substring(
        //       1,
        //       UFJAssetsShintakuRevenue.length
        //     ).replace(regex, '')
        //   )
        // } else {
        //   UFJAssetsShintakuRevenue =
        //     Number(
        //       UFJAssetsShintakuRevenue.substring(
        //         1,
        //         UFJAssetsShintakuRevenue.length
        //       ).replace(regex, '')
        //     ) * -1
        // }
        // console.log(
        //   '三菱UFJ銀行投資信託账户收益：',
        //   colors.red(UFJAssetsShintakuRevenue)
        // )
      }

      allAssets += UFJAssets
    }

    if (process.env.ENABLE_NOMURA === 'ON') {
      await driver.get(process.env.NOMURA_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('branchNo'))
        .sendKeys(process.env.NOMURA_ACCOUNT_BRUNCH)
      await driver
        .findElement(By.id('accountNo'))
        .sendKeys(process.env.NOMURA_ACCOUNT_NUMBER)
      await driver
        .findElement(By.id('passwd1'))
        .sendKeys(process.env.NOMURA_ACCOUNT_PASSWORD, Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL)
      NomuraAssets = await (
        await driver.findElement(
          By.css(
            '#main > div > div > div.ct-top-col-left > div.asset-summary-set > div > dl > dd > div > div.ct-top-asset-col-left.grid-15.grid-sd-24.valign-t > div > div > table > tbody > tr:nth-child(1) > td > strong'
          )
        )
      ).getText()
      NomuraAssets = Number(NomuraAssets.replace(regex, ''))
      console.log('野村證券总资产: ', colors.yellow(NomuraAssets))
      NomuraAssetsRevenue = await (
        await driver.findElement(
          By.css(
            '#main > div > div > div.ct-top-col-left > div.asset-summary-set > div > dl > dd > div > div.ct-top-asset-col-left.grid-15.grid-sd-24.valign-t > div > div > table > tbody > tr:nth-child(2) > td > span'
          )
        )
      ).getText()
      NomuraAssetsRevenue = Number(NomuraAssetsRevenue.replace(regex, ''))
      console.log('野村證券账户收益：', colors.yellow(NomuraAssetsRevenue))
      await driver.findElement(By.linkText('お預り資産を確認')).click()
      NomuraMRF = await (
        await driver.findElement(
          By.css(
            '#mrf > div.hidden-sd > table > tbody > tr:nth-child(1) > td.txt-num.no-line-td-bottom'
          )
        )
      ).getText()
      NomuraMRF = Number(
        NomuraMRF.substring(0, NomuraMRF.length - 1).replace(regex, '')
      )
      console.log('野村證券MRF账户资产：', colors.yellow(NomuraMRF))
      // if (driver.findElement(By.css('#mrf > div.hidden-sd > table > tbody > tr:nth-child(3) > td:nth-child(1)'))) {
      //   NomuraTsumitate = await (await driver.findElement(By.css('#mrf > div.hidden-sd > table > tbody > tr:nth-child(3) > td.txt-num.no-line-td-bottom'))).getText();
      //   NomuraTsumitate = Number(NomuraTsumitate.substring(0, NomuraTsumitate.length - 1).replace(regex, ''));
      //   console.log('野村證券投信積立账户资产：', colors.yellow(NomuraTsumitate));
      // }
      // NomuraTokutei = await (
      //   await driver.findElement(
      //     By.css(
      //       '#domestic-trust > div:nth-child(2) > table > tbody > tr > td:nth-child(2)'
      //     )
      //   )
      // ).getText()
      // NomuraTokutei = Number(
      //   NomuraTokutei.substring(0, NomuraTokutei.length - 1).replace(regex, '')
      // )
      // console.log('野村證券特定預り账户资产：', colors.yellow(NomuraTokutei))

      allAssets += NomuraAssets
    }

    if (process.env.ENABLE_MIZUHO === 'ON') {
      await driver.get(process.env.MIZUHO_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('txbCustNo'))
        .sendKeys(process.env.MIZUHO_ACCOUNT_NUMBER, Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL)
      if (!driver.findElement(By.id('PASSWD_LoginPwdInput'))) {
        if (
          (await driver.findElement(By.id('txtQuery')).getText()) ===
          process.env.MIZUHO_QUESTION_1
        ) {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_1)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        } else if (
          (await driver.findElement(By.id('txtQuery')).getText()) ===
          process.env.MIZUHO_QUESTION_2
        ) {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_2)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        } else {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_3)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        }
      }
      await driver.sleep(process.env.WAIT_INTERVAL)
      if (!driver.findElement(By.id('PASSWD_LoginPwdInput'))) {
        if (
          (await driver.findElement(By.id('txtQuery')).getText()) ===
          process.env.MIZUHO_QUESTION_1
        ) {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_1)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        } else if (
          (await driver.findElement(By.id('txtQuery')).getText()) ===
          process.env.MIZUHO_QUESTION_2
        ) {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_2)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        } else {
          await driver
            .findElement(By.id('txbTestWord'))
            .sendKeys(process.env.MIZUHO_ANSWER_3)
          await driver
            .findElement(By.css('#main-nomenu > section > input:nth-child(2)'))
            .click()
        }
      }
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('PASSWD_LoginPwdInput'))
        .sendKeys(process.env.MIZUHO_ACCOUNT_LOGIN_PASSWORD, Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL)
      MizuhoAssets = await (
        await driver.findElement(By.id('txtCrntBal'))
      ).getText()
      MizuhoAssets = Number(
        MizuhoAssets.replace('円', '').trim().replace(regex, '')
      )

      console.log('Mizuho銀行总资产: ', colors.blue(MizuhoAssets))

      allAssets += MizuhoAssets
    }

    if (process.env.ENABLE_RAKUTEN_BANK === 'ON') {
      await driver.get(process.env.RAKUTEN_BANK_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL * 2)
      await driver
        .findElement(By.id('LOGIN:USER_ID'))
        .sendKeys(process.env.RAKUTEN_BANK_ACCOUNT_USERID)
      await driver
        .findElement(By.id('LOGIN:LOGIN_PASSWORD'))
        .sendKeys(process.env.RAKUTEN_BANK_ACCOUNT_LOGIN_PASSWORD)
      await driver.findElement(By.id('LOGIN:_idJsp43')).click()
      await driver.sleep(process.env.WAIT_INTERVAL * 2)
      RakutenAssets = await (
        await driver.findElement(
          By.css(
            '#lyt-deposit > div > div.deposit-balance02 > div > div.deposit-balance02-04 > div.deposit-balance02-03 > table > tbody > tr > td > span.amount'
          )
        )
      ).getText()
      RakutenAssets = Number(RakutenAssets.replace(regex, '').trim())

      console.log('楽天銀行总资产：', colors.blue(RakutenAssets))

      allAssets += RakutenAssets
    }

    if (process.env.ENABLE_RAKUTEN_SECURITY === 'ON') {
      await driver.get(process.env.RAKUTEN_SECURITY_HOMEPAGE)
      await driver.sleep(process.env.WAIT_INTERVAL)
      await driver
        .findElement(By.id('form-login-id'))
        .sendKeys(process.env.RAKUTEN_RAKUTEN_SECURITY_ACCOUNT)
      await driver
        .findElement(By.id('form-login-pass'))
        .sendKeys(process.env.RAKUTEN_RAKUTEN_SECURITY_PASSWORD, Key.ENTER)
      await driver.sleep(process.env.WAIT_INTERVAL * 2)
      RakutenSecurityAssets = await (
        await driver.findElement(
          By.css('#asset_total_asset > span:nth-child(1) > nobr')
        )
      ).getText()
      console.log(RakutenSecurityAssets)
      RakutenSecurityAssets = Number(
        RakutenSecurityAssets.trim().replace('円', '').replace(regex, '')
      )
      RakutenSecurityAssetsRevenue = await (
        await driver.findElement(
          By.css('#asset_total_asset_diff > span:nth-child(1) > nobr > span')
        )
      ).getText()
      if (RakutenSecurityAssetsRevenue.startsWith('+')) {
        RakutenSecurityAssetsRevenue = Number(
          RakutenSecurityAssetsRevenue.trim()
            .replace('円', '')
            .replace('+', '')
            .replace(regex, '')
        )
      } else {
        RakutenSecurityAssetsRevenue = Number(
          RakutenSecurityAssetsRevenue.trim()
            .replace('円', '')
            .replace('-', '')
            .replace(regex, '')
        )
      }

      console.log('楽天証券资产: ', colors.brightMagenta(RakutenSecurityAssets))
      console.log(
        '楽天証券资产收益: ',
        colors.brightMagenta(RakutenSecurityAssetsRevenue)
      )

      allAssets += RakutenSecurityAssets
    }

    console.log(today, ' 总资产：', colors.cyan(allAssets))
    console.log(today, ' 总负债：', colors.cyan(allDebts))
    console.log(today, ' 总积分：', colors.cyan(allPoints))

    await driver.sleep(process.env.WAIT_INTERVAL)
    const exchangeRateJPYToCNY = exchangeRateCNYToJPYRaw.data.data.JPY.value
    const exchangeRateJPYToUSD = exchangeRateUSDToJPYRaw.data.data.JPY.value
    allAssetsToCNY = (allAssets / exchangeRateJPYToCNY).toFixed(2)
    allAssetsToUSD = (allAssets / exchangeRateJPYToUSD).toFixed(2)
    allDebtsToCNY = (allDebts / exchangeRateJPYToCNY).toFixed(2)
    allDebtsToUSD = (allDebts / exchangeRateJPYToUSD).toFixed(2)
    allPointsToCNY = (allPoints / exchangeRateJPYToCNY).toFixed(2)
    allPointsToUSD = (allPoints / exchangeRateJPYToUSD).toFixed(2)

    const payload = {
      UFJ: {
        UFJAssets,
        UFJAssetsFutsu,
        UFJAssetsTeiki,
        UFJAssetsGaikaFutsu,
        UFJAssetsGaikaTeiki,
        UFJAssetsGaikaCyochiku,
        UFJAssetsShintaku,
        UFJAssetsShintakuRevenue
      },
      Nomura: {
        NomuraAssets,
        NomuraMRF,
        NomuraTsumitate,
        NomuraTokutei,
        NomuraAssetsRevenue
      },
      RakutenCreditCard: {
        RakutenCreditCardDebt,
        RakutenCreditCardDebtPayDate,
        RakutenCreditCardDebtAvailable,
        RakutenCreditCardDebtTotal,
        RakutenPoints,
        RakutenPointsLimited
      },
      Amex: {
        AmexCreditCardDebt,
        AmexCreditCardDebtPayDate,
        AmexPoints
      },
      Mizuho: {
        MizuhoAssets
      },
      RakutenBank: {
        RakutenAssets
      },
      RakutenSecurity: {
        RakutenSecurityAssets,
        RakutenSecurityAssetsRevenue
      },
      assets: {
        allAssets,
        allAssetsToCNY,
        allAssetsToUSD
      },
      debts: {
        allDebts,
        allDebtsToCNY,
        allDebtsToUSD
      },
      points: {
        allPoints,
        allPointsToCNY,
        allPointsToUSD
      },
      exchangeRates: {
        exchangeRateJPYToCNY,
        exchangeRateJPYToUSD
      }
    }

    await Assets.create({
      date: Number(moment().format('YYYYMMDD')),
      data: payload
    })
    console.log('上传数据库成功...'.magenta.bold)
    process.exit()
  } catch (err) {
    console.error(err)
  } finally {
    await driver.quit()
  }
})()
