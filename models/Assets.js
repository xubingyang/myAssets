const mongoose = require('mongoose');

const AssetsSchema = new mongoose.Schema(
  {
    date: Number,
    data: {
      UFJ: {
        UFJAssets: Number,
        UFJAssetsFutsu: Number,
        UFJAssetsTeiki: Number,
        UFJAssetsGaikaFutsu: Number,
        UFJAssetsGaikaTeiki: Number,
        UFJAssetsGaikaCyochiku: Number,
        UFJAssetsShintaku: Number,
        UFJAssetsShintakuRevenue: Number
      },
      Nomura: {
        NomuraAssets: Number,
        NomuraMRF: Number,
        NomuraTsumitate: Number,
        NomuraTokutei: Number,
        NomuraAssetsRevenue: Number
      },
      Rakuten: {
        RakutenCreditCardDebt: Number,
        RakutenCreditCardDebtPayDate: Number,
        RakutenCreditCardDebtAvailable: Number,
        RakutenCreditCardDebtTotal: Number,
        RakutenPoints: Number,
        RakutenPointsLimited: Number
      },
      Amex: {
        AmexCreditCardDebt: Number,
        AmexCreditCardDebtPayDate: Number,
        AmexPoints: Number
      },
      Mizuho: {
        MizuhoAssets: Number
      },
      Rakuten: {
        RakutenAssets: Number
      },
      assets:{
        allAssets: Number,
        allAssetsToCNY: Number,
        allAssetsToUSD: Number
      },
      debts: {
        allDebts: Number,
        allDebtsToCNY: Number,
        allDebtsToUSD: Number
      },
      points: {
        allPoints: Number,
        allPointsToCNY: Number,
        allPointsToUSD: Number
      },
      exchangeRates: {
        exchangeRateJPYToCNY: Number,
        exchangeRateJPYToUSD: Number
      }
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    }
  }
);

module.exports = mongoose.model('Assets', AssetsSchema);
