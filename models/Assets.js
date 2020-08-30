const mongoose = require('mongoose');

const AssetsSchema = new mongoose.Schema(
  {
    date: Number,
    data: {
      UFJAssets: Number,
      UFJAssetsFutsu: Number,
      UFJAssetsTeiki: Number,
      UFJAssetsGaikaFutsu: Number,
      UFJAssetsGaikaTeiki: Number,
      UFJAssetsGaikaCyochiku: Number,
      UFJAssetsShintaku: Number,
      UFJAssetsShintakuRevenue: Number,
      NomuraAssets: Number,
      NomuraMRF: Number,
      NomuraTsumitate: Number,
      NomuraTokutei: Number,
      NomuraAssetsRevenue: Number,
      allAssets: Number,
      allAssetsToCNY: Number,
      allAssetsToUSD: Number,
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
